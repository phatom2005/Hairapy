package com.hairapy.dto.salonapplication;

public record CreateSalonApplicationRequest(
        String salonName,
        String address,
        String district,
        String phone,
        String message
) {}
