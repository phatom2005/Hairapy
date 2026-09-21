package com.hairapy.dto;

/**
 * DTO trả về quota hiện tại của user cho FE hiển thị "còn X/Y lượt hôm nay".
 */
public record UsageSummaryResponse(
        FeatureUsage faceScan,
        FeatureUsage hairSwap
) {
    public record FeatureUsage(long used, long limit, boolean unlimited) {}
}
