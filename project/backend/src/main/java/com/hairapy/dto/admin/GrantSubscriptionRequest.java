package com.hairapy.dto.admin;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

/**
 * Request cho admin cấp/gia hạn gói dịch vụ thủ công cho 1 user (theo email).
 * days = null -> dùng mặc định theo plan (PRO=7 ngày, PREMIUM=30 ngày).
 */
public record GrantSubscriptionRequest(
        @NotBlank @Email String email,
        @NotBlank String plan,
        @Positive Integer days
) {}
