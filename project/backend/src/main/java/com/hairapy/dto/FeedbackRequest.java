package com.hairapy.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Yêu cầu gửi đánh giá dịch vụ từ người dùng.
 */
public record FeedbackRequest(
    @NotNull(message = "Số sao đánh giá không được để trống")
    @Min(value = 1, message = "Số sao đánh giá từ 1 đến 5")
    @Max(value = 5, message = "Số sao đánh giá từ 1 đến 5")
    Integer rating,

    @Size(max = 500, message = "Nhận xét tối đa 500 ký tự")
    String comment,

    String feature
) {}
