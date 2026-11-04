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
    List<Long> ratingDistribution,  // đúng 5 phần tử: số lượt 1★..5★, thiếu thì điền 0

    // Thống kê mảng Salon đối tác (Phase 4)
    long activePartnerSalons,        // số salon đang có hạn đối tác active
    long salonRevenue,              // doanh thu từ salon đối tác trong kỳ (VND, mô phỏng)
    long bookingsInPeriod,          // số yêu cầu đặt lịch tạo trong kỳ
    long completedBookingsInPeriod, // số yêu cầu đặt lịch đã hoàn thành trong kỳ
    double tryOnToBookingRate,      // tỉ lệ đặt lịch / lượt thử tóc trong kỳ (%)

    // Đánh giá theo kỳ (Phase 8) — chỉ THÊM vào cuối, không đổi field cũ
    long ratingCountInPeriod,               // số lượt đánh giá trong kỳ
    double ratingAverageInPeriod,           // điểm TB trong kỳ, 0.0 nếu chưa có
    long ratingCountPrevPeriod,             // số lượt ở kỳ liền trước cùng độ dài
    double ratingAveragePrevPeriod,         // điểm TB kỳ trước, 0.0 nếu chưa có
    List<Long> ratingDistributionInPeriod,  // đúng 5 phần tử: 1★..5★ trong kỳ
    List<FeatureRating> ratingByFeature     // luôn đủ 3 tính năng HAIR_SWAP, FACE_SCAN, GENERAL
) {}
