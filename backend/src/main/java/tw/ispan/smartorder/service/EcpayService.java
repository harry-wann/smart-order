package tw.ispan.smartorder.service;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import javax.sql.DataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import tw.ispan.smartorder.common.exception.ApiException;
import tw.ispan.smartorder.config.EcpayProperties;
import tw.ispan.smartorder.dto.BillResponse;
import tw.ispan.smartorder.dto.EcpayCheckoutResponse;
import tw.ispan.smartorder.dto.PaymentResultResponse;
import tw.ispan.smartorder.entity.DiningSessionEntity;
import tw.ispan.smartorder.entity.DiningTableEntity;
import tw.ispan.smartorder.entity.PaymentEntity;
import tw.ispan.smartorder.repository.DiningSessionRepository;
import tw.ispan.smartorder.repository.DiningTableRepository;
import tw.ispan.smartorder.repository.PaymentRepository;
import tw.ispan.smartorder.util.EcpayUtil;

@Service
public class EcpayService {
    private static final Logger log = LoggerFactory.getLogger(EcpayService.class);
    private static final String PENDING = "PENDING";
    private static final String SUCCESS = "SUCCESS";
    private static final String FAILED = "FAILED";
    private static final String REQUIRES_REVIEW = "REQUIRES_REVIEW";
    // 10300066 means the outcome is unconfirmed. Unknown codes remain pending too.
    private static final Set<String> CONFIRMED_FAILURE_CODES = Set.of(
            "0", "10100248", "10100251", "10100252", "10100254", "10100255", "10100256");
    private static final DateTimeFormatter ECPAY_DATE = DateTimeFormatter.ofPattern("yyyy/MM/dd HH:mm:ss");
    private static final DateTimeFormatter RESULT_DATE = DateTimeFormatter.ofPattern("yyyy/MM/dd HH:mm");
    private static final SecureRandom RANDOM = new SecureRandom();

    private final EcpayProperties props;
    private final BillService billService;
    private final BillingCalculator billingCalculator;
    private final PaymentRepository payments;
    private final DiningSessionRepository sessions;
    private final DiningTableRepository tables;
    private final TableStatusNotifier tableStatusNotifier;
    private final MenuCheckoutNotifier checkoutNotifier;
    private final JdbcTemplate jdbc;

    public EcpayService(EcpayProperties props, BillService billService, BillingCalculator billingCalculator,
                        PaymentRepository payments, DiningSessionRepository sessions,
                        DiningTableRepository tables, TableStatusNotifier tableStatusNotifier,
                        MenuCheckoutNotifier checkoutNotifier,
                        @Qualifier("smartOrderDataSource") DataSource dataSource) {
        this.props = props;
        this.billService = billService;
        this.billingCalculator = billingCalculator;
        this.payments = payments;
        this.sessions = sessions;
        this.tables = tables;
        this.tableStatusNotifier = tableStatusNotifier;
        this.checkoutNotifier = checkoutNotifier;
        this.jdbc = new JdbcTemplate(dataSource);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public EcpayCheckoutResponse createCheckout(long sessionId, BigDecimal expectedTotal) {
        DiningSessionEntity session = sessions.findWithLockById(sessionId)
                .orElseThrow(() -> ApiException.unauthorized("用餐場次已失效"));
        if (!"OPEN".equals(session.getStatus())) {
            throw ApiException.conflict("SESSION_CLOSED", "此桌已停止付款");
        }
        if (!props.available()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "PAYMENT_UNAVAILABLE", "請至櫃檯付款");
        }
        if (payments.existsByDiningSessionIdAndStatus(sessionId, REQUIRES_REVIEW)) {
            throw ApiException.conflict("PAYMENT_PENDING", "付款結果需由櫃檯確認");
        }
        if (payments.existsByDiningSessionIdAndStatus(sessionId, SUCCESS)) {
            throw ApiException.conflict("SESSION_CLOSED", "此桌已付款完成");
        }

        BillResponse bill = billService.calculateBill(sessionId);
        if (bill.total().compareTo(expectedTotal) != 0) {
            throw ApiException.conflict("BILL_CHANGED", "帳單金額已變動，請重新確認");
        }
        int amount = exactGatewayAmount(bill.total());

        List<PaymentEntity> pending = payments.findByDiningSessionIdAndStatusOrderByIdDesc(sessionId, PENDING);
        if (pending.size() > 1) {
            throw ApiException.conflict("PAYMENT_PENDING", "此桌有多筆待確認付款，請洽櫃檯");
        }
        PaymentEntity payment;
        if (pending.isEmpty()) {
            payment = new PaymentEntity();
            payment.setDiningSessionId(sessionId);
            payment.setMethod("ECPAY");
            payment.setAmount(bill.total());
            payment.setStatus(PENDING);
            payment.setTransactionNo(generateTradeNo());
            payment.setCreatedAt(LocalDateTime.now(ZoneId.of("Asia/Taipei")));
            payment = payments.saveAndFlush(payment);
        } else {
            payment = pending.get(0);
            if (payment.getAmount() == null || payment.getAmount().compareTo(bill.total()) != 0) {
                throw ApiException.conflict("PAYMENT_PENDING", "付款金額需由櫃檯確認");
            }
        }
        log.info("建立或重用綠界交易 {}，session {}", payment.getTransactionNo(), sessionId);
        return checkoutForm(payment, bill.tableNo(), amount);
    }

    private EcpayCheckoutResponse checkoutForm(PaymentEntity payment, String tableNo, int amount) {
        Map<String, String> form = new LinkedHashMap<>();
        form.put("MerchantID", props.merchantId());
        form.put("MerchantTradeNo", payment.getTransactionNo());
        form.put("MerchantTradeDate", payment.getCreatedAt().format(ECPAY_DATE));
        form.put("PaymentType", "aio");
        form.put("TotalAmount", Integer.toString(amount));
        form.put("TradeDesc", "SmartOrder hotpot");
        form.put("ItemName", "SmartOrder " + tableNo + " 桌用餐");
        form.put("ReturnURL", props.returnUrl());
        form.put("ClientBackURL", props.clientBackUrl() + "?no=" + payment.getTransactionNo());
        form.put("ChoosePayment", "Credit");
        form.put("EncryptType", "1");
        form.put("CheckMacValue", EcpayUtil.genCheckMacValue(form, props.hashKey(), props.hashIv()));
        return new EcpayCheckoutResponse(props.actionUrl(), form);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public String handleNotify(Map<String, String> params) {
        if (!props.available()) return "0|Payment Unavailable";
        if (!EcpayUtil.verify(params, props.hashKey(), props.hashIv())) return "0|CheckMacValue Error";
        if (!Objects.equals(props.merchantId(), params.get("MerchantID"))) return "0|Merchant Error";
        String transactionNo = params.get("MerchantTradeNo");
        if (transactionNo == null || transactionNo.isBlank()) return "0|Order Not Found";

        // Discover only the session ID before locking it. JPA must not cache a payment entity
        // before another callback commits, because the locked read below must see its new status.
        Long sessionId = jdbc.query("SELECT dining_session_id FROM payment WHERE transaction_no = ?",
                rs -> rs.next() ? rs.getLong(1) : null, transactionNo);
        if (sessionId == null) return "0|Order Not Found";
        DiningSessionEntity session = sessions.findWithLockById(sessionId).orElse(null);
        PaymentEntity payment = payments.findByTransactionNoForUpdate(transactionNo).orElse(null);
        if (payment == null || !Objects.equals(payment.getDiningSessionId(), sessionId)) {
            return "0|Order Not Found";
        }
        int quotedAmount;
        try {
            quotedAmount = exactGatewayAmount(payment.getAmount());
        } catch (ApiException exception) {
            return "0|Amount Error";
        }
        if (!Integer.toString(quotedAmount).equals(params.get("TradeAmt"))) return "0|Amount Error";
        if ("1".equals(params.get("SimulatePaid"))) return "1|OK";
        if (!"0".equals(params.get("SimulatePaid"))) return "1|OK";
        if (!PENDING.equals(payment.getStatus())) return "1|OK";

        String rtnCode = params.get("RtnCode");
        if ("1".equals(rtnCode)) {
            finishSuccessfulPayment(session, payment);
        } else if (rtnCode != null && CONFIRMED_FAILURE_CODES.contains(rtnCode)) {
            payment.setStatus(FAILED);
            log.info("綠界交易 {} 收到終態失敗碼 {}", transactionNo, rtnCode);
        } else {
            log.info("綠界交易 {} 結果仍待確認，碼 {}", transactionNo, rtnCode);
        }
        return "1|OK";
    }

    private void finishSuccessfulPayment(DiningSessionEntity session, PaymentEntity payment) {
        if (session == null) {
            requireReview(payment);
            return;
        }
        // Fixed order: session, payment, table. Never close a later session on this table.
        DiningTableEntity table = tables.findByIdForUpdate(session.getTableId()).orElse(null);
        List<Long> openIds = table == null ? List.of() : sessions.findOpenSessionIdsByTableId(table.getId());
        if (table == null || !"OPEN".equals(session.getStatus())
                || !"OCCUPIED".equals(table.getStatus())
                || openIds.size() != 1 || !session.getId().equals(openIds.get(0))
                || payments.existsByDiningSessionIdAndStatus(session.getId(), SUCCESS)) {
            requireReview(payment);
            return;
        }
        BillingCalculator.Amount current = billingCalculator.calculate(session.getId());
        if (payment.getAmount() == null || current.total().compareTo(payment.getAmount()) != 0) {
            requireReview(payment);
            return;
        }

        billingCalculator.recalculateAndStore(session);
        LocalDateTime closedAt = LocalDateTime.now();
        session.setStatus("PAID");
        session.setClosedAt(closedAt);
        if (checkoutNotifier.completeAfterCommit(session.getId(), "PAID")) session.increaseCartVersion();
        table.setStatus("CLEANING");
        tableStatusNotifier.notifyAfterCommit(table);
        payment.setStatus(SUCCESS);
        payment.setPaidAt(closedAt);
        log.info("綠界交易 {} 成功，session {} 已關帳", payment.getTransactionNo(), session.getId());
    }

    private void requireReview(PaymentEntity payment) {
        payment.setStatus(REQUIRES_REVIEW);
        log.warn("綠界交易 {} 已回報成功，但本地帳單或桌況不相容，需人工確認", payment.getTransactionNo());
    }

    @Transactional(readOnly = true)
    public PaymentResultResponse getResult(String transactionNo, Long guestSessionId) {
        PaymentEntity payment = payments.findByTransactionNo(transactionNo)
                .filter(row -> guestSessionId.equals(row.getDiningSessionId()))
                .orElseThrow(() -> ApiException.notFound("查無這筆付款"));
        DiningSessionEntity session = sessions.findById(guestSessionId).orElse(null);
        String tableNo = "";
        int guestCount = 0;
        if (session != null) {
            guestCount = safeInt(session.getAdultCount()) + safeInt(session.getChildCount());
            tableNo = tables.findById(session.getTableId()).map(DiningTableEntity::getTableNo).orElse("");
        }
        return new PaymentResultResponse(payment.getStatus(), payment.getTransactionNo(),
                payment.getMethod(), payment.getAmount(),
                payment.getPaidAt() == null ? "" : payment.getPaidAt().format(RESULT_DATE),
                tableNo, guestCount);
    }

    private static int exactGatewayAmount(BigDecimal total) {
        if (total == null || total.signum() <= 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "ECPAY_AMOUNT_UNSUPPORTED", "請至櫃檯付款");
        }
        try {
            return total.intValueExact();
        } catch (ArithmeticException exception) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "ECPAY_AMOUNT_UNSUPPORTED", "請至櫃檯付款");
        }
    }

    private static String generateTradeNo() {
        byte[] random = new byte[9];
        RANDOM.nextBytes(random);
        return "SO" + HexFormat.of().withUpperCase().formatHex(random);
    }

    private static int safeInt(Integer value) {
        return value == null ? 0 : value;
    }
}
