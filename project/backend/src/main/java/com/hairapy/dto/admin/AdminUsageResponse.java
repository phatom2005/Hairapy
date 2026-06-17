package com.hairapy.dto.admin;

import java.time.LocalDateTime;

public record AdminUsageResponse(
    Long id,
    Long userId,
    String userEmail,
    String feature,
    LocalDateTime usedAt
) {}
