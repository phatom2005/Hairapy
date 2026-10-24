package com.hairapy.dto.admin;

import java.time.LocalDateTime;

public record AdminCatalogItemResponse(
    Long id,
    String name,
    String tag,
    String faceShape,
    String hairLength,
    String description,
    String imageUrl,
    boolean premiumOnly,
    String gender,
    Integer ailabHairType,
    String ailabProStyle,
    boolean active,
    long savedCount,
    LocalDateTime createdAt
) {}
