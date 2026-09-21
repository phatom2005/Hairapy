package com.hairapy.services;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Lưu trạng thái các task hair-swap async đang chờ FE poll kết quả.
 * In-memory — chỉ đúng khi backend chạy 1 instance (xem comment trong HairSwapTask).
 * Được dọn định kỳ bởi HairSwapTaskCleanupScheduler để tránh phình bộ nhớ do task
 * bị bỏ dở (user đóng tab giữa chừng, không poll tiếp nữa).
 */
@Slf4j
@Component
public class HairSwapTaskStore {

    private final ConcurrentHashMap<String, HairSwapTask> tasks = new ConcurrentHashMap<>();

    public void register(HairSwapTask task) {
        tasks.put(task.getTaskId(), task);
    }

    public HairSwapTask get(String taskId) {
        return tasks.get(taskId);
    }

    /**
     * Dọn các task đã tồn tại quá lâu (kể cả PENDING lẫn đã DONE/ERROR mà FE không
     * còn poll nữa). Vòng đời thực tế của 1 task chỉ khoảng ~75s tối đa, nên maxAge
     * vài phút là quá đủ dư để không xoá nhầm task còn đang được poll hợp lệ.
     */
    public int evictStale(Duration maxAge) {
        Instant cutoff = Instant.now().minus(maxAge);
        int before = tasks.size();
        tasks.entrySet().removeIf(e -> e.getValue().getCreatedAt().isBefore(cutoff));
        return before - tasks.size();
    }

    public int size() {
        return tasks.size();
    }
}
