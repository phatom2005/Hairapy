package com.hairapy.schedulers;

import com.hairapy.services.HairSwapTaskStore;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * Dọn định kỳ các task hair-swap async bị bỏ dở trong HairSwapTaskStore (vd user
 * đóng tab giữa chừng, không poll tiếp) để tránh phình bộ nhớ theo thời gian.
 *
 * KHÁC với các scheduler còn lại trong package này (CloudinaryCleanupScheduler,
 * SubscriptionScheduler — chạy cron hàng giờ vì dữ liệu của chúng "sống" hàng giờ/ngày):
 * dữ liệu task hair-swap chỉ "sống" tối đa ~75s (xem HairSwapController.TASK_TIMEOUT)
 * nên dùng fixedRate ngắn hơn (5 phút) để không giữ rác trong bộ nhớ quá lâu — vẫn đủ
 * dư so với vòng đời thật của 1 task để không bao giờ xoá nhầm task đang được poll hợp lệ.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class HairSwapTaskCleanupScheduler {

    private static final Duration MAX_TASK_AGE = Duration.ofMinutes(10);

    private final HairSwapTaskStore taskStore;

    @Scheduled(fixedRate = 300_000, initialDelay = 60_000)
    public void cleanupStaleTasks() {
        int before = taskStore.size();
        int removed = taskStore.evictStale(MAX_TASK_AGE);
        if (removed > 0) {
            log.info("Đã dọn {} task hair-swap cũ (còn lại {}/{}).", removed, taskStore.size(), before);
        }
    }
}
