package com.hairapy.services;

import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Dịch vụ gửi sự kiện phía server lên GA4 qua Measurement Protocol.
 * Chạy bất đồng bộ, timeout 5s, bắt mọi ngoại lệ và ghi log cảnh báo để không ảnh hưởng luồng chính.
 */
@Service
public class GaMeasurementService {

    private static final Logger log = LoggerFactory.getLogger(GaMeasurementService.class);
    private static final String MP_URL = "https://www.google-analytics.com/mp/collect";

    @Value("${app.ga.measurement-id:}")
    private String measurementId;

    @Value("${app.ga.mp-api-secret:}")
    private String mpApiSecret;

    private RestTemplate restTemplate;
    private final ExecutorService executor = Executors.newFixedThreadPool(2);

    public GaMeasurementService(RestTemplateBuilder restTemplateBuilder) {
        this.restTemplate = restTemplateBuilder
                .connectTimeout(Duration.ofSeconds(5))
                .readTimeout(Duration.ofSeconds(5))
                .build();
    }

    public void setRestTemplate(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public void setConfig(String measurementId, String mpApiSecret) {
        this.measurementId = measurementId;
        this.mpApiSecret = mpApiSecret;
    }

    public boolean isConfigured() {
        return measurementId != null && !measurementId.isBlank()
                && mpApiSecret != null && !mpApiSecret.isBlank();
    }

    /**
     * Gửi sự kiện bất đồng bộ qua thread pool.
     */
    public void send(String clientId, Long userId, String eventName, Map<String, Object> params) {
        if (!isConfigured()) {
            log.debug("GA4 MP chưa được cấu hình, bỏ qua sự kiện {}", eventName);
            return;
        }

        executor.submit(() -> sendSync(clientId, userId, eventName, params));
    }

    /**
     * Gửi sự kiện đồng bộ (dùng cho test hoặc khi cần đợi kết quả).
     */
    public void sendSync(String clientId, Long userId, String eventName, Map<String, Object> params) {
        if (!isConfigured()) {
            log.debug("GA4 MP chưa được cấu hình, bỏ qua sự kiện {}", eventName);
            return;
        }

        try {
            String resolvedClientId = (clientId != null && !clientId.isBlank())
                    ? clientId
                    : ("server." + (userId != null ? userId : "anon"));

            String url = String.format("%s?measurement_id=%s&api_secret=%s", MP_URL, measurementId, mpApiSecret);

            Map<String, Object> eventParams = new HashMap<>();
            if (params != null) {
                eventParams.putAll(params);
            }
            eventParams.put("engagement_time_msec", 1);

            Map<String, Object> eventMap = new HashMap<>();
            eventMap.put("name", eventName);
            eventMap.put("params", eventParams);

            Map<String, Object> payload = new HashMap<>();
            payload.put("client_id", resolvedClientId);
            if (userId != null) {
                payload.put("user_id", String.valueOf(userId));
            }
            payload.put("events", List.of(eventMap));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);

            restTemplate.postForObject(url, entity, String.class);
            log.debug("Đã gửi GA4 MP event: {} cho clientId={}, userId={}", eventName, resolvedClientId, userId);
        } catch (Exception e) {
            log.warn("Lỗi khi gửi GA4 Measurement Protocol event {}: {}", eventName, e.getMessage());
        }
    }

    @PreDestroy
    public void shutdown() {
        executor.shutdown();
    }
}

