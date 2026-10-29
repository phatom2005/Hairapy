package com.hairapy.controllers.admin;

import com.hairapy.dto.insight.WeeklyInsightResponse;
import com.hairapy.services.InsightDigestService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Controller cung cấp báo cáo insight hàng tuần cho trang quản trị Admin.
 */
@RestController
@RequestMapping("/api/admin/insights")
@RequiredArgsConstructor
public class AdminInsightDigestController {

    private final InsightDigestService insightDigestService;

    @GetMapping("/weekly")
    public ResponseEntity<WeeklyInsightResponse> getWeeklyDigest() {
        return ResponseEntity.ok(insightDigestService.getLatestDigest());
    }

    @PostMapping("/weekly/refresh")
    public ResponseEntity<WeeklyInsightResponse> refreshWeeklyDigest() {
        return ResponseEntity.ok(insightDigestService.refreshDigest());
    }
}
