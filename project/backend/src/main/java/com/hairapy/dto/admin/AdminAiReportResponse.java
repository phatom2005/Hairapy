package com.hairapy.dto.admin;

import java.time.LocalDateTime;

/**
 * DTO trả về một báo cáo nội dung AI cho Admin.
 */
public record AdminAiReportResponse(
    Long id,
    String userEmail,
    String userName,
    String feature,
    String reason,
    String comment,
    String imageUrl,
    Long hairstyleId,
    String status,
    LocalDateTime createdAt
) {}
