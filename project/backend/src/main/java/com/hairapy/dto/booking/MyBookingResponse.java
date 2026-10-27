package com.hairapy.dto.booking;

import com.hairapy.models.BookingStatus;
import java.time.LocalDateTime;

public record MyBookingResponse(
        Long id,
        Long salonId,
        String salonName,
        String salonAddress,
        String salonPhone,
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
        LocalDateTime createdAt
) {}
