package tw.ispan.smartorder.repository;

import tw.ispan.smartorder.entity.PaymentEntity;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PaymentRepository
        extends JpaRepository<PaymentEntity, Long> {

    Optional<PaymentEntity> findByTransactionNo(String transactionNo);

    boolean existsByDiningSessionIdAndStatus(Long diningSessionId, String status);
}