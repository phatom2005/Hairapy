package com.hairapy.exceptions;

/**
 * Exception ném ra khi dịch vụ AI phản hồi quá lâu (quá thời gian timeout cấu hình).
 */
public class AiTimeoutException extends RuntimeException {
    public AiTimeoutException(String message) {
        super(message);
    }
}
