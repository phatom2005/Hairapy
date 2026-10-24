package com.hairapy.schedulers;

import com.hairapy.models.Payment;
import com.hairapy.models.PaymentStatus;
import com.hairapy.repositories.PaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Tự huỷ các đơn thanh toán PENDING treo quá 24h (khách mở link PayOS rồi bỏ).
 * Webhook/đối soát đến trễ vẫn chuyển được CANCELLED → PAID (xem PaymentService.handleWebhook).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PendingPaymentScheduler {

    static final Duration MAX_PENDING_AGE = Duration.ofHours(24);

    private final PaymentRepository paymentRepository;

    @Scheduled(cron = "0 15 * * * *", zone = "Asia/Ho_Chi_Minh")
    @Transactional
    public int cancelStalePendingPayments() {
        LocalDateTime cutoff = LocalDateTime.now().minus(MAX_PENDING_AGE);
        List<Payment> stale = paymentRepository.findByStatusAndCreatedAtBefore(PaymentStatus.PENDING, cutoff);
        for (Payment p : stale) {
            p.setStatus(PaymentStatus.CANCELLED);
        }
        paymentRepository.saveAll(stale);
        if (!stale.isEmpty()) {
            log.info("Đã tự huỷ {} đơn thanh toán PENDING quá 24h.", stale.size());
        }
        return stale.size();
    }
}
