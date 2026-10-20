package com.hairapy.controllers.admin;

import com.hairapy.services.QuotaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Hạn mức còn lại của dịch vụ bên thứ 3 (AILabTools, Cloudinary) cho dashboard admin.
 * Chỉ ADMIN truy cập được (SecurityConfig: /api/admin/** yêu cầu role ADMIN).
 */
@RestController
@RequestMapping("/api/admin/quota")
@RequiredArgsConstructor
public class AdminQuotaController {

    private final QuotaService quotaService;

    @GetMapping
    public ResponseEntity<QuotaService.QuotaSnapshot> getQuota(@RequestParam(defaultValue = "false") boolean refresh) {
        return ResponseEntity.ok(quotaService.getSnapshot(refresh));
    }
}
