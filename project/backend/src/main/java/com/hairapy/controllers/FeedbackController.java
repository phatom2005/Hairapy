package com.hairapy.controllers;

import com.hairapy.dto.FeedbackRequest;
import com.hairapy.models.Feedback;
import com.hairapy.models.FeedbackFeature;
import com.hairapy.models.User;
import com.hairapy.repositories.FeedbackRepository;
import com.hairapy.services.UsageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Controller tiếp nhận đánh giá sao và nhận xét từ người dùng.
 */
@Slf4j
@RestController
@RequestMapping("/api/feedback")
@RequiredArgsConstructor
public class FeedbackController {

    private final FeedbackRepository feedbackRepository;
    private final UsageService usageService;

    /**
     * Gửi đánh giá sao và nhận xét cho dịch vụ / tính năng.
     */
    @PostMapping
    public ResponseEntity<?> submitFeedback(@Valid @RequestBody FeedbackRequest request) {
        User currentUser = usageService.getCurrentUser();
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Vui lòng đăng nhập để gửi đánh giá."));
        }

        // Kiểm tra chống spam: tối đa 10 feedback / user / 24h
        LocalDateTime past24Hours = LocalDateTime.now().minusHours(24);
        long countRecent = feedbackRepository.countByUserIdAndCreatedAtAfter(currentUser.getId(), past24Hours);
        if (countRecent >= 10) {
            log.warn("User ID {} đã gửi {} đánh giá trong 24h qua, bị chặn rate-limit", currentUser.getId(), countRecent);
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("error", "Bạn đã gửi quá nhiều đánh giá hôm nay."));
        }

        FeedbackFeature feature = FeedbackFeature.GENERAL;
        if (request.feature() != null && !request.feature().isBlank()) {
            try {
                feature = FeedbackFeature.valueOf(request.feature().trim().toUpperCase());
            } catch (IllegalArgumentException ignored) {
                feature = FeedbackFeature.GENERAL;
            }
        }

        String comment = (request.comment() != null && !request.comment().isBlank())
                ? request.comment().trim()
                : null;

        Feedback feedback = Feedback.builder()
                .user(currentUser)
                .rating(request.rating())
                .comment(comment)
                .feature(feature)
                .build();

        feedbackRepository.save(feedback);
        log.info("User ID {} đã gửi đánh giá {} sao cho tính năng {}", currentUser.getId(), request.rating(), feature);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of("message", "Cảm ơn bạn đã đánh giá!"));
    }
}
