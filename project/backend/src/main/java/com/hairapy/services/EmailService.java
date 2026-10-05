package com.hairapy.services;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Gửi email giao dịch (transactional email) qua Resend REST API trực tiếp
 * (không dùng SDK — cùng triết lý với PaymentService gọi PayOS REST API thẳng).
 */
@Slf4j
@Service
public class EmailService {

    private static final String RESEND_API_URL = "https://api.resend.com/emails";

    private final RestTemplate restTemplate;

    @Value("${app.mail.resend.api-key:}")
    private String resendApiKey;

    @Value("${app.mail.from:onboarding@resend.dev}")
    private String fromAddress;

    public EmailService(org.springframework.boot.web.client.RestTemplateBuilder restTemplateBuilder) {
        this.restTemplate = restTemplateBuilder
                .connectTimeout(Duration.ofSeconds(10))
                .readTimeout(Duration.ofSeconds(10))
                .build();
    }

    /**
     * Gửi email đặt lại mật khẩu. Không throw ra ngoài nếu Resend lỗi — request
     * forgot-password vẫn luôn trả về thành công (generic) dù gửi mail thất bại,
     * tránh lộ thông tin email có tồn tại hay không và tránh chặn UX khi Resend tạm trục trặc.
     */
    public void sendPasswordResetEmail(String toEmail, String resetLink) {
        send(toEmail, "Đặt lại mật khẩu Hairapy", buildResetHtml(resetLink), "đặt lại mật khẩu");
    }

    /**
     * Gửi email xác minh tài khoản. Không throw ra ngoài nếu Resend lỗi — user vẫn được tạo,
     * có thể bấm "Gửi lại email xác minh" ở trang đăng nhập.
     */
    public void sendVerificationEmail(String toEmail, String verifyLink) {
        send(toEmail, "Xác minh email Hairapy", buildVerifyHtml(verifyLink), "xác minh tài khoản");
    }

    private void send(String toEmail, String subject, String html, String label) {
        if (resendApiKey == null || resendApiKey.isBlank()) {
            log.warn("RESEND_API_KEY chưa được cấu hình. Bỏ qua gửi email {} tới {}", label, toEmail);
            return;
        }

        Map<String, Object> body = new HashMap<>();
        body.put("from", fromAddress);
        body.put("to", List.of(toEmail));
        body.put("subject", subject);
        body.put("html", html);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(resendApiKey);

        try {
            restTemplate.exchange(RESEND_API_URL, HttpMethod.POST, new HttpEntity<>(body, headers), String.class);
            log.info("Đã gửi email {} tới {}", label, toEmail);
        } catch (Exception e) {
            log.error("Lỗi gửi email {} tới {}: {}", label, toEmail, e.getMessage());
        }
    }

    private String buildVerifyHtml(String verifyLink) {
        return "<div style=\"font-family:sans-serif;max-width:480px;margin:0 auto\">"
                + "<h2>Xác minh email Hairapy</h2>"
                + "<p>Cảm ơn bạn đã đăng ký Hairapy! Bấm nút bên dưới để xác minh địa chỉ email và bắt đầu sử dụng.</p>"
                + "<p><a href=\"" + verifyLink + "\" style=\"display:inline-block;padding:12px 24px;"
                + "background:#ff4d94;color:#fff;border-radius:24px;text-decoration:none;font-weight:bold\">"
                + "Xác minh email</a></p>"
                + "<p>Liên kết có hiệu lực trong 24 giờ. Nếu bạn không đăng ký tài khoản này, hãy bỏ qua email này.</p>"
                + "</div>";
    }

    private String buildResetHtml(String resetLink) {
        return "<div style=\"font-family:sans-serif;max-width:480px;margin:0 auto\">"
                + "<h2>Đặt lại mật khẩu Hairapy</h2>"
                + "<p>Bạn (hoặc ai đó) vừa yêu cầu đặt lại mật khẩu cho tài khoản Hairapy này.</p>"
                + "<p><a href=\"" + resetLink + "\" style=\"display:inline-block;padding:12px 24px;"
                + "background:#ff4d94;color:#fff;border-radius:24px;text-decoration:none;font-weight:bold\">"
                + "Đặt lại mật khẩu</a></p>"
                + "<p>Liên kết có hiệu lực trong 30 phút. Nếu không phải bạn yêu cầu, hãy bỏ qua email này.</p>"
                + "</div>";
    }
}
