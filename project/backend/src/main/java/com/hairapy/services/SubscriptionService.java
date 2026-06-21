package com.hairapy.services;

import com.hairapy.models.SubscriptionStatus;
import com.hairapy.repositories.SubscriptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Service tiện ích kiểm tra trạng thái gói dịch vụ của người dùng.
 */
@Service
@RequiredArgsConstructor
public class SubscriptionService {

    private final SubscriptionRepository subscriptionRepository;

    /**
     * Kiểm tra người dùng có đang sở hữu gói dịch vụ trả phí (PRO hoặc PREMIUM) đang hoạt động không.
     *
     * @param userId ID người dùng cần kiểm tra.
     * @return true nếu người dùng có subscription ACTIVE với plan trả phí.
     */
    public boolean isPaidUser(Long userId) {
        return subscriptionRepository
                .findByUserIdAndStatus(userId, SubscriptionStatus.ACTIVE)
                .map(sub -> sub.getPlan().isPaid())
                .orElse(false);
    }
}
