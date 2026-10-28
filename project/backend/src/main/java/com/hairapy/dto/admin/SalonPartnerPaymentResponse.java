package com.hairapy.dto.admin;

import java.time.LocalDateTime;

public record SalonPartnerPaymentResponse(
        Long id,
        Long salonId,
        Integer months,
        Integer amount,
        String note,
        String createdBy,
        LocalDateTime createdAt
) {}
