package com.hairapy.dto.admin;

import com.hairapy.models.BookingStatus;
import java.time.LocalDateTime;

public record AdminBookingResponse(
        Long id,
        Long userId,
        String userEmail,
        Long salonId,
        String salonName,
        Long hairstyleId,
        String hairstyleName,
        String tryOnImageUrl,
        String faceShape,
        LocalDateTime preferredTime,
        String customerName,
        String customerPhone,
        String note,
        BookingStatus status,
        String salonNote,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
