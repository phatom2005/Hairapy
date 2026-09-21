package com.hairapy.services;

import com.hairapy.models.UsageHistory;

import java.time.Instant;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Trạng thái theo dõi 1 lượt hair-swap async, lưu in-memory trong HairSwapTaskStore.
 * LƯU Ý: chỉ đúng khi backend chạy 1 instance — giống hệt giới hạn của
 * UsageService.userLocks (xem comment gốc ở đó). Nếu scale nhiều instance sau này,
 * phải đổi sang Redis (đã có sẵn trong hạ tầng project cho JWT blacklist).
 */
public class HairSwapTask {

    public enum Status { PENDING, DONE, ERROR }

    private final String taskId;
    private final Long userId;
    private final UsageHistory reservation; // để hoàn lượt nếu lỗi/timeout
    private final boolean isPaidUser;
    private final Instant createdAt;

    private volatile Status status = Status.PENDING;
    private volatile String resultImageUrl; // Cloudinary URL, cache 1 lần duy nhất khi DONE
    private volatile String errorMessage;
    private final AtomicBoolean refunded = new AtomicBoolean(false);
    private final AtomicBoolean uploaded = new AtomicBoolean(false); // chống double-upload Cloudinary khi 2 poll trùng lúc

    public HairSwapTask(String taskId, Long userId, UsageHistory reservation, boolean isPaidUser) {
        this.taskId = taskId;
        this.userId = userId;
        this.reservation = reservation;
        this.isPaidUser = isPaidUser;
        this.createdAt = Instant.now();
    }

    public String getTaskId() { return taskId; }
    public Long getUserId() { return userId; }
    public UsageHistory getReservation() { return reservation; }
    public boolean isPaidUser() { return isPaidUser; }
    public Instant getCreatedAt() { return createdAt; }
    public Status getStatus() { return status; }
    public String getResultImageUrl() { return resultImageUrl; }
    public String getErrorMessage() { return errorMessage; }

    public synchronized void markDone(String resultImageUrl) {
        this.status = Status.DONE;
        this.resultImageUrl = resultImageUrl;
    }

    public synchronized void markError(String errorMessage) {
        this.status = Status.ERROR;
        this.errorMessage = errorMessage;
    }

    /** true nếu ĐÂY LÀ lần đầu gọi (dùng để quyết định có nên thực sự hoàn lượt hay không). */
    public boolean tryMarkRefunded() {
        return refunded.compareAndSet(false, true);
    }

    /** true nếu ĐÂY LÀ lần đầu gọi (dùng để quyết định có nên thực sự upload Cloudinary hay không). */
    public boolean tryMarkUploaded() {
        return uploaded.compareAndSet(false, true);
    }
}
