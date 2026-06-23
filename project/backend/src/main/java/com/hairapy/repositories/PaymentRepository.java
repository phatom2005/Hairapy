package com.hairapy.repositories;

import com.hairapy.models.Payment;
import com.hairapy.models.PaymentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repository xử lý các truy vấn liên quan đến thực thể Payment.
 */
@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {

    // Tìm hóa đơn thanh toán theo orderCode
    Optional<Payment> findByOrderCode(long orderCode);

    // Tìm các hóa đơn thanh toán của một người dùng có phân trang
    Page<Payment> findByUserId(Long userId, Pageable pageable);

    // Đếm số lượng hóa đơn theo trạng thái thanh toán
    long countByStatus(PaymentStatus status);
}
