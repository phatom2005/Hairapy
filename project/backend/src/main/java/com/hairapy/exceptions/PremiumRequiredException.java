package com.hairapy.exceptions;

/** Ném ra khi user Free cố thử kiểu tóc premiumOnly. */
public class PremiumRequiredException extends RuntimeException {
    public PremiumRequiredException(String message) {
        super(message);
    }
}
