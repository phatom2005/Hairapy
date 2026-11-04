package com.hairapy.controllers.admin;

import com.hairapy.dto.admin.AdminAiReportResponse;
import com.hairapy.models.AiContentReport;
import com.hairapy.models.AiReportStatus;
import com.hairapy.models.FeedbackFeature;
import com.hairapy.models.UsageHistory;
import com.hairapy.repositories.AiContentReportRepository;
import com.hairapy.repositories.UsageHistoryRepository;
import com.hairapy.utils.VnTime;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Admin xem và đánh dấu đã xử lý các báo cáo nội dung do AI tạo ra.
 */
@Slf4j
@RestController
@RequestMapping("/api/admin/ai-reports")
@RequiredArgsConstructor
public class AdminAiReportController {

    private final AiContentReportRepository reportRepository;
    private final UsageHistoryRepository usageHistoryRepository;

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

    /**
     * Đánh dấu một báo cáo đã xử lý.
     * refundUsage=true (Phase 6.4): hoàn luôn 1 lượt của tính năng bị báo cáo cho người báo cáo —
     * chỉ hoàn được lượt dùng trong HÔM NAY (giờ VN), giống POST /admin/users/{id}/refund-usage.
     * Không hoàn được thì báo cáo vẫn được đánh dấu đã xử lý, response có refunded=false + lý do.
     */
    @PostMapping("/{id}/resolve")
    @Transactional
    public ResponseEntity<?> resolve(@PathVariable Long id,
                                     @RequestParam(defaultValue = "false") boolean refundUsage) {
        Optional<AiContentReport> opt = reportRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("success", false));
        }
        AiContentReport r = opt.get();

        // Chặn hoàn 2 lần cho cùng 1 báo cáo
        if (refundUsage && r.getStatus() == AiReportStatus.RESOLVED) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Báo cáo này đã được xử lý trước đó, không hoàn lượt thêm."));
        }

        r.setStatus(AiReportStatus.RESOLVED);
        reportRepository.save(r);

        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        if (!refundUsage) {
            return ResponseEntity.ok(body);
        }

        FeedbackFeature feature = r.getFeature();
        if (feature == null || feature == FeedbackFeature.GENERAL || r.getUser() == null) {
            body.put("refunded", false);
            body.put("message", "Báo cáo không gắn với tính năng tính lượt nên không có lượt để hoàn.");
            return ResponseEntity.ok(body);
        }

        Optional<UsageHistory> usage = usageHistoryRepository
                .findFirstByUserIdAndFeatureAndUsedAtGreaterThanEqualOrderByUsedAtDesc(
                        r.getUser().getId(), feature.name(), VnTime.startOfTodayVn());
        if (usage.isEmpty()) {
            body.put("refunded", false);
            body.put("message", "Hôm nay người dùng không còn lượt nào để hoàn (chỉ hoàn được lượt trong ngày).");
            return ResponseEntity.ok(body);
        }

        usageHistoryRepository.delete(usage.get());
        log.info("Admin hoàn 1 lượt {} cho userId={} khi xử lý báo cáo AI id={}",
                feature.name(), r.getUser().getId(), id);
        body.put("refunded", true);
        body.put("message", "Đã hoàn 1 lượt cho người báo cáo.");
        return ResponseEntity.ok(body);
    }
}
