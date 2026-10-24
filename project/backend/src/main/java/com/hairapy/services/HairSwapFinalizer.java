package com.hairapy.services;

import com.hairapy.dto.HairSwapPollResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * "Chốt sổ" 1 task hair-swap: kiểm tra AILab đúng 1 lần, lưu ảnh + lịch sử khi DONE,
 * hoàn lượt khi ERROR/quá hạn. Dùng chung cho HairSwapController (khi FE poll) và
 * HairSwapTaskCleanupScheduler (khi khách đóng tab, không poll nữa).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class HairSwapFinalizer {

    private final HairSwapService hairSwapService;
    private final UsageService usageService;
    private final SwapHistoryService swapHistoryService;

    /** Kiểm tra AILab đúng 1 lần cho task PENDING và cập nhật trạng thái; trả status sau khi xử lý. */
    public HairSwapTask.Status pollOnce(HairSwapTask task) {
        if (task.getStatus() != HairSwapTask.Status.PENDING) {
            return task.getStatus();
        }

        HairSwapPollResult result = hairSwapService.checkStatus(task.getTaskId());

        switch (result.status()) {
            case DONE -> {
                // Chống double-upload Cloudinary nếu 2 luồng (poll của FE + scheduler) trùng thời điểm
                if (task.tryMarkUploaded()) {
                    try {
                        String cloudinaryUrl = hairSwapService.uploadResult(result.imageUrl(), task.isPaidUser());
                        task.markDone(cloudinaryUrl);
                        // Lưu vào lịch sử thử tóc (lỗi lưu chỉ ghi log, không ảnh hưởng kết quả)
                        swapHistoryService.record(task.getUserId(), task.getHairstyleId(), task.getHairstyleName(), cloudinaryUrl);
                    } catch (Exception e) {
                        // Upload lỗi: bản cũ để task kẹt PENDING và mất lượt → giờ hoàn lượt luôn
                        log.error("Lỗi lưu ảnh kết quả hair-swap taskId={}", task.getTaskId(), e);
                        failAndRefund(task, "Không thể lưu ảnh kết quả. Lượt của bạn đã được hoàn lại.");
                    }
                }
            }
            case ERROR -> failAndRefund(task, result.errorMessage());
            default -> { /* PENDING: giữ nguyên */ }
        }
        return task.getStatus();
    }

    /** Đánh lỗi + hoàn lượt đúng 1 lần (dùng AtomicBoolean trong task). */
    public void failAndRefund(HairSwapTask task, String message) {
        if (task.getStatus() == HairSwapTask.Status.DONE) {
            return; // đã có kết quả thì không đè lỗi / không hoàn lượt
        }
        task.markError(message);
        if (task.tryMarkRefunded()) {
            usageService.releaseUsage(task.getReservation());
        }
    }
}
