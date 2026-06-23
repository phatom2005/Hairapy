package com.hairapy.schedulers;

import com.hairapy.models.Subscription;
import com.hairapy.models.SubscriptionStatus;
import com.hairapy.repositories.SubscriptionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Lập lịch quét tự động kiểm tra và hạ cấp các gói đăng ký trả phí hết hạn.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SubscriptionScheduler {

    private final SubscriptionRepository subscriptionRepository;

    /**
     * Chạy định kỳ mỗi giờ để tự động cập nhật trạng thái EXPIRED cho các gói subscription hết hạn.
     */
    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    public void expireSubscriptions() {
        log.info("Bắt đầu tiến trình tự động quét các gói subscription hết hạn...");
        
        LocalDateTime now = LocalDateTime.now();
        List<Subscription> expiredSubs = subscriptionRepository.findByStatusAndEndDateBefore(
                SubscriptionStatus.ACTIVE, now);

        if (expiredSubs.isEmpty()) {
            log.info("Không có gói subscription nào hết hạn cần xử lý.");
            return;
        }

        for (Subscription sub : expiredSubs) {
            sub.setStatus(SubscriptionStatus.EXPIRED);
            subscriptionRepository.save(sub);
            log.info("Đã hạ cấp gói subscription ID: {} (Gói: {}) của user: {} sang EXPIRED (Hết hạn lúc: {})", 
                    sub.getId(), sub.getPlan(), sub.getUser().getEmail(), sub.getEndDate());
        }

        log.info("Hoàn thành tiến trình hạ cấp các gói subscription hết hạn. Số lượng xử lý: {}", expiredSubs.size());
    }
}
