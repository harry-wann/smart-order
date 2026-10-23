package tw.ispan.smartorder.service;

import java.util.List;
import org.springframework.stereotype.Service;
import tw.ispan.smartorder.common.exception.ApiException;
import tw.ispan.smartorder.repository.PaymentRepository;

/** Call only after locking the dining_session row. */
@Service
public class PendingPaymentGuard {
    private final PaymentRepository payments;

    public PendingPaymentGuard(PaymentRepository payments) {
        this.payments = payments;
    }

    public void requireNoOutstanding(Long sessionId) {
        if (hasOutstanding(sessionId)) {
            throw ApiException.conflict("PAYMENT_PENDING", "此桌有尚待確認的線上付款");
        }
    }

    public boolean hasOutstanding(Long sessionId) {
        return payments.existsByDiningSessionIdAndStatusIn(sessionId, List.of("PENDING", "REQUIRES_REVIEW"));
    }
}
