package com.hairapy.dto.admin;

import java.time.LocalDateTime;

/**
 * Số lượt dùng của 1 người dùng trong 1 ngày (giờ VN) — Phase 6.2.
 */
public record AdminUsageSummaryRow(
    Long userId,
    String userEmail,
    String userName,
    long faceScan,
    long hairSwap,
    long aiStylist,
    long total,
    LocalDateTime lastUsedAt
) {}
