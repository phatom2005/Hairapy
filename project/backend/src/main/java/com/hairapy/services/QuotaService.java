package com.hairapy.services;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.hairapy.config.AiLabConfig;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Lấy hạn mức còn lại của AILabTools và Cloudinary để hiện trên dashboard admin.
 * Kết quả được cache trong bộ nhớ (TTL 10 phút) để mỗi lần admin mở dashboard không gọi API vendor.
 * Admin bấm "Làm mới" thì bỏ qua cache nhưng vẫn giới hạn tối thiểu 60 giây giữa 2 lần gọi thật.
 * Lỗi khi gọi vendor chỉ được ghi vào trường error của từng nguồn, không ném exception.
 */
@Slf4j
@Service
public class QuotaService {

    private static final String AILAB_CREDITS_URL = "https://www.ailabapi.com/api/common/query-credits";
    private static final Duration CACHE_TTL = Duration.ofMinutes(10);
    private static final Duration MIN_REFRESH_INTERVAL = Duration.ofSeconds(60);

    public record AiLabItem(String name, Long balance, Long total, Long warning, Double percentLeft) {}

    public record AiLabQuota(List<AiLabItem> items, String error) {}

    public record CloudinaryQuota(String plan, Double usedPercent, Double usage, Double limit, String error) {}

    public record QuotaSnapshot(AiLabQuota ailab, CloudinaryQuota cloudinary, LocalDateTime fetchedAt) {}

    private final AiLabConfig aiLabConfig;
    private final RestTemplate aiRestTemplate;
    private final Cloudinary cloudinary;

    private volatile QuotaSnapshot cached;

    public QuotaService(AiLabConfig aiLabConfig,
                        @Qualifier("aiRestTemplate") RestTemplate aiRestTemplate,
                        Cloudinary cloudinary) {
        this.aiLabConfig = aiLabConfig;
        this.aiRestTemplate = aiRestTemplate;
        this.cloudinary = cloudinary;
    }

    /**
     * @param forceRefresh true = bỏ qua cache (vẫn bị chặn nếu lần gọi thật gần nhất cách chưa tới 60 giây)
     */
    public synchronized QuotaSnapshot getSnapshot(boolean forceRefresh) {
        QuotaSnapshot current = cached;
        if (current != null) {
            Duration age = Duration.between(current.fetchedAt(), LocalDateTime.now());
            Duration maxAge = forceRefresh ? MIN_REFRESH_INTERVAL : CACHE_TTL;
            if (age.compareTo(maxAge) < 0) return current;
        }
        QuotaSnapshot fresh = new QuotaSnapshot(fetchAiLab(), fetchCloudinary(), LocalDateTime.now());
        cached = fresh;
        return fresh;
    }

    @SuppressWarnings("unchecked")
    AiLabQuota fetchAiLab() {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("ailabapi-api-key", aiLabConfig.getApiKey());
            Map<String, Object> body = aiRestTemplate
                    .exchange(AILAB_CREDITS_URL, HttpMethod.GET, new HttpEntity<>(headers), Map.class)
                    .getBody();
            if (body == null || !(body.get("data") instanceof List<?> data)) {
                return new AiLabQuota(List.of(), "AILabTools trả về định dạng không đọc được");
            }
            List<AiLabItem> items = new ArrayList<>();
            for (Object o : data) {
                if (!(o instanceof Map<?, ?> m)) continue;
                Double balance = toDouble(m.get("balance"));
                if (balance == null) continue;
                Double total = toDouble(m.get("total"));
                Double warning = toDouble(m.get("balance_warning"));
                Double percentLeft = (total != null && total > 0) ? Math.round(balance / total * 1000.0) / 10.0 : null;
                items.add(new AiLabItem(
                        m.get("api_name") != null ? String.valueOf(m.get("api_name")) : "API",
                        balance.longValue(),
                        total != null ? total.longValue() : null,
                        warning != null ? warning.longValue() : null,
                        percentLeft));
            }
            return new AiLabQuota(items, null);
        } catch (Exception e) {
            log.warn("Không lấy được quota AILab cho dashboard: {}", e.getMessage());
            return new AiLabQuota(List.of(), "Không gọi được AILabTools");
        }
    }

    CloudinaryQuota fetchCloudinary() {
        try {
            Map<?, ?> usage = cloudinary.api().usage(ObjectUtils.emptyMap());
            String plan = usage.get("plan") != null ? String.valueOf(usage.get("plan")) : null;
            Double usedPercent = null;
            Double used = null;
            Double limit = null;
            if (usage.get("credits") instanceof Map<?, ?> c) {
                usedPercent = toDouble(c.get("used_percent"));
                used = toDouble(c.get("usage"));
                limit = toDouble(c.get("limit"));
            }
            return new CloudinaryQuota(plan, usedPercent, used, limit, null);
        } catch (Exception e) {
            log.warn("Không lấy được quota Cloudinary cho dashboard: {}", e.getMessage());
            return new CloudinaryQuota(null, null, null, null, "Không gọi được Cloudinary");
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
}
