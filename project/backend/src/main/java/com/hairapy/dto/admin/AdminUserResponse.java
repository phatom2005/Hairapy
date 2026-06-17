package com.hairapy.dto.admin;

import java.time.LocalDateTime;

public record AdminUserResponse(
    Long id,
    String email,
    String fullName,
    String role,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {}
