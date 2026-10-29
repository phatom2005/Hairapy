package com.hairapy.dto.salonowner;

import com.hairapy.dto.insight.TrendingStyleResponse;

import java.util.List;

public record SalonOwnerInsightsResponse(
        String city,
        String district,
        List<TrendingStyleResponse> topTriedInCity,
        List<DistrictRequestedHairstyle> topRequestedInDistrict,
        List<TrendingStyleResponse> missingHotStyles,
        List<HourCount> peakHours,
        SalonFunnel funnel
) {
    public record DistrictRequestedHairstyle(String hairstyleName, long count) {}
    public record HourCount(int hour, long count) {}
    // impression = null khi không có GA (không có nguồn dữ liệu thật -> không bịa số)
    public record SalonFunnel(Long impression, long click, long bookingSubmit, long confirmed, long completed) {}
}

