package com.hairapy.services;

import com.hairapy.models.Subscription;
import com.hairapy.models.SubscriptionPlan;
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
        return getActivePaidSubscription(userId).isPresent();
    }

    /**
     * Gói trả phí đang THỰC SỰ hoạt động của user (PRO hoặc PREMIUM), hoặc FREE nếu không có.
     * Dùng cho việc tính hạn mức theo từng gói; cùng điều kiện "chưa hết hạn" với isPaidUser().
     */
    public SubscriptionPlan getEffectivePlan(Long userId) {
        return getActivePaidSubscription(userId).map(Subscription::getPlan).orElse(SubscriptionPlan.FREE);
    }

    /**
     * Subscription trả phí đang THỰC SỰ hoạt động (ACTIVE + chưa hết hạn + plan trả phí), nếu có.
     * Nguồn duy nhất cho isPaidUser/getEffectivePlan và cho FE hiển thị gói + ngày hết hạn.
     */
    public Optional<Subscription> getActivePaidSubscription(Long userId) {
        return subscriptionRepository.findByUserIdAndStatus(userId, SubscriptionStatus.ACTIVE)
                .filter(sub -> sub.getEndDate() == null || sub.getEndDate().isAfter(LocalDateTime.now()))
                .filter(sub -> sub.getPlan().isPaid());
    }
}
