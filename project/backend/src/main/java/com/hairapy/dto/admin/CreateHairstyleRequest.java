package com.hairapy.dto.admin;

import jakarta.validation.constraints.NotBlank;

public record CreateHairstyleRequest(
    @NotBlank String name,
    String tag,
    String faceShape,
    String hairLength,
    String description,
    @NotBlank String imageUrl,
    boolean premiumOnly
) {}
