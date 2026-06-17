package com.hairapy.dto.auth;

/**
 * DTO phản hồi kết quả đăng nhập / đăng ký thành công.
 */
public record AuthResponse(
    String token,
    String email,
    String role,
    String fullName
) {}
