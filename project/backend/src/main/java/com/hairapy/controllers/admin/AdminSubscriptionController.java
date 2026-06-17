package com.hairapy.controllers.admin;

import com.hairapy.dto.admin.AdminSubscriptionResponse;
import com.hairapy.exceptions.ResourceNotFoundException;
import com.hairapy.models.Subscription;
import com.hairapy.models.SubscriptionStatus;
import com.hairapy.repositories.SubscriptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Controller quản trị thực hiện các nghiệp vụ quản lý các gói đăng ký dịch vụ (Subscription).
 */
@RestController
@RequestMapping("/api/admin/subscriptions")
@RequiredArgsConstructor
public class AdminSubscriptionController {

    private final SubscriptionRepository subscriptionRepository;

    /**
     * Lấy danh sách các gói dịch vụ có phân trang và tùy chọn lọc theo trạng thái.
     */
    @GetMapping
    public ResponseEntity<Page<AdminSubscriptionResponse>> getSubscriptions(
            @RequestParam(value = "status", required = false) String status,
            Pageable pageable
    ) {
        Page<Subscription> subscriptionPage;

        if (status != null && !status.trim().isEmpty()) {
            try {
                SubscriptionStatus statusEnum = SubscriptionStatus.valueOf(status.toUpperCase().trim());
                subscriptionPage = subscriptionRepository.findByStatus(statusEnum, pageable);
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().build();
            }
        } else {
            subscriptionPage = subscriptionRepository.findAll(pageable);
        }

        Page<AdminSubscriptionResponse> responsePage = subscriptionPage.map(this::mapToSubscriptionResponse);
        return ResponseEntity.ok(responsePage);
    }

    /**
     * Hủy gói đăng ký của người dùng (chuyển đổi trạng thái về CANCELLED).
     */
    @PutMapping("/{id}/cancel")
    public ResponseEntity<AdminSubscriptionResponse> cancelSubscription(@PathVariable Long id) {
        Subscription subscription = subscriptionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy gói đăng ký với ID: " + id));

        subscription.setStatus(SubscriptionStatus.CANCELLED);
        Subscription saved = subscriptionRepository.save(subscription);

        return ResponseEntity.ok(mapToSubscriptionResponse(saved));
    }

    private AdminSubscriptionResponse mapToSubscriptionResponse(Subscription subscription) {
        String email = "";
        String fullName = "";
        Long userId = null;

        if (subscription.getUser() != null) {
            email = subscription.getUser().getEmail();
            fullName = subscription.getUser().getFullName();
            userId = subscription.getUser().getId();
        }

        return new AdminSubscriptionResponse(
                subscription.getId(),
                userId,
                email,
                fullName,
                subscription.getPlan().name(),
                subscription.getStatus().name(),
                subscription.getStartDate(),
                subscription.getEndDate(),
                subscription.getCreatedAt()
        );
    }
}
