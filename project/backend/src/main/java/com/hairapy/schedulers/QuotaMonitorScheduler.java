package com.hairapy.schedulers;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.hairapy.config.AiLabConfig;
import com.hairapy.services.AlertService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

/**
 * Mỗi ngày kiểm tra hạn mức còn lại của 2 dịch vụ bên thứ 3 và gửi email cảnh báo (qua AlertService)
 * khi sắp hết, để admin nạp thêm TRƯỚC khi user gặp lỗi:
 *  - AILabTools: GET /api/common/query-credits (balance / total / balance_warning theo từng API con)
 *  - Cloudinary: Admin API usage() (credits đã dùng theo % của gói)
 * Mọi lỗi khi gọi đều chỉ ghi log, không ảnh hưởng ứng dụng. Mail bị bỏ qua nếu chưa cấu hình ALERT_EMAIL.
 */
@Slf4j
@Component
public class QuotaMonitorScheduler {

    private static final String AILAB_CREDITS_URL = "https://www.ailabapi.com/api/common/query-credits";

    private final AiLabConfig aiLabConfig;
    private final RestTemplate aiRestTemplate;
    private final Cloudinary cloudinary;
    private final AlertService alertService;

    /** Cảnh báo khi phần còn lại ≤ ngưỡng này (% của tổng). */
    @Value("${app.quota-alert.threshold-percent:20}")
    private double thresholdPercent;

    public QuotaMonitorScheduler(AiLabConfig aiLabConfig,
                                 @Qualifier("aiRestTemplate") RestTemplate aiRestTemplate,
                                 Cloudinary cloudinary,
                                 AlertService alertService) {
        this.aiLabConfig = aiLabConfig;
        this.aiRestTemplate = aiRestTemplate;
        this.cloudinary = cloudinary;
        this.alertService = alertService;
    }

    /** 9h sáng giờ VN mỗi ngày. */
    @Scheduled(cron = "0 0 9 * * *", zone = "Asia/Ho_Chi_Minh")
    public void checkQuotas() {
        checkAiLab();
        checkCloudinary();
    }

    @SuppressWarnings("unchecked")
    void checkAiLab() {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("ailabapi-api-key", aiLabConfig.getApiKey());
            Map<String, Object> body = aiRestTemplate
                    .exchange(AILAB_CREDITS_URL, HttpMethod.GET, new HttpEntity<>(headers), Map.class)
                    .getBody();
            if (body == null) return;
            log.info("AILab credits: {}", truncate(String.valueOf(body), 600));

            Object data = body.get("data");
            if (!(data instanceof List<?> items)) {
                log.warn("Không đọc được danh sách credits AILab (định dạng lạ), bỏ qua.");
                return;
            }

            StringBuilder low = new StringBuilder();
            for (Object item : items) {
                if (!(item instanceof Map<?, ?> m)) continue;
                Double balance = toDouble(m.get("balance"));
                Double total = toDouble(m.get("total"));
                Double warning = toDouble(m.get("balance_warning"));
                if (balance == null) continue;
                boolean belowWarning = warning != null && warning > 0 && balance <= warning;
                boolean belowPercent = total != null && total > 0 && (balance / total * 100) <= thresholdPercent;
                if (belowWarning || belowPercent) {
                    low.append("- ").append(m.get("api_name") != null ? m.get("api_name") : "API")
                       .append(": còn ").append(balance.longValue())
                       .append(total != null ? " / " + total.longValue() : "").append('\n');
                }
            }
            if (low.length() > 0) {
                alertService.alert("QUOTA_AILAB", "AILabTools sắp hết credit", low.toString());
            }
        } catch (Exception e) {
            log.warn("Không kiểm tra được quota AILab: {}", e.getMessage());
        }
    }

    void checkCloudinary() {
        try {
            Map<?, ?> usage = cloudinary.api().usage(ObjectUtils.emptyMap());
            Object credits = usage.get("credits");
            Double usedPercent = null;
            if (credits instanceof Map<?, ?> c) {
                usedPercent = toDouble(c.get("used_percent"));
            }
            log.info("Cloudinary usage: plan={}, credits.used_percent={}", usage.get("plan"), usedPercent);
            if (usedPercent != null && usedPercent >= 100 - thresholdPercent) {
                alertService.alert("QUOTA_CLOUDINARY", "Cloudinary sắp hết hạn mức",
                        "Đã dùng " + usedPercent.longValue() + "% credits của gói (" + usage.get("plan") + ").");
            }
        } catch (Exception e) {
            log.warn("Không kiểm tra được quota Cloudinary: {}", e.getMessage());
        }
    }

    private static Double toDouble(Object o) {
        if (o instanceof Number n) return n.doubleValue();
        if (o == null) return null;
        try {
            return Double.parseDouble(String.valueOf(o));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static String truncate(String s, int max) {
        return s.length() <= max ? s : s.substring(0, max) + "…";
    }
}
