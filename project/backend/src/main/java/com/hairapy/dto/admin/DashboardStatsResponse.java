package com.hairapy.dto.admin;

import java.util.List;

/**
 * DTO trả về số liệu thống kê tổng hợp hệ thống cho Admin Dashboard.
 */
public record DashboardStatsResponse(
    long totalUsers,
    long totalAdmins,
    long activeSubscriptions,    // status = ACTIVE && plan != FREE
    long totalScans,             // feature = "FACE_SCAN"
    long totalSwaps,             // feature = "HAIR_SWAP"
    long scansToday,
    long swapsToday,
    List<DailyUsageStat> dailyUsage,
    List<DailyUsageStat> registrationTrend,
    String granularity,

    // Thống kê doanh thu, giao dịch & đánh giá theo yêu cầu giảng viên
    long totalRevenue,              // tổng doanh thu mọi thời gian (VND, chỉ PAID)
    long revenueInPeriod,           // doanh thu trong kỳ period
    long totalTransactions,         // tổng số payment mọi trạng thái
    long paidTransactions,
    long pendingTransactions,
    long cancelledTransactions,
    long paidTransactionsInPeriod,
    List<DailyUsageStat> revenueTrend,   // label = ngày/tháng, count = doanh thu VND (tái dùng DailyUsageStat)
    long ratingCount,               // số lượt đánh giá
    long ratingTotalStars,          // TỔNG SỐ SAO (cộng dồn)
    double ratingAverage,           // làm tròn 1 chữ số, 0.0 nếu chưa có đánh giá (KHÔNG NaN)
    List<Long> ratingDistribution   // đúng 5 phần tử: số lượt 1★..5★, thiếu thì điền 0
) {}
