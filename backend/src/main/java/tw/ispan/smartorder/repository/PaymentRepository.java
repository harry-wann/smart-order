package tw.ispan.smartorder.repository;

import tw.ispan.smartorder.entity.PaymentEntity;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PaymentRepository
        extends JpaRepository<PaymentEntity, Long> {

    Optional<PaymentEntity> findByTransactionNo(String transactionNo);

    @Query(value = "SELECT * FROM payment WHERE transaction_no = :transactionNo FOR UPDATE", nativeQuery = true)
    Optional<PaymentEntity> findByTransactionNoForUpdate(@Param("transactionNo") String transactionNo);

    List<PaymentEntity> findByDiningSessionIdAndStatusOrderByIdDesc(Long diningSessionId, String status);

    boolean existsByDiningSessionIdAndStatusIn(Long diningSessionId, List<String> statuses);

    boolean existsByDiningSessionIdAndStatus(Long diningSessionId, String status);

}
