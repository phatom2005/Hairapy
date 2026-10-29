package com.hairapy.controllers.admin;

import com.hairapy.dto.admin.ExperimentResponse;
import com.hairapy.services.ExperimentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Controller truy xuất kết quả thử nghiệm A/B dành cho Admin (/api/admin/experiments/**).
 * Yêu cầu role ADMIN (SecurityConfig: /api/admin/**).
 */
@RestController
@RequestMapping("/api/admin/experiments")
@RequiredArgsConstructor
public class AdminExperimentController {

    private final ExperimentService experimentService;

    @GetMapping("/{name}")
    public ResponseEntity<ExperimentResponse> getExperiment(
            @PathVariable String name,
            @RequestParam(defaultValue = "30") int days,
            @RequestParam(defaultValue = "false") boolean onlyVietnam) {
        return ResponseEntity.ok(experimentService.getExperimentResults(name, days, onlyVietnam));
    }
}

