package com.hairapy.dto.insight;

import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO dữ liệu báo cáo insight hàng tuần cho admin và team sản phẩm.
 */
public record WeeklyInsightResponse(
        String period,
        LocalDateTime generatedAt,
        MetricComparison users,
        MetricComparison scans,
        MetricComparison swaps,
        MetricComparison saves,
        RevenueComparison revenue,
        MetricComparison bookings,
        List<FunnelStep> funnel,
        List<TrendingStyleResponse> topTrending,
        List<ErrorItem> topErrors,
        List<ChannelItem> topChannels,
        List<AnomalyAlert> anomalies,
        String aiSummary,
        boolean aiGenerated
) {
    public record MetricComparison(
            long lastWeek,
            long prevWeek,
            double changePercent,
            String anomaly // "UP", "DOWN", "STABLE"
    ) {}

    public record RevenueComparison(
            long customerLastWeek,
            long customerPrevWeek,
            long salonLastWeek,
            long salonPrevWeek,
            long totalLastWeek,
            long totalPrevWeek,
            double changePercent,
            String anomaly // "UP", "DOWN", "STABLE"
    ) {}

    public record FunnelStep(
            String step,
            String label,
            long lastWeekCount,
            long prevWeekCount,
            double conversionRate
    ) {}

    public record ErrorItem(
            String errorType,
            String page,
            long count
    ) {}

    public record ChannelItem(
            String channel,
            long newUsers
    ) {}

    public record AnomalyAlert(
            String metric,
            String direction, // "UP", "DOWN"
            double changePercent,
            String note
    ) {}
}
