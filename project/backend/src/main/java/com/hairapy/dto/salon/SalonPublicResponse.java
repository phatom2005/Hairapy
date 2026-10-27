package com.hairapy.dto.salon;

/**
 * DTO dữ liệu công khai của salon cho khách và mobile app.
 * App mobile đang dùng chung — response của GET /api/salons giữ nguyên mảng JSON,
 * giữ nguyên tên field cũ (id, name, address, district, serviceTypes, priceFrom, rating, verified, imageUrl, phone, latitude, longitude),
 * chỉ thêm các field mới (description, partner, stylePrice, distanceKm).
 */
public record SalonPublicResponse(
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
    Double distanceKm
) {}
