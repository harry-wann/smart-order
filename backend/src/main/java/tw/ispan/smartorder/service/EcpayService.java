package tw.ispan.smartorder.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
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

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class EcpayService {
    private static final Logger log = LoggerFactory.getLogger(EcpayService.class);

    private static final String METHOD_ECPAY = "ECPAY";
    private static final String PENDING = "PENDING";
    private static final String SUCCESS = "SUCCESS";
    private static final String FAILED = "FAILED";

    private static final Duration PENDING_LOCK = Duration.ofMinutes(3);

    private static final DateTimeFormatter ECPAY_DATE = DateTimeFormatter.ofPattern("yyyy/MM/dd HH:mm:ss");
    private static final DateTimeFormatter RESULT_DATE = DateTimeFormatter.ofPattern("yyyy/MM/dd HH:mm");

    private final EcpayProperties props;
    private final BillService billService;
    private final PaymentRepository paymentRepository;
    private final DiningSessionRepository sessionRepository;
    private final DiningTableRepository tableRepository;
    private final TableStatusNotifier tableStatusNotifier;

    public EcpayService(EcpayProperties props,
                        BillService billService,
                        PaymentRepository paymentRepository,
                        DiningSessionRepository sessionRepository,
                        DiningTableRepository tableRepository,
                        TableStatusNotifier tableStatusNotifier) {
        this.props = props;
        this.billService = billService;
        this.paymentRepository = paymentRepository;
        this.sessionRepository = sessionRepository;
        this.tableRepository = tableRepository;
        this.tableStatusNotifier = tableStatusNotifier;
    }

    @Transactional
    public EcpayCheckoutResponse createCheckout(long sessionId) {
        DiningSessionEntity session = sessionRepository.findWithLockById(sessionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "DINING_SESSION_ENDED"));
        if (!"OPEN".equals(session.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "這桌已經結帳");
        }
        if (paymentRepository.existsByDiningSessionIdAndStatus(sessionId, SUCCESS)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "這桌已經付款完成");
        }
        if (paymentRepository.existsByDiningSessionIdAndStatusAndCreatedAtAfter(
                sessionId, PENDING, LocalDateTime.now().minus(PENDING_LOCK))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "同桌有人正在付款中，請稍候再試或到櫃檯確認");
        }

        BillResponse bill = billService.calculateBill(sessionId);
        int amount = toEcpayAmount(bill.total());
        if (amount <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "還沒有點餐，不能付款");
        }

        PaymentEntity payment = new PaymentEntity();
        payment.setDiningSessionId(sessionId);
        payment.setMethod(METHOD_ECPAY);
        payment.setAmount(BigDecimal.valueOf(amount));
        payment.setStatus(PENDING);
        payment.setTransactionNo(generateTradeNo());
        paymentRepository.save(payment);

        Map<String, String> p = new LinkedHashMap<>();
        p.put("MerchantID", props.merchantId());
        p.put("MerchantTradeNo", payment.getTransactionNo());
        p.put("MerchantTradeDate", LocalDateTime.now(ZoneId.of("Asia/Taipei")).format(ECPAY_DATE));
        p.put("PaymentType", "aio");
        p.put("TotalAmount", String.valueOf(amount));
        p.put("TradeDesc", "SmartOrder hotpot");
        p.put("ItemName", "SmartOrder " + bill.tableNo() + " 桌用餐");
        p.put("ReturnURL", props.returnUrl());
        p.put("ClientBackURL", props.clientBackUrl() + "?no=" + payment.getTransactionNo());
        p.put("ChoosePayment", "Credit");
        p.put("EncryptType", "1");
        p.put("CheckMacValue", EcpayUtil.genCheckMacValue(p, props.hashKey(), props.hashIv()));

        log.info("建立綠界訂單 {}，session {}，金額 {}", payment.getTransactionNo(), sessionId, amount);
        return new EcpayCheckoutResponse(props.actionUrl(), p);
    }

    @Transactional
    public String handleNotify(Map<String, String> params) {
        log.info("=== 收到綠界通知 === {}", params);

        if (!EcpayUtil.verify(params, props.hashKey(), props.hashIv())) {
            log.warn("CheckMacValue 驗證失敗");
            return "0|CheckMacValue Error";
        }

        PaymentEntity payment = paymentRepository.findByTransactionNo(params.get("MerchantTradeNo")).orElse(null);
        if (payment == null) {
            log.warn("找不到付款 {}", params.get("MerchantTradeNo"));
            return "0|Order Not Found";
        }

        if (!PENDING.equals(payment.getStatus())) {
            return "1|OK";
        }

        boolean rtnOk = "1".equals(params.get("RtnCode"));
        boolean amountOk = String.valueOf(payment.getAmount().intValue()).equals(params.get("TradeAmt"));

        if (!rtnOk || !amountOk) {
            payment.setStatus(FAILED);
            paymentRepository.save(payment);
            log.warn("付款 {} 失敗：RtnCode={}，金額相符={}", payment.getTransactionNo(), params.get("RtnCode"), amountOk);
            return "1|OK";
        }

        payment.setStatus(SUCCESS);
        payment.setPaidAt(LocalDateTime.now());
        paymentRepository.save(payment);

        closeSession(payment.getDiningSessionId());

        log.info("付款 {} 成功，session {} 已關帳", payment.getTransactionNo(), payment.getDiningSessionId());
        return "1|OK";
    }

    private void closeSession(Long sessionId) {
        DiningSessionEntity session = sessionRepository.findWithLockById(sessionId).orElse(null);
        if (session == null || !"OPEN".equals(session.getStatus())) {
            log.warn("session {} 已經不是 OPEN（{}），付款成功但沒有關帳，請人工確認是否重複收款",
                    sessionId, session == null ? "不存在" : session.getStatus());
            return;
        }
        session.setStatus("PAID");
        session.setClosedAt(LocalDateTime.now());
        sessionRepository.save(session);

        tableRepository.findByIdForUpdate(session.getTableId()).ifPresent(table -> {
            table.setStatus("CLEANING");
            tableRepository.save(table);
            tableStatusNotifier.notifyAfterCommit(table);
        });
    }

    @Transactional(readOnly = true)
    public PaymentResultResponse getResult(String transactionNo) {
        PaymentEntity payment = paymentRepository.findByTransactionNo(transactionNo)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "查無這筆付款"));

        DiningSessionEntity session = sessionRepository.findById(payment.getDiningSessionId()).orElse(null);
        String tableNo = "";
        int guestCount = 0;
        if (session != null) {
            guestCount = safeInt(session.getAdultCount()) + safeInt(session.getChildCount());
            tableNo = tableRepository.findById(session.getTableId())
                    .map(DiningTableEntity::getTableNo)
                    .orElse("");
        }

        return new PaymentResultResponse(
                payment.getStatus(),
                payment.getTransactionNo(),
                payment.getMethod(),
                payment.getAmount().intValue(),
                payment.getPaidAt() == null ? "" : payment.getPaidAt().format(RESULT_DATE),
                tableNo,
                guestCount);
    }

    private static int toEcpayAmount(BigDecimal total) {
        return total.setScale(0, RoundingMode.HALF_UP).intValueExact();
    }

    private static String generateTradeNo() {
        return "SO" + System.currentTimeMillis()
                + String.format("%03d", ThreadLocalRandom.current().nextInt(1000));
    }

    private static int safeInt(Integer value) {
        return value == null ? 0 : value;
    }
}
