package com.hairapy.dto;

/**
 * Kết quả của MỘT lần gọi kiểm tra trạng thái task AILab (không lặp, không sleep).
 * Dùng nội bộ giữa HairSwapService và HairSwapController.
 */
public record HairSwapPollResult(Status status, String imageUrl, String errorMessage) {

    public enum Status {
        PENDING,  // task_status 0 (queued) hoặc 1 (processing) — chưa xong
        DONE,     // task_status 2 — thành công, có imageUrl
        ERROR     // AILab báo lỗi (error_code != 0) — có errorMessage
    }

    public static HairSwapPollResult pending() {
        return new HairSwapPollResult(Status.PENDING, null, null);
    }

    public static HairSwapPollResult done(String imageUrl) {
        return new HairSwapPollResult(Status.DONE, imageUrl, null);
    }

    public static HairSwapPollResult error(String message) {
        return new HairSwapPollResult(Status.ERROR, null, message);
    }
}
