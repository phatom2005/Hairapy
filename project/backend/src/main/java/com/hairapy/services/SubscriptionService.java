package com.hairapy.services;

import com.hairapy.models.Subscription;
import com.hairapy.models.SubscriptionStatus;
import com.hairapy.repositories.SubscriptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Service tiện ích kiểm tra trạng thái gói dịch vụ của người dùng.
 */
@Service
@RequiredArgsConstructor
public class SubscriptionService {

    private final SubscriptionRepository subscriptionRepository;

    /**
     * Kiểm tra người dùng có đang sở hữu gói dịch vụ trả phí (PRO hoặc PREMIUM) đang THỰC SỰ hoạt động không.
     * Đây là nguồn chân lý (single source of truth) duy nhất cho câu hỏi "user này có phải Premium không" —
     * mọi nơi khác (AuthService.resolveEffectiveRole, UsageService...) PHẢI gọi hàm này, không tự lặp lại logic.
     *
     * Có check endDate ở đây (trước đây thiếu, chỉ dựa vào status=ACTIVE) vì SubscriptionScheduler chỉ chạy
     * mỗi giờ 1 lần (cron "0 0 * * * *") để chuyển ACTIVE -> EXPIRED, nên nếu chỉ dựa vào status thì sẽ có
     * khoảng lệch tối đa ~1 tiếng sau khi gói hết hạn mà hệ thống vẫn coi user là "trả phí".
     *
     * @param userId ID người dùng cần kiểm tra.
     * @return true nếu người dùng có subscription ACTIVE với plan trả phí VÀ chưa hết hạn (endDate).
     */
    public boolean isPaidUser(Long userId) {
        Optional<Subscription> activeSubOpt =
                subscriptionRepository.findByUserIdAndStatus(userId, SubscriptionStatus.ACTIVE);

        if (activeSubOpt.isEmpty()) {
            return false;
        }

        Subscription sub = activeSubOpt.get();
        boolean notExpired = sub.getEndDate() == null || sub.getEndDate().isAfter(LocalDateTime.now());
        return notExpired && sub.getPlan().isPaid();
    }
}
