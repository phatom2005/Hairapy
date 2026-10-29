package com.hairapy.dto.insight;

import java.time.LocalDateTime;

public record FaceShapeStyleResponse(
        Long hairstyleId,
        String name,
        String imageUrl,
        Long tries,
        String source,
        LocalDateTime generatedAt
) {}

