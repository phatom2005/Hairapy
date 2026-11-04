package com.hairapy.controllers.admin;

import com.hairapy.dto.admin.AdminFeedbackResponse;
import com.hairapy.models.Feedback;
import com.hairapy.models.FeedbackFeature;
import com.hairapy.repositories.FeedbackRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Controller quản trị dành cho việc xem và lọc danh sách phản hồi / đánh giá người dùng.
 */
@Slf4j
@RestController
@RequestMapping("/api/admin/feedback")
@RequiredArgsConstructor
public class AdminFeedbackController {

    private final FeedbackRepository feedbackRepository;

    /**
     * Lấy danh sách phản hồi của người dùng có phân trang và lọc theo số sao.
     */
    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<?> getFeedbackList(
            @RequestParam(required = false) Integer rating,
            @RequestParam(required = false) String feature,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        if (rating != null && (rating < 1 || rating > 5)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Số sao lọc phải từ 1 đến 5"));
        }

        // Lọc theo tính năng (Phase 6.5): HAIR_SWAP | FACE_SCAN | GENERAL, bỏ trống = tất cả
        FeedbackFeature featureFilter = null;
        if (feature != null && !feature.isBlank()) {
            try {
                featureFilter = FeedbackFeature.valueOf(feature.trim().toUpperCase());
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().body(Map.of("error", "Tính năng lọc không hợp lệ"));
            }
        }

        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size), Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Feedback> feedbackPage;
        if (featureFilter != null) {
            feedbackPage = feedbackRepository.findAllByFeatureWithUser(featureFilter, rating, pageable);
        } else if (rating != null) {
            feedbackPage = feedbackRepository.findAllByRatingWithUser(rating, pageable);
        } else {
            feedbackPage = feedbackRepository.findAllWithUser(pageable);
        }

        Page<AdminFeedbackResponse> responsePage = feedbackPage.map(f -> new AdminFeedbackResponse(
                f.getId(),
                f.getUser() != null ? f.getUser().getEmail() : null,
                f.getUser() != null ? f.getUser().getFullName() : null,
                f.getRating(),
                f.getComment(),
                f.getFeature() != null ? f.getFeature().name() : "GENERAL",
                f.getCreatedAt()
        ));

        return ResponseEntity.ok(responsePage);
    }
}
