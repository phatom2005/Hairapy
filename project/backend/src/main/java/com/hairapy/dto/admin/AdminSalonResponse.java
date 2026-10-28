package com.hairapy.dto.admin;

import java.time.LocalDateTime;

/**
 * DTO quản trị salon cho Admin và Salon Owner portal.
 */
public record AdminSalonResponse(
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
    Integer stylePrice,
    Double distanceKm,
    String ownerEmail,
    LocalDateTime partnerUntil,
    boolean active,
    long viewCount
) {}
