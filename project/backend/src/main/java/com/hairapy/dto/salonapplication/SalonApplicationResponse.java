package com.hairapy.dto.salonapplication;

import com.hairapy.models.ApplicationStatus;
import java.time.LocalDateTime;

public record SalonApplicationResponse(
        Long id,
        Long userId,
        String userEmail,
        String salonName,
        String address,
        String district,
        String phone,
        String message,
        ApplicationStatus status,
        String adminNote,
        LocalDateTime createdAt
) {}
