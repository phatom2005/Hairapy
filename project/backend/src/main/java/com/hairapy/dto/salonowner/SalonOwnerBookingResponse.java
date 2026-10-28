package com.hairapy.dto.salonowner;

import com.hairapy.models.BookingStatus;
import java.time.LocalDateTime;

public record SalonOwnerBookingResponse(
        Long id,
        String customerName,
        String customerPhone,
        Long hairstyleId,
        String hairstyleName,
        String tryOnImageUrl,
        String faceShape,
        LocalDateTime preferredTime,
        String note,
        BookingStatus status,
        String salonNote,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
