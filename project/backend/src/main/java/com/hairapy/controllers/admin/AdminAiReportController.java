package com.hairapy.controllers.admin;

import com.hairapy.dto.admin.AdminAiReportResponse;
import com.hairapy.models.AiContentReport;
import com.hairapy.models.AiReportStatus;
import com.hairapy.repositories.AiContentReportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Admin xem và đánh dấu đã xử lý các báo cáo nội dung do AI tạo ra.
 */
@RestController
@RequestMapping("/api/admin/ai-reports")
@RequiredArgsConstructor
public class AdminAiReportController {

    private final AiContentReportRepository reportRepository;

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<?> list(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), 50),
                Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<AiContentReport> result;
        if (status != null && !status.isBlank()) {
            AiReportStatus parsed;
            try {
                parsed = AiReportStatus.valueOf(status.trim().toUpperCase());
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().body(Map.of("error", "Trạng thái lọc không hợp lệ"));
            }
            result = reportRepository.findAllByStatusWithUser(parsed, pageable);
        } else {
            result = reportRepository.findAllWithUser(pageable);
        }

        return ResponseEntity.ok(result.map(r -> new AdminAiReportResponse(
                r.getId(),
                r.getUser() != null ? r.getUser().getEmail() : null,
                r.getUser() != null ? r.getUser().getFullName() : null,
                r.getFeature().name(),
                r.getReason().name(),
                r.getComment(),
                r.getImageUrl(),
                r.getHairstyleId(),
                r.getStatus().name(),
                r.getCreatedAt())));
    }

    /** Đánh dấu một báo cáo đã xử lý. */
    @PostMapping("/{id}/resolve")
    @Transactional
    public ResponseEntity<?> resolve(@PathVariable Long id) {
        return reportRepository.findById(id)
                .map(r -> {
                    r.setStatus(AiReportStatus.RESOLVED);
                    reportRepository.save(r);
                    return ResponseEntity.ok(Map.of("success", true));
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("success", false)));
    }
}
