package com.hairapy.dto.auth;

import jakarta.validation.constraints.NotBlank;

public record GoogleLoginRequest(
    @NotBlank(message = "accessToken không được để trống")
    String accessToken
) {}
