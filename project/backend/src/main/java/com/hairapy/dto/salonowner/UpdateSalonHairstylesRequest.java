package com.hairapy.dto.salonowner;

public record UpdateSalonHairstylesRequest(
        Long hairstyleId,
        Integer price
) {}
