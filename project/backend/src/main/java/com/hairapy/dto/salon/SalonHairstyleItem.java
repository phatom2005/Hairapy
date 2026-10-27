package com.hairapy.dto.salon;

public record SalonHairstyleItem(
        Long id,
        String name,
        String imageUrl,
        Integer price
) {}
