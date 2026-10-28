package com.hairapy.dto.salonowner;

import java.time.LocalDateTime;

public record SalonOwnerProfileResponse(
        Long id,
        String name,
        String address,
        String district,
        String serviceTypes,
        Integer priceFrom,
        Double rating,
        boolean verified,
        String imageUrl,
        String phone,
        Double latitude,
        Double longitude,
        String description,
        boolean active,
        long viewCount,
        LocalDateTime partnerUntil,
        long daysLeft,
        boolean partnerExpired
) {}
