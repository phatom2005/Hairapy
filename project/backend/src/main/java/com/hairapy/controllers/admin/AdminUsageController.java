package com.hairapy.controllers.admin;

import com.hairapy.dto.admin.AdminUsageResponse;
import com.hairapy.models.UsageHistory;
import com.hairapy.repositories.UsageHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controller quản trị thực hiện việc theo dõi lịch sử quét AI và thử kiểu tóc của người dùng.
 */
@RestController
@RequestMapping("/api/admin/usage")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminUsageController {

    private final UsageHistoryRepository usageHistoryRepository;

    /**
     * Lấy nhật ký sử dụng hệ thống có phân trang và tùy chọn lọc theo người dùng (userId).
     */
    @GetMapping
    public ResponseEntity<Page<AdminUsageResponse>> getUsageHistory(
            @RequestParam(value = "userId", required = false) Long userId,
            Pageable pageable
    ) {
        Page<UsageHistory> page;
        if (userId != null) {
            page = usageHistoryRepository.findByUserId(userId, pageable);
        } else {
            page = usageHistoryRepository.findAll(pageable);
        }

        Page<AdminUsageResponse> responsePage = page.map(this::mapToUsageResponse);
        return ResponseEntity.ok(responsePage);
    }

    private AdminUsageResponse mapToUsageResponse(UsageHistory usageHistory) {
        String email = "";
        Long userId = null;

        if (usageHistory.getUser() != null) {
            email = usageHistory.getUser().getEmail();
            userId = usageHistory.getUser().getId();
        }

        return new AdminUsageResponse(
                usageHistory.getId(),
                userId,
                email,
                usageHistory.getFeature(),
                usageHistory.getUsedAt()
        );
    }
}
