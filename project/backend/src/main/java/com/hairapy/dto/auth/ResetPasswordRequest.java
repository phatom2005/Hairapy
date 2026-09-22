package com.hairapy.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
    @NotBlank(message = "Token không được để trống")
    String token,

    @NotBlank(message = "Mật khẩu mới không được để trống")
    @Size(min = 8, message = "Mật khẩu phải có ít nhất 8 ký tự")
    String newPassword,

    @NotBlank(message = "Vui lòng xác nhận mật khẩu mới")
    String confirmPassword
) {}
