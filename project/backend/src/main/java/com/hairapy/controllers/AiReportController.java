package com.hairapy.controllers;

import com.hairapy.dto.AiReportRequest;
import com.hairapy.models.AiContentReport;
import com.hairapy.models.AiReportReason;
import com.hairapy.models.FeedbackFeature;
import com.hairapy.models.User;
import com.hairapy.repositories.AiContentReportRepository;
import com.hairapy.services.UsageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Tiếp nhận báo cáo nội dung do AI tạo ra (ảnh thử tóc không phù hợp, bị lỗi...).
 * Đây là cơ chế báo cáo trong ứng dụng mà chính sách Google Play yêu cầu với app có nội dung AI.
 */
@Slf4j
@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class AiReportController {

    private static final int MAX_REPORTS_PER_DAY = 10;

    private final AiContentReportRepository reportRepository;
    private final UsageService usageService;

    @PostMapping
    public ResponseEntity<?> submit(@Valid @RequestBody AiReportRequest request) {
        User currentUser = usageService.getCurrentUser();
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Vui lòng đăng nhập để gửi báo cáo."));
        }

        AiReportReason reason;
        try {
            reason = AiReportReason.valueOf(request.reason().trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Lý do báo cáo không hợp lệ."));
        }

        // Chống spam: tối đa 10 báo cáo / user / 24h
        long recent = reportRepository.countByUserIdAndCreatedAtAfter(
                currentUser.getId(), LocalDateTime.now().minusHours(24));
        if (recent >= MAX_REPORTS_PER_DAY) {
            log.warn("User ID {} đã gửi {} báo cáo AI trong 24h qua, bị chặn rate-limit", currentUser.getId(), recent);
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("error", "Bạn đã gửi quá nhiều báo cáo hôm nay."));
        }

        FeedbackFeature feature = FeedbackFeature.HAIR_SWAP;
        if (request.feature() != null && !request.feature().isBlank()) {
            try {
                feature = FeedbackFeature.valueOf(request.feature().trim().toUpperCase());
            } catch (IllegalArgumentException ignored) {
                feature = FeedbackFeature.HAIR_SWAP;
            }
        }

        String comment = (request.comment() != null && !request.comment().isBlank())
                ? request.comment().trim() : null;
        // Chỉ nhận URL https (ảnh kết quả trên Cloudinary), bỏ qua giá trị lạ như blob:/file:
        String imageUrl = (request.imageUrl() != null && request.imageUrl().trim().startsWith("https://"))
                ? request.imageUrl().trim() : null;

        reportRepository.save(AiContentReport.builder()
                .user(currentUser)
                .feature(feature)
                .reason(reason)
                .comment(comment)
                .imageUrl(imageUrl)
                .hairstyleId(request.hairstyleId())
                .build());
        log.info("User ID {} báo cáo nội dung AI ({}), lý do {}", currentUser.getId(), feature, reason);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of("message", "Cảm ơn bạn! Chúng mình sẽ xem xét báo cáo sớm nhất."));
    }
}
