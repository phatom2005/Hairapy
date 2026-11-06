package com.hairapy.controllers.admin;

import com.hairapy.dto.admin.AdminUsageResponse;
import com.hairapy.dto.admin.AdminUsageSummaryRow;
import com.hairapy.utils.VnTime;
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

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

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

    /**
     * Phase 6.2 — Tổng hợp lượt dùng theo người dùng trong 1 ngày (giờ VN), nhiều lượt nhất trước.
     * GET /api/admin/usage/summary?date=yyyy-MM-dd (bỏ trống = hôm nay)
     */
    @GetMapping("/summary")
    public ResponseEntity<?> getUsageSummary(@RequestParam(value = "date", required = false) String date) {
        LocalDate day;
        if (date == null || date.isBlank()) {
            day = VnTime.todayVn();
        } else {
            try {
                day = LocalDate.parse(date.trim());
            } catch (DateTimeParseException e) {
                return ResponseEntity.badRequest().body(Map.of("error", "Ngày không hợp lệ, cần dạng yyyy-MM-dd."));
            }
        }
        LocalDateTime start = VnTime.startOfDayVn(day);
        LocalDateTime end = VnTime.startOfDayVn(day.plusDays(1));

        // Gộp các dòng (user, feature) thành 1 dòng mỗi user
        Map<Long, long[]> counts = new LinkedHashMap<>();       // [faceScan, hairSwap, aiStylist, total]
        Map<Long, String[]> info = new LinkedHashMap<>();       // [email, fullName]
        Map<Long, LocalDateTime> last = new LinkedHashMap<>();
        for (Object[] row : usageHistoryRepository.summarizeByUserBetween(start, end)) {
            Long userId = row[0] != null ? ((Number) row[0]).longValue() : null;
            if (userId == null) continue;
            String feature = row[3] != null ? row[3].toString() : "";
            long count = row[4] != null ? ((Number) row[4]).longValue() : 0L;
            LocalDateTime lastUsed = (LocalDateTime) row[5];

            long[] c = counts.computeIfAbsent(userId, k -> new long[4]);
            switch (feature) {
                case "FACE_SCAN" -> c[0] += count;
                case "HAIR_SWAP" -> c[1] += count;
                case "AI_STYLIST" -> c[2] += count;
                default -> { /* tính năng khác chỉ cộng vào tổng */ }
            }
            c[3] += count;
            info.putIfAbsent(userId, new String[]{
                    row[1] != null ? row[1].toString() : null,
                    row[2] != null ? row[2].toString() : null});
            if (lastUsed != null && (last.get(userId) == null || lastUsed.isAfter(last.get(userId)))) {
                last.put(userId, lastUsed);
            }
        }

        List<AdminUsageSummaryRow> rows = new ArrayList<>();
        counts.forEach((userId, c) -> rows.add(new AdminUsageSummaryRow(
                userId, info.get(userId)[0], info.get(userId)[1],
                c[0], c[1], c[2], c[3], last.get(userId))));
        rows.sort(Comparator.comparingLong(AdminUsageSummaryRow::total).reversed()
                .thenComparing(AdminUsageSummaryRow::lastUsedAt, Comparator.nullsLast(Comparator.reverseOrder())));

        long faceScan = rows.stream().mapToLong(AdminUsageSummaryRow::faceScan).sum();
        long hairSwap = rows.stream().mapToLong(AdminUsageSummaryRow::hairSwap).sum();
        long aiStylist = rows.stream().mapToLong(AdminUsageSummaryRow::aiStylist).sum();
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("date", day.toString());
        body.put("activeUsers", rows.size());
        body.put("totals", Map.of("faceScan", faceScan, "hairSwap", hairSwap, "aiStylist", aiStylist,
                "total", faceScan + hairSwap + aiStylist));
        body.put("rows", rows);
        return ResponseEntity.ok(body);
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
