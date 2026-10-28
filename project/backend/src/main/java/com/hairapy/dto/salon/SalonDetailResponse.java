package com.hairapy.dto.salon;

import java.util.List;

public record SalonDetailResponse(
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
        boolean partner,
        long viewCount,
        List<SalonHairstyleItem> hairstyles
) {}
