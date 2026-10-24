package com.hairapy.dto;

import java.time.LocalDateTime;

/** Một dòng trong lịch sử thanh toán của chính khách hàng (GET /api/payments/my). */
public record MyPaymentResponse(
        Long orderCode,
        String plan,
        Integer amount,
        String status,
        LocalDateTime createdAt,
        LocalDateTime paidAt
) {}
