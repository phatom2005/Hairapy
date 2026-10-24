package com.hairapy.controllers.admin;

import com.hairapy.dto.admin.AdminSubscriptionResponse;
import com.hairapy.dto.admin.CancelSubscriptionRequest;
import com.hairapy.dto.admin.GrantSubscriptionRequest;
import com.hairapy.exceptions.ResourceNotFoundException;
import com.hairapy.models.Subscription;
import com.hairapy.models.SubscriptionPlan;
import com.hairapy.models.SubscriptionStatus;
import com.hairapy.models.User;
import com.hairapy.repositories.SubscriptionRepository;
import com.hairapy.repositories.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Controller quản trị thực hiện các nghiệp vụ quản lý các gói đăng ký dịch vụ (Subscription).
 */
@Slf4j
@RestController
@RequestMapping("/api/admin/subscriptions")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminSubscriptionController {

    private final SubscriptionRepository subscriptionRepository;
    private final UserRepository userRepository;

    /** Email admin đang thao tác (để ghi log kiểm toán). */
    private static String currentAdmin() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null ? auth.getName() : "unknown";
    }

    /**
     * Lấy danh sách các gói dịch vụ có phân trang, lọc theo trạng thái và/hoặc từ khoá (email / họ tên user).
     */
    @GetMapping
    public ResponseEntity<Page<AdminSubscriptionResponse>> getSubscriptions(
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "keyword", required = false) String keyword,
            Pageable pageable
    ) {
        SubscriptionStatus statusEnum = null;
        if (status != null && !status.trim().isEmpty()) {
            try {
                statusEnum = SubscriptionStatus.valueOf(status.toUpperCase().trim());
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().build();
            }
        }
        String kw = (keyword == null || keyword.isBlank()) ? null : "%" + keyword.trim().toLowerCase() + "%";

        Page<Subscription> subscriptionPage;
        if (kw != null) {
            subscriptionPage = statusEnum != null
                    ? subscriptionRepository.searchByKeywordAndStatus(kw, statusEnum, pageable)
                    : subscriptionRepository.searchByKeyword(kw, pageable);
        } else if (statusEnum != null) {
            subscriptionPage = subscriptionRepository.findByStatus(statusEnum, pageable);
        } else {
            subscriptionPage = subscriptionRepository.findAll(pageable);
        }

        Page<AdminSubscriptionResponse> responsePage = subscriptionPage.map(this::mapToSubscriptionResponse);
        return ResponseEntity.ok(responsePage);
    }

    /**
     * Hủy gói đăng ký của người dùng (chuyển đổi trạng thái về CANCELLED).
     * Body tuỳ chọn { "reason": "..." } — hiện chỉ ghi log, chưa lưu DB.
     */
    @Transactional // ghi DB nên cần read-write, override class-level readOnly
    @PutMapping("/{id}/cancel")
    public ResponseEntity<AdminSubscriptionResponse> cancelSubscription(
            @PathVariable Long id,
            @Valid @RequestBody(required = false) CancelSubscriptionRequest request) {
        Subscription subscription = subscriptionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy gói đăng ký với ID: " + id));

        subscription.setStatus(SubscriptionStatus.CANCELLED);
        Subscription saved = subscriptionRepository.save(subscription);

        log.info("Admin {} huỷ subscription id={} (user={}), lý do: {}", currentAdmin(), id,
                subscription.getUser() != null ? subscription.getUser().getEmail() : "?",
                request != null && request.reason() != null ? request.reason() : "(không ghi)");
        return ResponseEntity.ok(mapToSubscriptionResponse(saved));
    }

    /**
     * Admin cấp/gia hạn gói dịch vụ thủ công cho 1 user (tìm theo email).
     * Dùng cho hỗ trợ khách hàng, tặng gói, khắc phục sự cố thanh toán...
     *
     * mode = EXTEND (mặc định): nếu user đang có gói ACTIVE chưa hết hạn → gói mới bắt đầu từ lúc gói cũ hết,
     * gói cũ chuyển EXPIRED, plan mới = plan CAO HƠN giữa cũ và mới (PREMIUM > PRO) — giống PaymentService.
     * mode = REPLACE: giữ hành vi cũ — gói cũ bị CANCELLED, gói mới tính từ bây giờ.
     * Không sửa trực tiếp bản ghi cũ để giữ lịch sử đầy đủ.
     */
    @Transactional
    @PostMapping("/grant")
    public ResponseEntity<AdminSubscriptionResponse> grantSubscription(@Valid @RequestBody GrantSubscriptionRequest request) {
        User user = userRepository.findByEmail(request.email().trim())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng với email: " + request.email()));

        SubscriptionPlan plan;
        try {
            plan = SubscriptionPlan.valueOf(request.plan().toUpperCase().trim());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
        if (!plan.isPaid()) {
            // Không cho "cấp" gói FREE qua endpoint này — FREE là mặc định, không cần bản ghi Subscription riêng.
            return ResponseEntity.badRequest().build();
        }

        String mode = request.mode() == null || request.mode().isBlank() ? "EXTEND" : request.mode().trim().toUpperCase();
        if (!mode.equals("EXTEND") && !mode.equals("REPLACE")) {
            return ResponseEntity.badRequest().build();
        }

        int days = request.days() != null ? request.days() : (plan == SubscriptionPlan.PREMIUM ? 30 : 7);
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startDate = now;

        Optional<Subscription> currentActive =
                subscriptionRepository.findByUserIdAndStatus(user.getId(), SubscriptionStatus.ACTIVE);
        if (currentActive.isPresent()) {
            Subscription old = currentActive.get();
            if (mode.equals("EXTEND")) {
                if (old.getEndDate() != null && old.getEndDate().isAfter(now)) {
                    startDate = old.getEndDate();
                    // Giữ plan cao hơn để không làm tụt quyền lợi
                    if (old.getPlan() == SubscriptionPlan.PREMIUM) {
                        plan = SubscriptionPlan.PREMIUM;
                    }
                }
                old.setStatus(SubscriptionStatus.EXPIRED);
            } else {
                old.setStatus(SubscriptionStatus.CANCELLED);
            }
            subscriptionRepository.save(old);
        }

        Subscription newSub = Subscription.builder()
                .user(user)
                .plan(plan)
                .status(SubscriptionStatus.ACTIVE)
                .startDate(startDate)
                .endDate(startDate.plusDays(days))
                .build();

        Subscription saved = subscriptionRepository.save(newSub);
        log.info("Admin {} cấp gói: user={}, mode={}, plan={}, days={}, hết hạn={}",
                currentAdmin(), user.getEmail(), mode, plan, days, saved.getEndDate());
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

