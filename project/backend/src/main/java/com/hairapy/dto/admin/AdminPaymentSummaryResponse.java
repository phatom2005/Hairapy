package com.hairapy.dto.admin;

/**
 * DTO trả về tổng kết số liệu thanh toán theo bộ lọc cho Admin.
 */
public record AdminPaymentSummaryResponse(
    long totalAmountPaid,
    long paidCount,
    long pendingCount,
    long cancelledCount
) {}
