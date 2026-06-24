package com.hairapy.controllers.admin;

import com.hairapy.dto.admin.DailyUsageStat;
import com.hairapy.dto.admin.DashboardStatsResponse;
import com.hairapy.models.Role;
import com.hairapy.models.SubscriptionPlan;
import com.hairapy.models.SubscriptionStatus;
import com.hairapy.repositories.SubscriptionRepository;
import com.hairapy.repositories.UsageHistoryRepository;
import com.hairapy.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Controller quản trị cung cấp API thống kê tổng hợp hệ thống.
 */
@RestController
@RequestMapping("/api/admin/dashboard")
@RequiredArgsConstructor
public class AdminDashboardController {

    private final UserRepository userRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final UsageHistoryRepository usageHistoryRepository;

    /**
     * Lấy dữ liệu thống kê tổng quan cho trang chủ quản trị có lọc theo period.
     */
    @GetMapping("/stats")
    public ResponseEntity<DashboardStatsResponse> getStats(@RequestParam(defaultValue = "30d") String period) {
        long totalUsers = userRepository.count();
        long totalAdmins = userRepository.countByRole(Role.ADMIN);

        long activeSubs = subscriptionRepository.countByStatusAndPlan(SubscriptionStatus.ACTIVE, SubscriptionPlan.PRO)
                + subscriptionRepository.countByStatusAndPlan(SubscriptionStatus.ACTIVE, SubscriptionPlan.PREMIUM);

        long totalScans = usageHistoryRepository.countByFeature("FACE_SCAN");
        long totalSwaps = usageHistoryRepository.countByFeature("HAIR_SWAP");

        LocalDateTime todayStart = LocalDate.now().atStartOfDay();
        long scansToday = usageHistoryRepository.countByFeatureSince("FACE_SCAN", todayStart);
        long swapsToday = usageHistoryRepository.countByFeatureSince("HAIR_SWAP", todayStart);

        // Tính thời gian bắt đầu (since) và tần suất dữ liệu (daily hay monthly)
        LocalDateTime since;
        boolean isDaily = true;
        if ("7d".equalsIgnoreCase(period)) {
            since = LocalDate.now().minusDays(7).atStartOfDay();
        } else if ("90d".equalsIgnoreCase(period)) {
            since = LocalDate.now().minusDays(90).atStartOfDay();
        } else if ("1y".equalsIgnoreCase(period)) {
            since = LocalDate.now().minusYears(1).atStartOfDay();
            isDaily = false;
        } else { // mặc định 30d
            since = LocalDate.now().minusDays(30).atStartOfDay();
        }

        List<Object[]> rawUsage;
        List<Object[]> rawReg;
        String granularity;

        if (isDaily) {
            rawUsage = usageHistoryRepository.countDailyUsageSince(since);
            rawReg = userRepository.countDailyRegistrationsSince(since);
            granularity = "day";
        } else {
            rawUsage = usageHistoryRepository.countMonthlyUsageSince(since);
            rawReg = userRepository.countMonthlyRegistrationsSince(since);
            granularity = "month";
        }

        List<DailyUsageStat> dailyUsage = rawUsage.stream()
                .map(row -> new DailyUsageStat(
                        row[0] != null ? row[0].toString() : "",
                        row[1] != null ? ((Number) row[1]).longValue() : 0L
                ))
                .collect(Collectors.toList());

        List<DailyUsageStat> registrationTrend = rawReg.stream()
                .map(row -> new DailyUsageStat(
                        row[0] != null ? row[0].toString() : "",
                        row[1] != null ? ((Number) row[1]).longValue() : 0L
                ))
                .collect(Collectors.toList());

        DashboardStatsResponse stats = new DashboardStatsResponse(
                totalUsers,
                totalAdmins,
                activeSubs,
                totalScans,
                totalSwaps,
                scansToday,
                swapsToday,
                dailyUsage,
                registrationTrend,
                granularity
        );

        return ResponseEntity.ok(stats);
    }
}
