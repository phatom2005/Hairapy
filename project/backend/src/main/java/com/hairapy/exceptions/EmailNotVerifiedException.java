package com.hairapy.exceptions;

/**
 * Ném khi user đăng nhập đúng mật khẩu nhưng chưa xác minh email.
 * GlobalExceptionHandler map sang 403 kèm code EMAIL_NOT_VERIFIED để frontend hiện nút gửi lại.
 */
public class EmailNotVerifiedException extends RuntimeException {
    public EmailNotVerifiedException(String message) {
        super(message);
    }
}
