package com.hairapy.services;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.Map;

/**
 * Xác minh access token Google Identity Services phía frontend gửi lên, và lấy hồ sơ user.
 * Không dùng Client Secret — chỉ xác minh 'aud' (audience) của token khớp Client ID cấu hình,
 * đủ an toàn cho flow token phía client (không phải authorization-code exchange server-side).
 */
@Slf4j
@Service
public class GoogleAuthService {

    private final RestTemplate restTemplate;

    @Value("${app.oauth.google.client-id:}")
    private String googleClientId;

    public GoogleAuthService(org.springframework.boot.web.client.RestTemplateBuilder restTemplateBuilder) {
        this.restTemplate = restTemplateBuilder
                .connectTimeout(Duration.ofSeconds(10))
                .readTimeout(Duration.ofSeconds(10))
                .build();
    }

    public GoogleProfile verifyAndFetchProfile(String accessToken) {
        Map<?, ?> tokenInfo;
        try {
            tokenInfo = restTemplate.getForObject(
                    "https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=" + accessToken, Map.class);
        } catch (Exception e) {
            throw new IllegalArgumentException("Google access token không hợp lệ hoặc đã hết hạn.");
        }
        if (tokenInfo == null || !googleClientId.equals(tokenInfo.get("aud"))) {
            log.warn("Google access token có 'aud' không khớp Client ID đã cấu hình.");
            throw new IllegalArgumentException("Google access token không hợp lệ.");
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        ResponseEntity<Map> response = restTemplate.exchange(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                HttpMethod.GET, new HttpEntity<>(headers), Map.class);
        Map<?, ?> profile = response.getBody();
        if (profile == null || profile.get("email") == null) {
            throw new IllegalArgumentException("Không lấy được thông tin tài khoản Google.");
        }

        boolean emailVerified = Boolean.parseBoolean(String.valueOf(profile.get("email_verified")));
        if (!emailVerified) {
            throw new IllegalArgumentException("Email Google chưa được xác thực.");
        }

        String email = String.valueOf(profile.get("email"));
        String sub = String.valueOf(profile.get("sub"));
        String name = profile.get("name") != null ? String.valueOf(profile.get("name")) : email;

        return new GoogleProfile(email, sub, name);
    }

    public record GoogleProfile(String email, String sub, String name) {}
}
