package com.hairapy.dto.salonowner;

public record SalonOwnerHairstyleResponse(
        Long hairstyleId,
        String name,
        String imageUrl,
        String gender,
        String length,
        boolean offered,
        Integer price
) {}
