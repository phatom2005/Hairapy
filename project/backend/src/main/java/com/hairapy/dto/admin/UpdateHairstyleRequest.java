package com.hairapy.dto.admin;

public record UpdateHairstyleRequest(
    String name,
    String tag,
    String faceShape,
    String hairLength,
    String description,
    String imageUrl,
    Boolean premiumOnly
) {}
