package com.hairapy.schedulers;

import com.hairapy.controllers.HairSwapController;
import com.hairapy.services.HairSwapFinalizer;
import com.hairapy.services.HairSwapTask;
import com.hairapy.services.HairSwapTaskStore;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * Chốt sổ + dọn định kỳ các task hair-swap async bị bỏ dở trong HairSwapTaskStore (vd user
 * đóng tab giữa chừng, không poll tiếp).
 *
 * Trước khi xoá, task PENDING quá hạn (HairSwapController.TASK_TIMEOUT) được kiểm tra AILab 1 lần:
 * xong thì lưu ảnh vào lịch sử, còn lỗi/vẫn chưa xong thì hoàn lượt cho khách.
 * Chạy mỗi 1 phút để khách bị kẹt lượt được hoàn nhanh.
 *
 * TODO: task vẫn lưu in-memory — redeploy giữa chừng vẫn mất task (chấp nhận cho MVP 1 instance, sau này chuyển Redis).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class HairSwapTaskCleanupScheduler {

    private static final Duration MAX_TASK_AGE = Duration.ofMinutes(10);

    private final HairSwapTaskStore taskStore;
    private final HairSwapFinalizer finalizer;

    @Scheduled(fixedRate = 60_000, initialDelay = 60_000)
    public void cleanupStaleTasks() {
        // 1) Chốt sổ các task PENDING bị bỏ dở
        for (HairSwapTask task : taskStore.findStalePending(HairSwapController.TASK_TIMEOUT)) {
            try {
                if (finalizer.pollOnce(task) == HairSwapTask.Status.PENDING) {
                    finalizer.failAndRefund(task, "AI xử lý quá lâu, lượt của bạn đã được hoàn lại.");
                    log.warn("Đã hoàn lượt task hair-swap bị bỏ dở: taskId={}, userId={}", task.getTaskId(), task.getUserId());
                }
            } catch (Exception e) {
                log.warn("Không chốt sổ được task hair-swap {}: {}", task.getTaskId(), e.getMessage());
            }
        }

        // 2) Xoá task cũ (lúc này mọi task đã ở trạng thái cuối)
        int before = taskStore.size();
        int removed = taskStore.evictStale(MAX_TASK_AGE);
        if (removed > 0) {
            log.info("Đã dọn {} task hair-swap cũ (còn lại {}/{}).", removed, taskStore.size(), before);
        }
    }
}
