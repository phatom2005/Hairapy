package com.hairapy.dto.admin;

public record RecordSalonPartnerPaymentRequest(
        Integer months,
        Integer amount,
        String note
) {}
