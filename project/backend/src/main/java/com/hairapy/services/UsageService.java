package com.hairapy.services;

import com.hairapy.exceptions.QuotaExceededException;
import com.hairapy.models.Subscription;
import com.hairapy.models.SubscriptionStatus;
import com.hairapy.models.UsageHistory;
import com.hairapy.models.User;
import com.hairapy.repositories.SubscriptionRepository;
import com.hairapy.repositories.UsageHistoryRepository;
import com.hairapy.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Service quản lý giới hạn sử dụng (quota) các tính năng AI của người dùng.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UsageService {

    private final UserRepository userRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final UsageHistoryRepository usageHistoryRepository;

    /**
     * Lấy thông tin User hiện tại đang đăng nhập từ Security Context.
     *
     * @return User hiện tại hoặc null nếu chưa đăng nhập.
     */
    public User getCurrentUser() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }
        String email = authentication.getName();
        return userRepository.findByEmail(email).orElse(null);
    }

    /**
     * Kiểm tra hạn mức sử dụng (quota) hôm nay của người dùng cho tính năng cụ thể.
     *
     * @param user người dùng hiện tại.
     * @param feature tên tính năng cần kiểm tra (ví dụ: HAIR_SWAP, AI_SCAN).
     */
    public void checkQuota(User user, String feature) {
        if (user == null) {
            throw new IllegalArgumentException("Người dùng chưa đăng nhập.");
        }

        // 1. Kiểm tra trạng thái gói đăng ký (Subscription) của User
        Optional<Subscription> activeSubOpt = subscriptionRepository.findByUserIdAndStatus(user.getId(), SubscriptionStatus.ACTIVE);
        
        boolean isPaid = false;
        if (activeSubOpt.isPresent()) {
            Subscription sub = activeSubOpt.get();
            // Điều kiện active: status là ACTIVE và thời hạn kết thúc (nếu có) phải sau thời điểm hiện tại
            if (sub.getEndDate() == null || sub.getEndDate().isAfter(LocalDateTime.now())) {
                // Sử dụng method plan.isPaid() đã định nghĩa sẵn
                isPaid = sub.getPlan().isPaid();
            }
        }

        // 2. Xác định giới hạn (limit) theo tier (Free vs Paid)
        // - Free user: scan 1 lần/ngày, swap 5 lần/ngày
        // - Premium/Paid user: scan 5 lần/ngày, swap 20 lần/ngày
        int limit;
        if ("HAIR_SWAP".equals(feature)) {
            limit = isPaid ? 20 : 5;
        } else if ("AI_SCAN".equals(feature)) {
            limit = isPaid ? 5 : 1;
        } else {
            // Mặc định không giới hạn cho các tính năng khác
            return;
        }

        // 3. Đếm số lượt sử dụng của user trong ngày hôm nay (từ 00:00)
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        long todayCount = usageHistoryRepository.countTodayUsage(user.getId(), feature, startOfDay);

        log.info("Kiểm tra giới hạn dùng cho user [{}]: feature={}, used={}, limit={}, isPaid={}", 
                user.getEmail(), feature, todayCount, limit, isPaid);

        if (todayCount >= limit) {
            throw new QuotaExceededException("Bạn đã hết lượt sử dụng tính năng này hôm nay.", limit);
        }
    }

    /**
     * Ghi lại một lượt sử dụng tính năng sau khi xử lý thành công.
     *
     * @param user người dùng thực hiện.
     * @param feature tên tính năng (ví dụ: HAIR_SWAP).
     */
    public void recordUsage(User user, String feature) {
        if (user == null) {
            log.warn("Không thể lưu UsageHistory vì user rỗng.");
            return;
        }

        UsageHistory history = UsageHistory.builder()
                .user(user)
                .feature(feature)
                .usedAt(LocalDateTime.now())
                .build();
        
        usageHistoryRepository.save(history);
        log.info("Đã lưu lịch sử sử dụng thành công cho user: {}, tính năng: {}", user.getEmail(), feature);
    }
}
