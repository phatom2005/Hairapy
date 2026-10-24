package com.hairapy.dto.admin;

import com.hairapy.controllers.SwapHistoryController.SwapHistoryItem;
import com.hairapy.dto.UsageSummaryResponse;

import java.util.List;

public record AdminUserOverviewResponse(
    AdminUserResponse user,
    List<AdminSubscriptionResponse> subscriptions,
    List<AdminPaymentResponse> recentPayments,
    UsageSummaryResponse todayUsage,
    List<SwapHistoryItem> recentSwaps
) {}
