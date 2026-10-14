package tw.ispan.smartorder.repository;

import tw.ispan.smartorder.entity.Payment;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PaymentRepository
        extends JpaRepository<Payment, Long> {
}