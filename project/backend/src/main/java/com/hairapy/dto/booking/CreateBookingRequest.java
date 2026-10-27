package com.hairapy.dto.booking;

import java.time.LocalDateTime;

public record CreateBookingRequest(
        Long salonId,
        Long hairstyleId,
        String tryOnImageUrl,
        String faceShape,
        LocalDateTime preferredTime,
        String customerName,
        String customerPhone,
        String note,
        Boolean consent
) {}
