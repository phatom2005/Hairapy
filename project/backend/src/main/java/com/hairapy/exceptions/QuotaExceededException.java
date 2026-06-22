package com.hairapy.exceptions;

import lombok.Getter;

/**
 * Exception ném ra khi người dùng vượt quá hạn mức sử dụng (quota) hàng ngày.
 */
@Getter
public class QuotaExceededException extends RuntimeException {
    private final long limit;

    public QuotaExceededException(String message, long limit) {
        super(message);
        this.limit = limit;
    }
}
