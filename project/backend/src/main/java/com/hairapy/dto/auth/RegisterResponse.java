package com.hairapy.dto.auth;

/**
 * Phản hồi đăng ký: KHÔNG trả JWT — user phải xác minh email rồi mới đăng nhập được.
 */
public record RegisterResponse(
    String email,
    String message
) {}
