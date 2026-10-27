package com.hairapy.dto.salonowner;

import com.hairapy.models.BookingStatus;

public record UpdateBookingStatusRequest(
        BookingStatus status,
        String salonNote
) {}
