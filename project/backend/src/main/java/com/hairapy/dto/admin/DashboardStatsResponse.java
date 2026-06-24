package com.hairapy.dto.admin;

import java.util.List;

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
    String granularity
) {}
