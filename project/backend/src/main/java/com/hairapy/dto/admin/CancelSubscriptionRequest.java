package com.hairapy.dto.admin;

import jakarta.validation.constraints.Size;

/** Body tuỳ chọn khi admin huỷ gói: lý do (chỉ ghi log, chưa lưu DB). */
public record CancelSubscriptionRequest(@Size(max = 200) String reason) {}
