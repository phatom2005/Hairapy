package com.hairapy.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Yêu cầu báo cáo nội dung do AI tạo ra.
 * reason: INAPPROPRIATE | DISTORTED | PRIVACY | OTHER.
 */
public record AiReportRequest(
    @NotBlank(message = "Vui lòng chọn lý do báo cáo")
    String reason,

    @Size(max = 500, message = "Mô tả tối đa 500 ký tự")
    String comment,

    @Size(max = 500, message = "Đường dẫn ảnh quá dài")
    String imageUrl,

    Long hairstyleId,

    String feature
) {}
