package com.hairapy.dto.insight;

import java.time.LocalDateTime;

public record TrendingStyleResponse(
        Long hairstyleId,
        String name,
        String imageUrl,
        Double growthPct,
        Double score,
        String source,
        LocalDateTime generatedAt
) {}

