package com.hairapy.dto.admin;

import com.hairapy.models.PaymentStatus;
import com.hairapy.models.SubscriptionPlan;

import java.time.LocalDateTime;

/**
 * DTO trả về thông tin chi tiết hóa đơn thanh toán cho Admin.
 */
public record AdminPaymentResponse(
    Long id,
    Long orderCode,
    Long userId,
    String userEmail,
    String userName,
    SubscriptionPlan plan,
    Integer amount,
    PaymentStatus status,
    String payosTransactionId,
    LocalDateTime createdAt,
    LocalDateTime paidAt,
    boolean subscriptionGranted
) {}
