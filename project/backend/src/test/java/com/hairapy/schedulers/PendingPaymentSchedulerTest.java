package com.hairapy.schedulers;

import com.hairapy.models.Payment;
import com.hairapy.models.PaymentStatus;
import com.hairapy.models.Role;
import com.hairapy.models.SubscriptionPlan;
import com.hairapy.models.User;
import com.hairapy.repositories.PaymentRepository;
import com.hairapy.repositories.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.sql.Timestamp;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest
@ActiveProfiles("test")
class PendingPaymentSchedulerTest {

    @Autowired PendingPaymentScheduler scheduler;
    @Autowired PaymentRepository paymentRepository;
    @Autowired UserRepository userRepository;
    @Autowired JdbcTemplate jdbc;

    private Long userId;

    @AfterEach
    void cleanup() {
        if (userId == null) return;
        paymentRepository.findByUserId(userId, org.springframework.data.domain.Pageable.unpaged())
                .forEach(paymentRepository::delete);
        userRepository.deleteById(userId);
    }

    private void payment(User u, long code, PaymentStatus status, int hoursAgo) {
        paymentRepository.save(Payment.builder().user(u).orderCode(code).plan(SubscriptionPlan.PRO)
                .amount(49000).status(status).build());
        // createdAt là @CreationTimestamp (updatable=false) → lùi mốc tạo bằng SQL
        jdbc.update("UPDATE payments SET created_at = ? WHERE order_code = ?",
                Timestamp.valueOf(LocalDateTime.now().minusHours(hoursAgo)), code);
    }

    @Test
    void huyDonPendingQua24h_khongDungDonMoiVaDonDaPaid() {
        User u = userRepository.save(User.builder().email("sched-pay@example.com")
                .role(Role.USER).fullName("S").emailVerified(true).build());
        userId = u.getId();
        payment(u, 91001L, PaymentStatus.PENDING, 25);
        payment(u, 91002L, PaymentStatus.PENDING, 1);
        payment(u, 91003L, PaymentStatus.PAID, 30);

        scheduler.cancelStalePendingPayments();

        assertEquals(PaymentStatus.CANCELLED, paymentRepository.findByOrderCode(91001L).orElseThrow().getStatus());
        assertEquals(PaymentStatus.PENDING, paymentRepository.findByOrderCode(91002L).orElseThrow().getStatus());
        assertEquals(PaymentStatus.PAID, paymentRepository.findByOrderCode(91003L).orElseThrow().getStatus());
    }
}
