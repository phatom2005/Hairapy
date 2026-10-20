package com.hairapy.controllers.admin;

import com.hairapy.services.GaReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Số liệu Google Analytics 4 cho dashboard admin (nguồn truy cập, MXH, sự kiện, phễu).
 * Chỉ ADMIN truy cập được (SecurityConfig: /api/admin/** yêu cầu role ADMIN).
 */
@RestController
@RequestMapping("/api/admin/ga")
@RequiredArgsConstructor
public class AdminGaController {

    private final GaReportService gaReportService;

    @GetMapping
    public ResponseEntity<GaReportService.GaSnapshot> get(
            @RequestParam(defaultValue = "30") int days,
            @RequestParam(defaultValue = "false") boolean refresh) {
        return ResponseEntity.ok(gaReportService.getSnapshot(days, refresh));
    }

    /** Số người đang online (30 phút qua), cache 30 giây. */
    @GetMapping("/realtime")
    public ResponseEntity<GaReportService.RealtimeSnapshot> realtime() {
        return ResponseEntity.ok(gaReportService.getRealtime());
    }
}
