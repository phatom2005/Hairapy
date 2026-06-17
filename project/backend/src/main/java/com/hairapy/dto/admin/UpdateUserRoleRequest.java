package com.hairapy.dto.admin;

import jakarta.validation.constraints.NotBlank;

public record UpdateUserRoleRequest(
    @NotBlank String role  // "USER" hoặc "ADMIN"
) {}
