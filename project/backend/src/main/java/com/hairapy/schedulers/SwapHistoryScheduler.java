package com.hairapy.schedulers;

import com.hairapy.services.CloudinaryService;
import com.hairapy.services.SwapHistoryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalDateTime;

/**
 * Dọn lịch sử ảnh thử tóc quá 30 ngày, mỗi ngày lúc 3h sáng giờ VN. Sau đó quét thêm folder Cloudinary
 * "swap-history" (cũ hơn 31 ngày) để xoá ảnh mồ côi không còn bản ghi DB (vd lưu DB thất bại).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SwapHistoryScheduler {

    public static final int RETENTION_DAYS = 30;

    private final SwapHistoryService swapHistoryService;
    private final CloudinaryService cloudinaryService;

    @Scheduled(cron = "0 0 3 * * *", zone = "Asia/Ho_Chi_Minh")
    public void cleanup() {
        int rows = swapHistoryService.deleteOlderThan(LocalDateTime.now().minusDays(RETENTION_DAYS));
        int orphans = cloudinaryService.deleteExpiredResources("hairapy/swap-history/", Duration.ofDays(RETENTION_DAYS + 1));
        log.info("Dọn lịch sử thử tóc: xoá {} mục quá {} ngày, {} ảnh mồ côi.", rows, RETENTION_DAYS, orphans);
    }
}
