package com.hairapy.dto;

import com.hairapy.models.ScanHistory;

import java.time.LocalDateTime;

/**
 * DTO response cho lịch sử quét khuôn mặt — KHÔNG bao gồm thông tin User
 * (tránh lộ password hash khi serialize entity ScanHistory.user trực tiếp).
 */
public record ScanHistoryResponse(
        Long id,
        String faceShape,
        String imageUrl,
        String hairType,
        LocalDateTime createdAt
) {
    public static ScanHistoryResponse from(ScanHistory h) {
        return new ScanHistoryResponse(
                h.getId(), h.getFaceShape(), h.getImageUrl(), h.getHairType(), h.getCreatedAt()
        );
    }
}
