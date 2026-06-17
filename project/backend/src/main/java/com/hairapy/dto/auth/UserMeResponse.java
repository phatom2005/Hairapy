package com.hairapy.dto.auth;

/**
 * DTO chứa thông tin phản hồi của người dùng hiện tại đang đăng nhập.
 */
public record UserMeResponse(
    String email,
    String role,
    String fullName
) {}
