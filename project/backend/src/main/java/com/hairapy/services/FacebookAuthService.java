package com.hairapy.services;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.Map;

/**
 * Xác minh access token Facebook OAuth phía frontend gửi lên, và lấy thông tin hồ sơ người dùng.
 * Sử dụng Graph API debug_token để kiểm tra tính hợp lệ và app_id của token.
 */
@Slf4j
@Service
public class FacebookAuthService {

    private final RestTemplate restTemplate;

    @Value("${app.oauth.facebook.app-id:}")
    private String facebookAppId;

    @Value("${app.oauth.facebook.app-secret:}")
    private String facebookAppSecret;

    public FacebookAuthService(RestTemplateBuilder restTemplateBuilder) {
        this.restTemplate = restTemplateBuilder
                .connectTimeout(Duration.ofSeconds(10))
                .readTimeout(Duration.ofSeconds(10))
                .build();
    }

    public FacebookProfile verifyAndFetchProfile(String accessToken) {
        String appAccessToken = facebookAppId + "|" + facebookAppSecret;
        String debugUrl = "https://graph.facebook.com/debug_token?input_token=" + accessToken
                + "&access_token=" + appAccessToken;

        Map<?, ?> debugResponse;
        try {
            debugResponse = restTemplate.getForObject(debugUrl, Map.class);
        } catch (Exception e) {
            log.warn("Lỗi khi gọi Facebook debug_token: {}", e.getMessage());
            throw new IllegalArgumentException("Facebook access token không hợp lệ hoặc đã hết hạn.");
        }

        if (debugResponse == null || !debugResponse.containsKey("data")) {
            throw new IllegalArgumentException("Phản hồi từ Facebook debug_token không hợp lệ.");
        }

        Map<?, ?> data = (Map<?, ?>) debugResponse.get("data");
        boolean isValid = Boolean.parseBoolean(String.valueOf(data.get("is_valid")));
        String appId = String.valueOf(data.get("app_id"));

        if (!isValid || !facebookAppId.equals(appId)) {
            log.warn("Facebook access token không hợp lệ hoặc app_id không khớp: isValid={}, appId={}", isValid, appId);
            throw new IllegalArgumentException("Facebook access token không hợp lệ hoặc không thuộc ứng dụng này.");
        }

        String profileUrl = "https://graph.facebook.com/me?fields=id,name,email&access_token=" + accessToken;
        Map<?, ?> profile;
        try {
            profile = restTemplate.getForObject(profileUrl, Map.class);
        } catch (Exception e) {
            log.warn("Lỗi khi lấy thông tin hồ sơ Facebook: {}", e.getMessage());
            throw new IllegalArgumentException("Không thể lấy thông tin người dùng từ Facebook.");
        }

        if (profile == null) {
            throw new IllegalArgumentException("Không lấy được hồ sơ Facebook.");
        }

        String id = String.valueOf(profile.get("id"));
        Object emailObj = profile.get("email");
        String email = (emailObj != null && !String.valueOf(emailObj).isBlank())
                ? String.valueOf(emailObj)
                : id + "@facebook.hairapy.vn";

        String name = (profile.get("name") != null && !String.valueOf(profile.get("name")).isBlank())
                ? String.valueOf(profile.get("name"))
                : "Người dùng Facebook";

        return new FacebookProfile(email, id, name);
    }

    public record FacebookProfile(String email, String id, String name) {}
}
