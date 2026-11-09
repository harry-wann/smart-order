package tw.ispan.smartorder.service;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import javax.sql.DataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import tw.ispan.smartorder.common.exception.ApiException;
import tw.ispan.smartorder.config.EcpayProperties;
import tw.ispan.smartorder.dto.BillResponse;
import tw.ispan.smartorder.dto.CounterHoldResponse;
import tw.ispan.smartorder.dto.EcpayCheckoutResponse;
import tw.ispan.smartorder.dto.PaymentReleaseResponse;
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
    private static final String SUPERSEDED = "SUPERSEDED";
    // 綠界查詢回傳的 TradeStatus：1 = 已付款
    private static final String TRADE_PAID = "1";
    // 發起人離開太久，同桌其他人才能接手；接手前一樣要先問綠界
    private static final Duration PENDING_TAKEOVER_AFTER = Duration.ofMinutes(15);
    private static final Duration QUERY_TIMEOUT = Duration.ofSeconds(5);
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
    private final RestClient restClient;
    private final CounterCheckoutHolds counterHolds;

    public EcpayService(EcpayProperties props, BillService billService, BillingCalculator billingCalculator,
                        PaymentRepository payments, DiningSessionRepository sessions,
                        DiningTableRepository tables, TableStatusNotifier tableStatusNotifier,
                        MenuCheckoutNotifier checkoutNotifier, CounterCheckoutHolds counterHolds,
                        @Qualifier("smartOrderDataSource") DataSource dataSource) {
        this.props = props;
        this.billService = billService;
        this.billingCalculator = billingCalculator;
        this.payments = payments;
        this.sessions = sessions;
        this.tables = tables;
        this.tableStatusNotifier = tableStatusNotifier;
        this.checkoutNotifier = checkoutNotifier;
        this.counterHolds = counterHolds;
        this.jdbc = new JdbcTemplate(dataSource);
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(QUERY_TIMEOUT);
        requestFactory.setReadTimeout(QUERY_TIMEOUT);
        this.restClient = RestClient.builder().requestFactory(requestFactory).build();
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public EcpayCheckoutResponse createCheckout(long sessionId, long guestId, BigDecimal expectedTotal) {
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

        // 同桌有人開著「到櫃檯結帳」視窗，線上付款先擋下
        if (counterHolds.heldByOther(sessionId, guestId)) {
            throw ApiException.conflict("PAYMENT_IN_PROGRESS", "同桌有人正在結帳，請稍候");
        }
        // 上面已鎖住 session，同桌同時按付款的人會在這裡排隊，一定讀得到前一個人剛建立的 PENDING
        List<PaymentEntity> pending = payments.findByDiningSessionIdAndStatusOrderByIdDesc(sessionId, PENDING);
        if (pending.size() > 1) {
            throw ApiException.conflict("PAYMENT_PENDING", "此桌有多筆待確認付款，請洽櫃檯");
        }
        if (!pending.isEmpty()) {
            PaymentEntity previous = pending.get(0);
            // 同桌別人正在付款：只有發起人能重來，超過接手時間別人才能接手
            if (!Objects.equals(previous.getCreatedByGuestId(), guestId) && !takeoverAllowed(previous)) {
                throw ApiException.conflict("PAYMENT_IN_PROGRESS", "同桌有人正在付款，請稍候");
            }
            // 沒收到通知不代表沒付款，不用時間猜，直接問綠界舊編號的真實狀態
            Map<String, String> trade = queryTrade(previous.getTransactionNo());
            if (settleIfPaid(session, previous, trade)) {
                return EcpayCheckoutResponse.resolved(previous.getTransactionNo());
            }
            // 綠界不接受重複的 MerchantTradeNo，沒付成功的舊單作廢，下面用新編號重建
            previous.setStatus(SUPERSEDED);
            log.info("綠界交易 {} 查詢狀態 {}，作廢後改用新編號", previous.getTransactionNo(), trade.get("TradeStatus"));
        }

        BillResponse bill = billService.calculateBill(sessionId);
        if (bill.total().compareTo(expectedTotal) != 0) {
            throw ApiException.conflict("BILL_CHANGED", "帳單金額已變動，請重新確認");
        }
        int amount = exactGatewayAmount(bill.total());

        PaymentEntity payment = new PaymentEntity();
        payment.setDiningSessionId(sessionId);
        payment.setMethod("ECPAY");
        payment.setAmount(bill.total());
        payment.setStatus(PENDING);
        payment.setTransactionNo(generateTradeNo());
        payment.setCreatedByGuestId(guestId);
        payment.setCreatedAt(LocalDateTime.now(ZoneId.of("Asia/Taipei")));
        payment = payments.saveAndFlush(payment);
        log.info("建立綠界交易 {}，session {}，guest {}", payment.getTransactionNo(), sessionId, guestId);
        // 本人從櫃檯結帳改成線上付款，櫃檯的鎖就不需要了
        counterHolds.release(sessionId, guestId);
        return checkoutForm(payment, bill.tableNo(), amount);
    }

    // 「到櫃檯結帳」：鎖住這桌，視窗開著時同桌別人不能線上付款。
    // 規則跟線上付款一樣：別人正在付款就擋；自己有待確認的線上付款，先問綠界再放棄
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public CounterHoldResponse holdCounter(long sessionId, long guestId) {
        DiningSessionEntity session = sessions.findWithLockById(sessionId)
                .orElseThrow(() -> ApiException.unauthorized("用餐場次已失效"));
        if (!"OPEN".equals(session.getStatus())) {
            throw ApiException.conflict("SESSION_CLOSED", "此桌已停止付款");
        }
        if (counterHolds.heldByOther(sessionId, guestId)) {
            throw ApiException.conflict("PAYMENT_IN_PROGRESS", "同桌有人正在結帳，請稍候");
        }
        List<PaymentEntity> pending = payments.findByDiningSessionIdAndStatusOrderByIdDesc(sessionId, PENDING);
        if (pending.size() > 1) {
            throw ApiException.conflict("PAYMENT_PENDING", "此桌有多筆待確認付款，請洽櫃檯");
        }
        if (!pending.isEmpty()) {
            PaymentEntity previous = pending.get(0);
            if (!Objects.equals(previous.getCreatedByGuestId(), guestId) && !takeoverAllowed(previous)) {
                throw ApiException.conflict("PAYMENT_IN_PROGRESS", "同桌有人正在付款，請稍候");
            }
            Map<String, String> trade = queryTrade(previous.getTransactionNo());
            if (settleIfPaid(session, previous, trade)) {
                return CounterHoldResponse.resolved(previous.getTransactionNo());
            }
            previous.setStatus(SUPERSEDED);
            log.info("綠界交易 {} 改到櫃檯結帳前作廢，查詢狀態 {}", previous.getTransactionNo(), trade.get("TradeStatus"));
        }
        counterHolds.hold(sessionId, guestId);
        return CounterHoldResponse.locked();
    }

    public void releaseCounter(long sessionId, long guestId) {
        counterHolds.release(sessionId, guestId);
    }

    // 發起人放棄自己的待確認付款，讓同桌其他人可以付款。放棄前一樣先問綠界，已付款就直接完成
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public PaymentReleaseResponse releasePending(long sessionId, long guestId, String transactionNo) {
        // 鎖順序跟付款通知一樣：先 session、再 payment
        DiningSessionEntity session = sessions.findWithLockById(sessionId)
                .orElseThrow(() -> ApiException.unauthorized("用餐場次已失效"));
        PaymentEntity payment = payments.findByTransactionNoForUpdate(transactionNo)
                .filter(row -> Objects.equals(row.getDiningSessionId(), sessionId))
                .orElseThrow(() -> ApiException.notFound("查無這筆付款"));
        // 已經有結果（成功、失敗、已放棄）就不用再處理，前端重新查詢會看到最新狀態
        if (!PENDING.equals(payment.getStatus())) {
            return new PaymentReleaseResponse(payment.getStatus());
        }
        if (!Objects.equals(payment.getCreatedByGuestId(), guestId)) {
            throw ApiException.conflict("PAYMENT_NOT_OWNER", "只有發起付款的人可以改由別人付款");
        }
        Map<String, String> trade = queryTrade(transactionNo);
        if (!settleIfPaid(session, payment, trade)) {
            payment.setStatus(SUPERSEDED);
            log.info("綠界交易 {} 由發起人放棄，查詢狀態 {}", transactionNo, trade.get("TradeStatus"));
        }
        return new PaymentReleaseResponse(payment.getStatus());
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
        return EcpayCheckoutResponse.form(props.actionUrl(), form);
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
        if (SUPERSEDED.equals(payment.getStatus()) || FAILED.equals(payment.getStatus())) {
            // 舊付款頁仍可能付款成功：錢已經收了，交給櫃檯確認與退款，不能當作沒發生
            if ("1".equals(params.get("RtnCode"))) {
                payment.setStatus(REQUIRES_REVIEW);
                log.warn("綠界交易 {} 作廢或失敗後才回報付款成功，需櫃檯確認退款", transactionNo);
            }
            return "1|OK";
        }
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

    // 綠界說已付款：金額相符就完成付款，不符交給櫃檯確認。回傳 false 表示綠界那邊沒付成功
    private boolean settleIfPaid(DiningSessionEntity session, PaymentEntity payment, Map<String, String> trade) {
        if (!TRADE_PAID.equals(trade.get("TradeStatus"))) {
            return false;
        }
        String quoted = Integer.toString(exactGatewayAmount(payment.getAmount()));
        if (quoted.equals(trade.get("TradeAmt"))) {
            finishSuccessfulPayment(session, payment);
        } else {
            requireReview(payment);
        }
        return true;
    }

    private boolean takeoverAllowed(PaymentEntity payment) {
        LocalDateTime createdAt = payment.getCreatedAt();
        return createdAt == null
                || createdAt.plus(PENDING_TAKEOVER_AFTER).isBefore(LocalDateTime.now(ZoneId.of("Asia/Taipei")));
    }

    // 綠界 QueryTradeInfo：回應也帶 CheckMacValue，驗過且編號相符才採信
    private Map<String, String> queryTrade(String transactionNo) {
        if (props.queryUrl() == null || props.queryUrl().isBlank()) {
            throw queryFailed();
        }
        Map<String, String> form = new LinkedHashMap<>();
        form.put("MerchantID", props.merchantId());
        form.put("MerchantTradeNo", transactionNo);
        form.put("TimeStamp", Long.toString(Instant.now().getEpochSecond()));
        form.put("CheckMacValue", EcpayUtil.genCheckMacValue(form, props.hashKey(), props.hashIv()));
        String body = form.entrySet().stream()
                .map(entry -> entry.getKey() + "=" + URLEncoder.encode(entry.getValue(), StandardCharsets.UTF_8))
                .collect(Collectors.joining("&"));

        Map<String, String> result;
        try {
            String response = restClient.post()
                    .uri(props.queryUrl())
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(body)
                    .retrieve()
                    .body(String.class);
            result = EcpayUtil.parseQueryString(response);
        } catch (RestClientException exception) {
            log.warn("查詢綠界交易 {} 失敗", transactionNo, exception);
            throw queryFailed();
        }
        if (!EcpayUtil.verify(result, props.hashKey(), props.hashIv())
                || !transactionNo.equals(result.get("MerchantTradeNo"))) {
            log.warn("綠界交易 {} 查詢回應驗證失敗：{}", transactionNo, result);
            throw queryFailed();
        }
        return result;
    }

    private static ApiException queryFailed() {
        return new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "PAYMENT_QUERY_FAILED",
                "暫時無法確認上一筆付款，請稍後再試或洽櫃檯");
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
