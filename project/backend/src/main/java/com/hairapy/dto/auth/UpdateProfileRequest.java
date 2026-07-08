package com.hairapy.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/**
 * DTO yêu cầu cập nhật hồ sơ cá nhân (Settings page).
 */
public record UpdateProfileRequest(
    @NotBlank(message = "Họ và tên không được để trống")
    @Size(max = 100, message = "Họ và tên không được vượt quá 100 ký tự")
    String fullName,

    @Size(max = 20, message = "Số điện thoại không hợp lệ")
    String phone,

    @Past(message = "Ngày sinh phải là một ngày trong quá khứ")
    LocalDate dateOfBirth
) {}
