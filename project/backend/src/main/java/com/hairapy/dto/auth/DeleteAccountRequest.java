package com.hairapy.dto.auth;

/**
 * DTO yêu cầu xóa tài khoản người dùng.
 * Mật khẩu là tùy chọn trong payload (bắt buộc với tài khoản provider LOCAL).
 */
public record DeleteAccountRequest(
    String password
) {}
