package com.hairapy.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import vn.payos.PayOS;

/**
 * Cấu hình kết nối SDK PayOS để thực hiện thanh toán hóa đơn.
 */
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
        // Khởi tạo đối tượng PayOS từ thông tin cấu hình API Keys
        return new PayOS(clientId, apiKey, checksumKey);
    }
}
