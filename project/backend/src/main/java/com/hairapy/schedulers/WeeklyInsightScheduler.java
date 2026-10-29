package com.hairapy.schedulers;

import com.hairapy.services.InsightDigestService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduler tự động tạo và gửi bản tin insight tuần cho team:
 * Chạy vào 08:00 sáng thứ Hai hàng tuần (múi giờ Asia/Ho_Chi_Minh).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WeeklyInsightScheduler {

    private final InsightDigestService insightDigestService;

    @Scheduled(cron = "0 0 8 * * MON", zone = "Asia/Ho_Chi_Minh")
    public void runWeeklyDigest() {
        log.info("Bắt đầu tiến trình tạo và gửi bản tin insight hàng tuần...");
        try {
            insightDigestService.generateWeeklyDigest(true);
            log.info("Đã hoàn tất tiến trình tạo và gửi bản tin insight hàng tuần.");
        } catch (Exception e) {
            log.error("Lỗi khi chạy scheduler bản tin insight hàng tuần: {}", e.getMessage(), e);
        }
    }
}
