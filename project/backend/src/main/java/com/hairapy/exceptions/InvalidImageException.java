package com.hairapy.exceptions;

/**
 * Ảnh người dùng gửi không đạt yêu cầu của dịch vụ AI (không thấy mặt, mặt quá nhỏ/nghiêng...).
 * Đây là lỗi do ĐẦU VÀO của user (không phải lỗi hệ thống) → controller trả 422 kèm thông điệp
 * thân thiện và hoàn lượt, thay vì 500 chung chung.
 */
public class InvalidImageException extends RuntimeException {
    public InvalidImageException(String message) {
        super(message);
    }
}
