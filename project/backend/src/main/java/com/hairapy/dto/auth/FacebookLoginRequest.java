package com.hairapy.dto.auth;

import jakarta.validation.constraints.NotBlank;

public record FacebookLoginRequest(
        @NotBlank(message = "Facebook access token không được để trống")
        String accessToken
) {}
