package com.hairapy.dto.salonowner;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public record SalonOwnerStatsResponse(
        long viewCount,
        Map<String, Long> bookingsByStatus,
        double completionRate,
        List<TopRequestedHairstyle> topRequestedHairstyles,
        LocalDateTime partnerUntil,
        long daysLeft,
        boolean partnerExpired
) {}
