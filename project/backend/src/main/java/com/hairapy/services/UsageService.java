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
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.transaction.annotation.Transactional;

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

    // Khoá theo userId để chống race condition khi 2 request cùng user gửi đồng thời lúc còn 1 lượt cuối.
    // LƯU Ý: đây là in-JVM lock, chỉ đúng khi backend chạy 1 instance (đúng hiện trạng MVP — xem scheduler-decision).
    // Nếu sau này scale nhiều instance, phải đổi sang Postgres advisory lock hoặc Redis distributed lock.
    private final ConcurrentHashMap<Long, Object> userLocks = new ConcurrentHashMap<>();

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
     * Kiểm tra quota VÀ ghi nhận lượt dùng ngay trong 1 bước (atomic ở mức JVM, synchronized theo userId) —
     * thay cho check-rồi-record tách rời như trước (dễ dính race condition khi 2 request đồng thời).
     * Nếu bước xử lý sau đó (gọi AI...) thất bại, gọi releaseUsage(reservation) để hoàn lượt.
     *
     * @return UsageHistory vừa ghi — dùng để releaseUsage() nếu cần hoàn lượt.
     */
    @Transactional
    public UsageHistory reserveUsage(User user, String feature) {
        if (user == null) {
            throw new IllegalArgumentException("Người dùng chưa đăng nhập.");
        }

        Object lock = userLocks.computeIfAbsent(user.getId(), k -> new Object());
        synchronized (lock) {
            boolean bypass = user.getRole() == com.hairapy.models.Role.ADMIN
                    || user.getRole() == com.hairapy.models.Role.TESTER;

            if (!bypass) {
                Optional<Subscription> activeSubOpt =
                        subscriptionRepository.findByUserIdAndStatus(user.getId(), SubscriptionStatus.ACTIVE);
                boolean isPaid = false;
                if (activeSubOpt.isPresent()) {
                    Subscription sub = activeSubOpt.get();
                    if (sub.getEndDate() == null || sub.getEndDate().isAfter(LocalDateTime.now())) {
                        isPaid = sub.getPlan().isPaid();
                    }
                }

                int limit;
                if ("HAIR_SWAP".equals(feature)) {
                    limit = isPaid ? 20 : 5;
                } else if ("FACE_SCAN".equals(feature)) {
                    limit = isPaid ? 5 : 1;
                } else {
                    limit = Integer.MAX_VALUE; // tính năng khác: không giới hạn
                }

                LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
                long todayCount = usageHistoryRepository.countTodayUsage(user.getId(), feature, startOfDay);

                log.info("Kiểm tra giới hạn dùng cho user [{}]: feature={}, used={}, limit={}, isPaid={}",
                        user.getEmail(), feature, todayCount, limit, isPaid);

                if (todayCount >= limit) {
                    throw new QuotaExceededException("Bạn đã hết lượt sử dụng tính năng này hôm nay.", limit);
                }
            } else {
                log.info("Bypass quota cho user [{}] (role={})", user.getEmail(), user.getRole());
            }

            UsageHistory history = UsageHistory.builder()
                    .user(user)
                    .feature(feature)
                    .usedAt(LocalDateTime.now())
                    .build();
            usageHistoryRepository.save(history);
            log.info("Đã ghi nhận (reserve) lượt sử dụng: user={}, feature={}, id={}", user.getEmail(), feature, history.getId());
            return history;
        }
    }

    /**
     * Hoàn lượt: xoá bản ghi UsageHistory vừa reserve khi bước xử lý sau đó thất bại (vd AI timeout, lỗi hệ thống).
     */
    @Transactional
    public void releaseUsage(UsageHistory reservation) {
        if (reservation == null || reservation.getId() == null) return;
        usageHistoryRepository.deleteById(reservation.getId());
        log.info("Đã hoàn lượt sử dụng: id={}", reservation.getId());
    }
}
