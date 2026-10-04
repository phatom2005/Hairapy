package com.hairapy.dto.admin;

import java.time.LocalDateTime;

/**
 * DTO trả về thông tin chi tiết một lượt đánh giá cho Admin.
 */
public record AdminFeedbackResponse(
    Long id,
    String userEmail,
    String userName,
    Integer rating,
    String comment,
    String feature,
    LocalDateTime createdAt
) {}
