package com.hairapy.dto.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Body khi admin xác nhận thủ công 1 giao dịch đã thanh toán (bắt buộc ghi chú để đối soát sau này). */
public record MarkPaidRequest(@NotBlank @Size(max = 200) String note) {}
