package com.hairapy.utils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;

/**
 * Quy đổi mốc thời gian theo giờ Việt Nam sang LocalDateTime theo TZ của server,
 * để so sánh đúng với các cột LocalDateTime đang lưu bằng LocalDateTime.now() (giờ server).
 */
public final class VnTime {
    public static final ZoneId VN = ZoneId.of("Asia/Ho_Chi_Minh");

    private VnTime() {}

    /** 0h hôm nay giờ VN, đổi ra giờ server. */
    public static LocalDateTime startOfTodayVn() {
        return startOfDayVn(LocalDate.now(VN));
    }

    /** 0h của 1 ngày (theo lịch VN), đổi ra giờ server. */
    public static LocalDateTime startOfDayVn(LocalDate vnDate) {
        return vnDate.atStartOfDay(VN).withZoneSameInstant(ZoneId.systemDefault()).toLocalDateTime();
    }

    /**
     * Giờ hiện tại theo đồng hồ VN. Dùng để so với giờ người dùng nhập từ trình duyệt (input datetime-local
     * gửi lên "giờ VN" không kèm múi giờ, vd giờ hẹn salon) — KHÔNG dùng LocalDateTime.now() (giờ server, Railway = UTC).
     */
    public static LocalDateTime nowVn() {
        return LocalDateTime.now(VN);
    }

    /** Ngày hôm nay theo lịch VN. */
    public static LocalDate todayVn() {
        return LocalDate.now(VN);
    }
}
