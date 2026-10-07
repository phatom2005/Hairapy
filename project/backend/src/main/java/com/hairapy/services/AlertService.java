package com.hairapy.services;

import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Gửi email cảnh báo cho admin khi có lỗi NGHIÊM TRỌNG (AILab hết credit/sai key, Cloudinary lỗi,
 * lỗi 500 chưa xử lý...). KHÔNG dùng cho lỗi do người dùng (sai mật khẩu, validation, ảnh không thấy mặt).
 *
 * Chống spam: mỗi "key" (loại lỗi) chỉ gửi tối đa 1 mail / cooldown (mặc định 30 phút); các lần
 * trong thời gian chờ chỉ được đếm, và số lần bị gộp sẽ ghi vào mail kế tiếp. Lưu trong bộ nhớ
 * (đủ cho MVP chạy 1 instance; restart thì reset). "key" phải là tập GIÁ TRỊ CỐ ĐỊNH trong code,
 * không được lấy từ input của user (tránh map phình vô hạn).
 *
 * Gửi bất đồng bộ trên 1 thread riêng và không bao giờ ném exception ra ngoài — lỗi gửi cảnh báo
 * không được làm hỏng request của người dùng.
 */
@Slf4j
@Service
public class AlertService {

    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss");
    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final EmailService emailService;

    // Thread đơn, daemon: gửi mail tuần tự, không chặn request và không giữ JVM khi shutdown
    private final ExecutorService executor = Executors.newSingleThreadExecutor(r -> {
        Thread t = new Thread(r, "alert-mailer");
        t.setDaemon(true);
        return t;
    });

    private final ConcurrentHashMap<String, Long> lastSentAt = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, AtomicInteger> suppressedCount = new ConcurrentHashMap<>();

    // Để trống → chỉ ghi log, không gửi mail
    @Value("${app.alert.email:}")
    private String alertEmail;

    @Value("${app.alert.cooldown-minutes:30}")
    private long cooldownMinutes;

    public AlertService(EmailService emailService) {
        this.emailService = emailService;
    }

    /**
     * @param key    loại lỗi (hằng số cố định, ví dụ "AILAB_AUTH") — dùng để áp cooldown
     * @param title  tiêu đề ngắn gọn của cảnh báo
     * @param detail chi tiết (status, body rút gọn...). KHÔNG đưa API key / mật khẩu / token vào đây.
     */
    public void alert(String key, String title, String detail) {
        try {
            // Luôn ghi log để còn dấu vết trên Railway kể cả khi mail bị gộp/tắt
            log.error("ALERT [{}] {} | {}", key, title, detail);

            if (alertEmail == null || alertEmail.isBlank()) {
                return; // chưa cấu hình ALERT_EMAIL
            }

            long now = System.currentTimeMillis();
            long cooldownMs = Duration.ofMinutes(Math.max(1, cooldownMinutes)).toMillis();

            // compute() chạy atomic theo key → 2 request đồng thời không cùng qua được cổng cooldown
            boolean[] shouldSend = {false};
            lastSentAt.compute(key, (k, last) -> {
                if (last == null || now - last >= cooldownMs) {
                    shouldSend[0] = true;
                    return now;
                }
                return last;
            });

            if (!shouldSend[0]) {
                suppressedCount.computeIfAbsent(key, k -> new AtomicInteger()).incrementAndGet();
                return;
            }

            AtomicInteger counter = suppressedCount.get(key);
            int merged = counter != null ? counter.getAndSet(0) : 0;

            String subject = "[Hairapy ALERT] " + title;
            String html = buildHtml(key, title, detail, merged);
            String to = alertEmail;
            executor.execute(() -> {
                try {
                    emailService.sendAlertEmail(to, subject, html);
                } catch (Exception e) {
                    log.error("Không gửi được email cảnh báo [{}]: {}", key, e.getMessage());
                }
            });
        } catch (Exception e) {
            log.error("AlertService lỗi nội bộ (bỏ qua): {}", e.getMessage());
        }
    }

    @PreDestroy
    void shutdown() {
        executor.shutdown();
    }

    private String buildHtml(String key, String title, String detail, int merged) {
        String time = ZonedDateTime.now(VN_ZONE).format(TIME_FMT);
        StringBuilder sb = new StringBuilder();
        sb.append("<div style=\"font-family:sans-serif;max-width:560px;margin:0 auto\">");
        sb.append("<h2 style=\"color:#c62828\">").append(esc(title)).append("</h2>");
        sb.append("<p><b>Loại lỗi:</b> ").append(esc(key)).append("<br>");
        sb.append("<b>Thời điểm:</b> ").append(time).append(" (giờ VN)</p>");
        sb.append("<pre style=\"background:#f5f5f5;padding:12px;border-radius:8px;white-space:pre-wrap;")
                .append("word-break:break-word\">").append(esc(detail)).append("</pre>");
        if (merged > 0) {
            sb.append("<p>Lỗi này đã xảy ra thêm <b>").append(merged)
                    .append("</b> lần kể từ cảnh báo trước (đã gộp để tránh spam).</p>");
        }
        sb.append("<p style=\"color:#777;font-size:12px\">Xem chi tiết ở log Railway / Sentry. ")
                .append("Mỗi loại lỗi chỉ báo tối đa 1 mail mỗi ").append(cooldownMinutes).append(" phút.</p>");
        sb.append("</div>");
        return sb.toString();
    }

    private static String esc(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
