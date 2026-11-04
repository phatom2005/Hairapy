package com.hairapy.controllers.admin;

import com.hairapy.dto.admin.DailyUsageStat;
import com.hairapy.dto.admin.DashboardStatsResponse;
import com.hairapy.dto.admin.FeatureRating;
import com.hairapy.models.FeedbackFeature;
import com.hairapy.models.PaymentStatus;
import com.hairapy.models.Role;
import com.hairapy.models.SubscriptionPlan;
import com.hairapy.models.SubscriptionStatus;
import com.hairapy.repositories.FeedbackRepository;
import com.hairapy.repositories.PaymentRepository;
import com.hairapy.repositories.SubscriptionRepository;
import com.hairapy.repositories.UsageHistoryRepository;
import com.hairapy.repositories.UserRepository;
import com.hairapy.utils.VnTime;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
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
    private final PaymentRepository paymentRepository;
    private final FeedbackRepository feedbackRepository;
    private final com.hairapy.repositories.SalonRepository salonRepository;
    private final com.hairapy.repositories.SalonPartnerPaymentRepository salonPartnerPaymentRepository;
    private final com.hairapy.repositories.BookingRequestRepository bookingRequestRepository;

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

        LocalDateTime todayStart = VnTime.startOfTodayVn();
        long scansToday = usageHistoryRepository.countByFeatureSince("FACE_SCAN", todayStart);
        long swapsToday = usageHistoryRepository.countByFeatureSince("HAIR_SWAP", todayStart);

        // Tính thời gian bắt đầu (since) và tần suất dữ liệu (daily hay monthly)
        LocalDateTime since;
        boolean isDaily = true;
        if ("7d".equalsIgnoreCase(period)) {
            since = VnTime.startOfDayVn(VnTime.todayVn().minusDays(7));
        } else if ("90d".equalsIgnoreCase(period)) {
            since = VnTime.startOfDayVn(VnTime.todayVn().minusDays(90));
        } else if ("1y".equalsIgnoreCase(period)) {
            since = VnTime.startOfDayVn(VnTime.todayVn().minusYears(1));
            isDaily = false;
        } else { // mặc định 30d
            since = VnTime.startOfDayVn(VnTime.todayVn().minusDays(30));
        }

        List<Object[]> rawUsage;
        List<Object[]> rawReg;
        List<Object[]> rawRev;
        String granularity;

        if (isDaily) {
            rawUsage = usageHistoryRepository.countDailyUsageSince(since);
            rawReg = userRepository.countDailyRegistrationsSince(since);
            rawRev = paymentRepository.sumDailyRevenueSince(since);
            granularity = "day";
        } else {
            rawUsage = usageHistoryRepository.countMonthlyUsageSince(since);
            rawReg = userRepository.countMonthlyRegistrationsSince(since);
            rawRev = paymentRepository.sumMonthlyRevenueSince(since);
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

        List<DailyUsageStat> revenueTrend = rawRev.stream()
                .map(row -> new DailyUsageStat(
                        row[0] != null ? row[0].toString() : "",
                        row[1] != null ? ((Number) row[1]).longValue() : 0L
                ))
                .collect(Collectors.toList());

        // Doanh thu và giao dịch
        long totalRevenue = paymentRepository.sumPaidAmount();
        long revenueInPeriod = paymentRepository.sumPaidAmountSince(since);
        long paidTransactions = paymentRepository.countByStatus(PaymentStatus.PAID);
        long pendingTransactions = paymentRepository.countByStatus(PaymentStatus.PENDING);
        long cancelledTransactions = paymentRepository.countByStatus(PaymentStatus.CANCELLED);
        long totalTransactions = paymentRepository.count();
        long paidTransactionsInPeriod = paymentRepository.countPaidSince(since);

        // Đánh giá sao (Feedback)
        long ratingCount = feedbackRepository.count();
        long ratingTotalStars = feedbackRepository.sumRating();
        double ratingAverage = ratingCount == 0 ? 0.0 : Math.round((ratingTotalStars * 10.0) / ratingCount) / 10.0;

        long[] dist = new long[5];
        List<Object[]> rawRatingDist = feedbackRepository.countByRating();
        for (Object[] row : rawRatingDist) {
            if (row[0] != null && row[1] != null) {
                int star = ((Number) row[0]).intValue();
                long count = ((Number) row[1]).longValue();
                if (star >= 1 && star <= 5) {
                    dist[star - 1] = count;
                }
            }
        }
        List<Long> ratingDistribution = List.of(dist[0], dist[1], dist[2], dist[3], dist[4]);

        // Đánh giá theo kỳ + kỳ liền trước cùng độ dài (để so sánh tăng/giảm)
        LocalDateTime nowVn = VnTime.nowVn();
        LocalDateTime farFuture = nowVn.plusYears(100); // không chặn trên cho kỳ hiện tại
        LocalDateTime prevSince = since.minus(Duration.between(since, nowVn));
        long[] cur = countAndSum(feedbackRepository.countAndSumBetween(since, farFuture));
        long[] prev = countAndSum(feedbackRepository.countAndSumBetween(prevSince, since));
        long ratingCountInPeriod = cur[0];
        double ratingAverageInPeriod = avg1(cur[1], cur[0]);
        long ratingCountPrevPeriod = prev[0];
        double ratingAveragePrevPeriod = avg1(prev[1], prev[0]);

        long[] distInPeriod = new long[5];
        for (Object[] row : feedbackRepository.countByRatingSince(since)) {
            if (row[0] != null && row[1] != null) {
                int star = ((Number) row[0]).intValue();
                if (star >= 1 && star <= 5) {
                    distInPeriod[star - 1] = ((Number) row[1]).longValue();
                }
            }
        }
        List<Long> ratingDistributionInPeriod = List.of(
                distInPeriod[0], distInPeriod[1], distInPeriod[2], distInPeriod[3], distInPeriod[4]);

        java.util.Map<String, long[]> byFeature = new java.util.HashMap<>();
        for (Object[] row : feedbackRepository.statsByFeatureSince(since)) {
            if (row[0] == null) continue;
            String key = row[0] instanceof FeedbackFeature ff ? ff.name() : row[0].toString();
            byFeature.put(key, new long[]{
                    row[1] != null ? ((Number) row[1]).longValue() : 0L,
                    row[2] != null ? ((Number) row[2]).longValue() : 0L});
        }
        List<FeatureRating> ratingByFeature = java.util.Arrays.stream(
                        new FeedbackFeature[]{FeedbackFeature.HAIR_SWAP, FeedbackFeature.FACE_SCAN, FeedbackFeature.GENERAL})
                .map(f -> {
                    long[] v = byFeature.getOrDefault(f.name(), new long[]{0L, 0L});
                    return new FeatureRating(f.name(), v[0], avg1(v[1], v[0]));
                })
                .collect(Collectors.toList());

        // Thống kê Salon đối tác
        LocalDateTime now = LocalDateTime.now();
        long activePartnerSalons = salonRepository.countByActiveTrueAndPartnerUntilAfter(now);
        long salonRevenue = salonPartnerPaymentRepository.sumAmountSince(since);
        long bookingsInPeriod = bookingRequestRepository.countByCreatedAtBetween(since, now);
        long completedBookingsInPeriod = bookingRequestRepository.countByStatusAndCreatedAtBetween(
                com.hairapy.models.BookingStatus.COMPLETED, since, now);
        long swapsInPeriod = usageHistoryRepository.countByFeatureSince("HAIR_SWAP", since);
        double tryOnToBookingRate = swapsInPeriod > 0
                ? Math.round(((double) bookingsInPeriod / swapsInPeriod * 100.0) * 10.0) / 10.0
                : 0.0;

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
                granularity,
                totalRevenue,
                revenueInPeriod,
                totalTransactions,
                paidTransactions,
                pendingTransactions,
                cancelledTransactions,
                paidTransactionsInPeriod,
                revenueTrend,
                ratingCount,
                ratingTotalStars,
                ratingAverage,
                ratingDistribution,
                activePartnerSalons,
                salonRevenue,
                bookingsInPeriod,
                completedBookingsInPeriod,
                tryOnToBookingRate,
                ratingCountInPeriod,
                ratingAverageInPeriod,
                ratingCountPrevPeriod,
                ratingAveragePrevPeriod,
                ratingDistributionInPeriod,
                ratingByFeature
        );

        return ResponseEntity.ok(stats);
    }

    /** Đọc dòng [count, sum] của query tổng hợp; rỗng/null → {0, 0}. */
    private static long[] countAndSum(List<Object[]> rows) {
        if (rows == null || rows.isEmpty() || rows.get(0) == null) return new long[]{0L, 0L};
        Object[] r = rows.get(0);
        long c = r.length > 0 && r[0] != null ? ((Number) r[0]).longValue() : 0L;
        long s = r.length > 1 && r[1] != null ? ((Number) r[1]).longValue() : 0L;
        return new long[]{c, s};
    }

    /** Trung bình làm tròn 1 chữ số; không có lượt nào → 0.0 (tránh NaN). */
    private static double avg1(long totalStars, long count) {
        return count == 0 ? 0.0 : Math.round((totalStars * 10.0) / count) / 10.0;
    }
}
