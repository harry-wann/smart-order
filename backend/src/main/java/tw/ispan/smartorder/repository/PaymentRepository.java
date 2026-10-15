package tw.ispan.smartorder.repository;

import tw.ispan.smartorder.entity.PaymentEntity;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PaymentRepository
        extends JpaRepository<PaymentEntity, Long> {
}