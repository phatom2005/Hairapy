package com.hairapy.services;

import com.hairapy.exceptions.ResourceNotFoundException;
import com.hairapy.models.*;
import com.hairapy.repositories.PaymentRepository;
import com.hairapy.repositories.SubscriptionRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Service xử lý thanh toán qua PayOS REST API (không dùng SDK).
 * Gọi trực tiếp https://api-merchant.payos.vn/v2/payment-requests
 */
@Slf4j
@Service
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    private static final String PAYOS_API_URL = "https://api-merchant.payos.vn/v2/payment-requests";

    @Value("${app.payos.client-id}")
    private String clientId;

    @Value("${app.payos.api-key}")
    private String apiKey;

    @Value("${app.payos.checksum-key}")
    private String checksumKey;

    @Value("${app.frontend.url}")
    private String frontendUrl;

    public PaymentService(PaymentRepository paymentRepository,
                          SubscriptionRepository subscriptionRepository,
                          ObjectMapper objectMapper) {
        this.paymentRepository = paymentRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.objectMapper = objectMapper;
        this.restTemplate = new RestTemplate();
    }

    /**
     * Tạo đường dẫn thanh toán qua PayOS REST API.
     */
    @Transactional
    public String createPaymentLink(User user, String planCode) throws Exception {
        SubscriptionPlan plan = SubscriptionPlan.valueOf(planCode.toUpperCase());
        int amount;

        if (plan == SubscriptionPlan.PRO) {
            amount = 49000; // Gói tuần 49,000 VND
        } else if (plan == SubscriptionPlan.PREMIUM) {
            amount = 99000; // Gói tháng 99,000 VNĐ
        } else {
            throw new IllegalArgumentException("Gói dịch vụ không hợp lệ");
        }

        // PayOS giới hạn orderCode tối đa 15 chữ số
        long orderCode = System.currentTimeMillis() * 10 + ThreadLocalRandom.current().nextInt(10);

        // Lưu giao dịch PENDING vào DB
        Payment payment = Payment.builder()
                .user(user)
                .orderCode(orderCode)
                .plan(plan)
                .amount(amount)
                .status(PaymentStatus.PENDING)
                .build();
        paymentRepository.save(payment);

        log.info("Khởi tạo thanh toán PayOS: orderCode={}, user={}, plan={}, amount={}",
                orderCode, user.getEmail(), plan, amount);

        // Chuẩn hóa URL tránh double slash
        String baseUrl = frontendUrl.trim();
        if (baseUrl.endsWith("/")) {
            baseUrl = baseUrl.substring(0, baseUrl.length() - 1);
        }
        String cancelUrl = baseUrl + "/payment/cancel";
        String returnUrl = baseUrl + "/payment/success";
        String description = "Hairapy " + planCode;

        // Tạo signature: HMAC_SHA256(checksumKey, "amount=...&cancelUrl=...&description=...&orderCode=...&returnUrl=...")
        // Các field sắp xếp theo thứ tự alphabet
        String signData = "amount=" + amount
                + "&cancelUrl=" + cancelUrl
                + "&description=" + description
                + "&orderCode=" + orderCode
                + "&returnUrl=" + returnUrl;

        String signature = hmacSHA256(checksumKey.trim(), signData);

        // Tạo request body
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("orderCode", orderCode);
        body.put("amount", amount);
        body.put("description", description);
        body.put("cancelUrl", cancelUrl);
        body.put("returnUrl", returnUrl);
        body.put("signature", signature);
        body.put("items", List.of(Map.of(
                "name", "Hairapy " + planCode,
                "quantity", 1,
                "price", amount
        )));

        // Gọi PayOS REST API
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-client-id", clientId.trim());
        headers.set("x-api-key", apiKey.trim());

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

        log.debug("PayOS request body: {}", objectMapper.writeValueAsString(body));

        ResponseEntity<String> response = restTemplate.exchange(
                PAYOS_API_URL, HttpMethod.POST, request, String.class);

        // Parse response lấy checkoutUrl
        JsonNode root = objectMapper.readTree(response.getBody());
        String code = root.path("code").asText();

        if (!"00".equals(code)) {
            String desc = root.path("desc").asText("Unknown error");
            log.error("PayOS API trả về lỗi: code={}, desc={}", code, desc);
            throw new RuntimeException("PayOS API error: " + desc);
        }

        String checkoutUrl = root.path("data").path("checkoutUrl").asText();
        log.info("Tạo link thanh toán thành công: orderCode={}, checkoutUrl={}", orderCode, checkoutUrl);
        return checkoutUrl;
    }

    /**
     * Xử lý webhook từ PayOS — tự verify signature bằng HMAC-SHA256.
     */
    @Transactional
    public void handleWebhook(Map<String, Object> webhookBody) throws Exception {
        // Lấy data và signature từ webhook
        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) webhookBody.get("data");
        String receivedSignature = (String) webhookBody.get("signature");

        if (data == null || receivedSignature == null) {
            throw new IllegalArgumentException("Webhook body thiếu data hoặc signature");
        }

        // Tạo signature từ data để verify
        String signData = buildSignatureData(data);
        String expectedSignature = hmacSHA256(checksumKey.trim(), signData);

        if (!expectedSignature.equals(receivedSignature)) {
            log.error("Webhook signature không khớp! expected={}, received={}", expectedSignature, receivedSignature);
            throw new SecurityException("Webhook signature không hợp lệ");
        }

        long orderCode = ((Number) data.get("orderCode")).longValue();
        String code = String.valueOf(data.get("code"));
        String reference = data.get("reference") != null ? String.valueOf(data.get("reference")) : null;

        log.info("Nhận webhook PayOS: orderCode={}, code={}, reference={}", orderCode, code, reference);

        // Bỏ qua webhook test từ PayOS
        if (orderCode == 123) {
            log.info("Nhận webhook thử nghiệm từ PayOS. Bỏ qua xử lý cơ sở dữ liệu.");
            return;
        }

        // Tìm giao dịch trong DB
        Payment payment = paymentRepository.findByOrderCode(orderCode)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Không tìm thấy giao dịch thanh toán với orderCode: " + orderCode));

        if ("00".equals(code)) {
            // Thanh toán thành công
            payment.setStatus(PaymentStatus.PAID);
            payment.setPaidAt(LocalDateTime.now());
            payment.setPayosTransactionId(reference);
            paymentRepository.save(payment);

            User user = payment.getUser();

            // Hủy gói active cũ nếu có
            subscriptionRepository.findByUserIdAndStatus(user.getId(), SubscriptionStatus.ACTIVE)
                    .ifPresent(oldSub -> {
                        oldSub.setStatus(SubscriptionStatus.EXPIRED);
                        subscriptionRepository.save(oldSub);
                        log.info("Hủy gói active cũ ID: {} của user: {}", oldSub.getId(), user.getEmail());
                    });

            // Tạo subscription mới
            LocalDateTime startDate = LocalDateTime.now();
            LocalDateTime endDate = (payment.getPlan() == SubscriptionPlan.PRO)
                    ? startDate.plusDays(7)    // Gói Tuần
                    : startDate.plusDays(30);  // Gói Tháng (PREMIUM)

            Subscription newSub = Subscription.builder()
                    .user(user)
                    .plan(payment.getPlan())
                    .status(SubscriptionStatus.ACTIVE)
                    .startDate(startDate)
                    .endDate(endDate)
                    .build();
            subscriptionRepository.save(newSub);

            log.info("Nâng cấp gói thành công: user={}, plan={}, hết hạn={}",
                    user.getEmail(), payment.getPlan(), endDate);

        } else {
            payment.setStatus(PaymentStatus.CANCELLED);
            paymentRepository.save(payment);
            log.warn("Giao dịch thất bại/hủy: orderCode={}, code={}", orderCode, code);
        }
    }

    /**
     * Lấy trạng thái thanh toán từ PayOS REST API.
     */
    public String getPaymentStatus(long orderCode) throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.set("x-client-id", clientId.trim());
        headers.set("x-api-key", apiKey.trim());

        HttpEntity<Void> request = new HttpEntity<>(headers);
        ResponseEntity<String> response = restTemplate.exchange(
                PAYOS_API_URL + "/" + orderCode, HttpMethod.GET, request, String.class);

        JsonNode root = objectMapper.readTree(response.getBody());
        return root.path("data").path("status").asText();
    }

    // === Utility methods ===

    /**
     * Tạo HMAC-SHA256 signature.
     */
    private String hmacSHA256(String key, String data) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        SecretKeySpec secretKey = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        mac.init(secretKey);
        byte[] hash = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        StringBuilder hexString = new StringBuilder();
        for (byte b : hash) {
            String hex = Integer.toHexString(0xff & b);
            if (hex.length() == 1) hexString.append('0');
            hexString.append(hex);
        }
        return hexString.toString();
    }

    /**
     * Tạo chuỗi signature data từ webhook data — sắp xếp key theo alphabet.
     */
    private String buildSignatureData(Map<String, Object> data) {
        TreeMap<String, Object> sorted = new TreeMap<>(data);
        StringBuilder sb = new StringBuilder();
        for (Map.Entry<String, Object> entry : sorted.entrySet()) {
            if (sb.length() > 0) sb.append("&");
            sb.append(entry.getKey()).append("=").append(entry.getValue());
        }
        return sb.toString();
    }
}
