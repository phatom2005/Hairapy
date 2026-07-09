package com.hairapy.schedulers;

import com.hairapy.services.CloudinaryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * Lập lịch dọn ảnh kết quả AI hair-swap (folder "hairapy/ai-results/") quá 24h.
 * Ảnh này KHÔNG có bản ghi DB theo dõi (xem CloudinaryService.deleteExpiredResources)
 * nên phải dùng Cloudinary Admin API để liệt kê + xoá, khác cách các scheduler khác
 * (ví dụ SubscriptionScheduler) đang query DB trực tiếp.
 *
 * CHỈ áp dụng cho "ai-results" — KHÔNG đụng "scans" (ảnh Scan History, cần giữ lại
 * để hiển thị trong trang Lịch sử quét) hay "catalog" (ảnh kiểu tóc, vĩnh viễn).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CloudinaryCleanupScheduler {

    private static final String AI_RESULTS_PREFIX = "hairapy/ai-results/";

    private final CloudinaryService cloudinaryService;

    /**
     * Chạy mỗi giờ (giống lịch của SubscriptionScheduler) — đủ để đảm bảo không ảnh
     * nào tồn tại quá ~25h thực tế (24h + tối đa 1h chờ tới lần quét kế tiếp).
     */
    @Scheduled(cron = "0 0 * * * *")
    public void cleanupExpiredAiResults() {
        log.info("Bắt đầu dọn ảnh AI hair-swap quá 24h...");
        int deleted = cloudinaryService.deleteExpiredResources(AI_RESULTS_PREFIX, Duration.ofHours(24));
        log.info("Hoàn thành dọn ảnh AI hair-swap: đã xoá {} ảnh.", deleted);
    }
}
