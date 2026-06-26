package com.hairapy.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import vn.payos.PayOS;

/**
 * Cấu hình kết nối SDK PayOS để thực hiện thanh toán hóa đơn.
 */
@Slf4j
@Configuration
public class PayOSConfig {

    @Value("${app.payos.client-id}")
    private String clientId;

    @Value("${app.payos.api-key}")
    private String apiKey;

    @Value("${app.payos.checksum-key}")
    private String checksumKey;

    @Bean
    public PayOS payOS() {
        String maskedClientId = (clientId != null && clientId.trim().length() > 6) ? clientId.trim().substring(0, 6) + "..." : "empty/null";
        int apiKeyLen = apiKey != null ? apiKey.trim().length() : 0;
        int checksumKeyLen = checksumKey != null ? checksumKey.trim().length() : 0;

        log.info("[PAYOS CONFIG DIAGNOSTIC] clientId={}, apiKeyLength={}, checksumKeyLength={}", 
            maskedClientId, apiKeyLen, checksumKeyLen);
            
        // Kiểm tra xem có khoảng trắng thừa hay không
        if (clientId != null && !clientId.equals(clientId.trim())) {
            log.warn("[PAYOS CONFIG WARNING] Client ID chứa khoảng trắng thừa!");
        }
        if (apiKey != null && !apiKey.equals(apiKey.trim())) {
            log.warn("[PAYOS CONFIG WARNING] API Key chứa khoảng trắng thừa!");
        }
        if (checksumKey != null && !checksumKey.equals(checksumKey.trim())) {
            log.warn("[PAYOS CONFIG WARNING] Checksum Key chứa khoảng trắng thừa!");
        }

        // Tự động trim các key để tránh lỗi copy paste thừa khoảng trắng/newline
        String cleanedClientId = clientId != null ? clientId.trim() : "";
        String cleanedApiKey = apiKey != null ? apiKey.trim() : "";
        String cleanedChecksumKey = checksumKey != null ? checksumKey.trim() : "";

        return new PayOS(cleanedClientId, cleanedApiKey, cleanedChecksumKey);
    }
}
