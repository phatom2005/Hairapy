package com.hairapy.dto.admin;

import java.time.LocalDateTime;

public record AdminSubscriptionResponse(
    Long id,
    Long userId,
    String userEmail,
    String userName,
    String plan,
    String status,
    LocalDateTime startDate,
    LocalDateTime endDate,
    LocalDateTime createdAt
) {}
