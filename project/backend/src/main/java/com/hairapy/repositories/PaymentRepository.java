package com.hairapy.repositories;

import com.hairapy.models.Payment;
import com.hairapy.models.PaymentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
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

    // 1. Tổng doanh thu mọi thời gian (VND, chỉ tính PAID)
    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.status = com.hairapy.models.PaymentStatus.PAID")
    long sumPaidAmount();

    // 2. Doanh thu trong kỳ period (chỉ tính PAID và paidAt >= :since)
    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.status = com.hairapy.models.PaymentStatus.PAID AND p.paidAt >= :since")
    long sumPaidAmountSince(@Param("since") LocalDateTime since);

    // 3. Số giao dịch PAID trong kỳ period
    @Query("SELECT COUNT(p) FROM Payment p WHERE p.status = com.hairapy.models.PaymentStatus.PAID AND p.paidAt >= :since")
    long countPaidSince(@Param("since") LocalDateTime since);

    // 4. Biểu đồ doanh thu theo ngày (cho chart)
    @Query("SELECT CAST(p.paidAt AS date) as day, COALESCE(SUM(p.amount), 0) as total FROM Payment p WHERE p.status = com.hairapy.models.PaymentStatus.PAID AND p.paidAt >= :since GROUP BY CAST(p.paidAt AS date) ORDER BY day")
    List<Object[]> sumDailyRevenueSince(@Param("since") LocalDateTime since);

    // 5. Biểu đồ doanh thu theo tháng (cho chart khi period > 90 ngày)
    @Query("SELECT FUNCTION('to_char', p.paidAt, 'YYYY-MM') as month, COALESCE(SUM(p.amount), 0) as total FROM Payment p WHERE p.status = com.hairapy.models.PaymentStatus.PAID AND p.paidAt >= :since GROUP BY FUNCTION('to_char', p.paidAt, 'YYYY-MM') ORDER BY month")
    List<Object[]> sumMonthlyRevenueSince(@Param("since") LocalDateTime since);
}
