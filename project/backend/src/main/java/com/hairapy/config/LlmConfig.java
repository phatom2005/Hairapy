package com.hairapy.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

/**
 * Cấu hình kết nối tới LLM API (Google Gemini) — dùng cho tính năng AI Stylist
 * (tư vấn kiểu tóc cá nhân hoá, chỉ dành Premium). Không tự train model — gọi
 * API bên thứ 3, giống pattern AiLabConfig (Face Mesh / Hair Swap).
 */
@Configuration
public class LlmConfig {

    @Value("${app.llm.api-key}")
    private String apiKey;

    @Value("${app.llm.model:gemini-2.0-flash}")
    private String model;

    @Value("${app.llm.timeout-ms:15000}")
    private int timeoutMs;

    public String getApiKey() {
        return apiKey;
    }

    public String getModel() {
        return model;
    }

    public int getTimeoutMs() {
        return timeoutMs;
    }

    /**
     * RestTemplate riêng cho LLM call — timeout tách biệt với aiRestTemplate (AILab)
     * vì đây là 2 API bên thứ 3 khác nhau, có thể cần tinh chỉnh timeout độc lập sau này.
     */
    @Bean
    public RestTemplate llmRestTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(timeoutMs);
        factory.setReadTimeout(timeoutMs);
        return new RestTemplate(factory);
    }
}
