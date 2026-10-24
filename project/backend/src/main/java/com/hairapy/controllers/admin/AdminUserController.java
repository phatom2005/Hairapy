package com.hairapy.controllers.admin;

import com.hairapy.controllers.SwapHistoryController.SwapHistoryItem;
import com.hairapy.dto.UsageSummaryResponse;
import com.hairapy.dto.admin.AdminPaymentResponse;
import com.hairapy.dto.admin.AdminSubscriptionResponse;
import com.hairapy.dto.admin.AdminUserOverviewResponse;
import com.hairapy.dto.admin.AdminUserResponse;
import com.hairapy.dto.admin.UpdateUserRoleRequest;
import com.hairapy.exceptions.ResourceNotFoundException;
import com.hairapy.models.Payment;
import com.hairapy.models.Role;
import com.hairapy.models.Subscription;
import com.hairapy.models.UsageHistory;
import com.hairapy.models.User;
import com.hairapy.repositories.PaymentRepository;
import com.hairapy.repositories.SubscriptionRepository;
import com.hairapy.repositories.SwapHistoryRepository;
import com.hairapy.repositories.UsageHistoryRepository;
import com.hairapy.repositories.UserRepository;
import com.hairapy.services.SubscriptionService;
import com.hairapy.services.UsageService;
import com.hairapy.utils.VnTime;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Controller quản trị thực hiện các nghiệp vụ quản lý người dùng (xem danh sách, đổi vai trò, hồ sơ tổng quan, hoàn lượt).
 */
@Slf4j
@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final UserRepository userRepository;
    private final SubscriptionService subscriptionService;
    private final SubscriptionRepository subscriptionRepository;
    private final PaymentRepository paymentRepository;
    private final UsageService usageService;
    private final UsageHistoryRepository usageHistoryRepository;
    private final SwapHistoryRepository swapHistoryRepository;

    /**
     * Lấy danh sách người dùng có phân trang và hỗ trợ tìm kiếm, lọc xác minh / tài khoản đã xoá.
     */
    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<Page<AdminUserResponse>> getUsers(
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "includeDeleted", defaultValue = "false") boolean includeDeleted,
            @RequestParam(value = "verified", required = false) Boolean verified,
            Pageable pageable
    ) {
        String keyword = (search != null && !search.isBlank()) ? search.trim() : null;
        Page<User> usersPage = userRepository.searchAdmin(keyword, includeDeleted, verified, pageable);
        Page<AdminUserResponse> responsePage = usersPage.map(this::mapToAdminUserResponse);
        return ResponseEntity.ok(responsePage);
    }

    /**
     * Lấy chi tiết thông tin của 1 người dùng.
     */
    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public ResponseEntity<AdminUserResponse> getUserById(@PathVariable Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng với ID: " + id));
        return ResponseEntity.ok(mapToAdminUserResponse(user));
    }

    /**
     * Tổng quan thông tin người dùng: thông tin cơ bản, gói đăng ký, 10 giao dịch gần nhất, quota hôm nay, 10 lượt thử tóc gần nhất.
     */
    @GetMapping("/{id}/overview")
    @Transactional(readOnly = true)
    public ResponseEntity<AdminUserOverviewResponse> getUserOverview(@PathVariable Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng với ID: " + id));

        AdminUserResponse userResp = mapToAdminUserResponse(user);

        List<AdminSubscriptionResponse> subscriptions = subscriptionRepository.findByUserId(id)
                .stream()
                .map(s -> new AdminSubscriptionResponse(
                        s.getId(),
                        user.getId(),
                        user.getEmail(),
                        user.getFullName(),
                        s.getPlan().name(),
                        s.getStatus().name(),
                        s.getStartDate(),
                        s.getEndDate(),
                        s.getCreatedAt()
                ))
                .toList();

        Page<Payment> recentPaymentsPage = paymentRepository.findByUserId(
                id,
                PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "createdAt"))
        );
        List<AdminPaymentResponse> recentPayments = recentPaymentsPage.getContent()
                .stream()
                .map(p -> new AdminPaymentResponse(
                        p.getId(),
                        p.getOrderCode(),
                        user.getId(),
                        user.getEmail(),
                        user.getFullName(),
                        p.getPlan(),
                        p.getAmount(),
                        p.getStatus(),
                        p.getPayosTransactionId(),
                        p.getCreatedAt(),
                        p.getPaidAt(),
                        p.isSubscriptionGranted()
                ))
                .toList();

        UsageSummaryResponse todayUsage = usageService.getUsageSummary(user);

        List<SwapHistoryItem> recentSwaps = swapHistoryRepository.findByUserOrderByCreatedAtDesc(user)
                .stream()
                .limit(10)
                .map(SwapHistoryItem::from)
                .toList();

        return ResponseEntity.ok(new AdminUserOverviewResponse(
                userResp,
                subscriptions,
                recentPayments,
                todayUsage,
                recentSwaps
        ));
    }

    /**
     * Xác minh email thủ công cho người dùng (bỏ qua bước xác nhận qua OTP/link).
     */
    @PostMapping("/{id}/verify-email")
    @Transactional
    public ResponseEntity<AdminUserResponse> verifyEmail(@PathVariable Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng với ID: " + id));

        user.setEmailVerified(true);
        User saved = userRepository.save(user);
        log.info("Admin {} đã xác minh email cho user id={}, email={}",
                SecurityContextHolder.getContext().getAuthentication().getName(), id, user.getEmail());
        return ResponseEntity.ok(mapToAdminUserResponse(saved));
    }

    /**
     * Hoàn 1 lượt dùng trong hôm nay cho user (xoá 1 bản ghi UsageHistory mới nhất tính từ 0h VN).
     */
    @PostMapping("/{id}/refund-usage")
    @Transactional
    public ResponseEntity<?> refundUsage(
            @PathVariable Long id,
            @RequestParam String feature) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng với ID: " + id));

        LocalDateTime since = VnTime.startOfTodayVn();
        Optional<UsageHistory> usageOpt = usageHistoryRepository
                .findFirstByUserIdAndFeatureAndUsedAtGreaterThanEqualOrderByUsedAtDesc(id, feature, since);

        if (usageOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Hôm nay user chưa dùng tính năng này."));
        }

        usageHistoryRepository.delete(usageOpt.get());
        log.info("Admin {} đã hoàn 1 lượt feature={} hôm nay cho user id={}, email={}",
                SecurityContextHolder.getContext().getAuthentication().getName(), feature, id, user.getEmail());

        return ResponseEntity.ok(Map.of("message", "Đã hoàn 1 lượt " + feature + " thành công cho user."));
    }

    /**
     * Cập nhật vai trò người dùng (USER, ADMIN, TESTER).
     * Kiểm tra không cho phép Admin tự hạ quyền của bản thân.
     */
    @PutMapping("/{id}/role")
    @Transactional
    public ResponseEntity<?> updateUserRole(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserRoleRequest request
    ) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng với ID: " + id));

        Role newRole;
        try {
            newRole = Role.valueOf(request.role().toUpperCase());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("Vai trò không hợp lệ. Chỉ chấp nhận USER, ADMIN hoặc TESTER.");
        }

        String currentEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        if (user.getEmail().equalsIgnoreCase(currentEmail) && newRole != Role.ADMIN) {
            return ResponseEntity.badRequest().body("Bạn không thể tự hạ vai trò quản trị viên của chính mình.");
        }

        user.setRole(newRole);
        User updatedUser = userRepository.save(user);

        return ResponseEntity.ok(mapToAdminUserResponse(updatedUser));
    }

    private AdminUserResponse mapToAdminUserResponse(User user) {
        String plan = subscriptionService.getEffectivePlan(user.getId()).name();
        LocalDateTime planEndDate = subscriptionService.getActivePaidSubscription(user.getId())
                .map(Subscription::getEndDate)
                .orElse(null);
        boolean deleted = user.getEmail() != null && user.getEmail().endsWith("@deleted.hairapy.invalid");

        return new AdminUserResponse(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getRole().name(),
                user.getCreatedAt(),
                user.getUpdatedAt(),
                user.isEmailVerified(),
                user.getProvider() != null ? user.getProvider().name() : null,
                plan,
                planEndDate,
                deleted
        );
    }
}
