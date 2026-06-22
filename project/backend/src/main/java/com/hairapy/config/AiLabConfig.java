package com.hairapy.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

/**
 * Cấu hình các kết nối đến API bên ngoài của AILabTools.
 */
@Configuration
public class AiLabConfig {

    @Value("${app.ailab.api-key}")
    private String apiKey;

    @Value("${app.ailab.timeout-ms:10000}")
    private int timeoutMs;

    public String getApiKey() {
        return apiKey;
    }

    public int getTimeoutMs() {
        return timeoutMs;
    }

    /**
     * Khởi tạo RestTemplate bean được cấu hình timeout đầy đủ để tránh chặn luồng lâu.
     */
    @Bean
    public RestTemplate aiRestTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(timeoutMs);
        factory.setReadTimeout(timeoutMs);
        return new RestTemplate(factory);
    }
}
