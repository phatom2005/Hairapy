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

    private final SubscriptionService subscriptionService;
    private final AlertService alertService;

    public PaymentService(PaymentRepository paymentRepository,
                          SubscriptionRepository subscriptionRepository,
                          SubscriptionService subscriptionService,
                          AlertService alertService,
                          ObjectMapper objectMapper,
                          org.springframework.boot.web.client.RestTemplateBuilder restTemplateBuilder) {
        this.paymentRepository = paymentRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.subscriptionService = subscriptionService;
        this.alertService = alertService;
        this.objectMapper = objectMapper;
        this.restTemplate = restTemplateBuilder
                .connectTimeout(java.time.Duration.ofSeconds(10))
                .readTimeout(java.time.Duration.ofSeconds(10))
                .build();
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

        // Đang hưởng Gói Tháng (PREMIUM) còn hạn mà mua Gói Tuần (PRO) → chặn, tránh tụt quyền lợi ngay lập tức
        // (grantSubscriptionIfNeeded thay gói cũ bằng gói mới). Mua gói cao hơn / cùng gói = nâng cấp / gia hạn.
        if (plan == SubscriptionPlan.PRO
                && subscriptionService.getEffectivePlan(user.getId()) == SubscriptionPlan.PREMIUM) {
            throw new IllegalArgumentException("Bạn đang dùng Gói Tháng. Hãy gia hạn Gói Tháng để giữ nguyên quyền lợi.");
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

        if (!java.security.MessageDigest.isEqual(
                expectedSignature.getBytes(StandardCharsets.UTF_8),
                receivedSignature.getBytes(StandardCharsets.UTF_8))) {
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

        // Giao dịch đã PAID: webhook lặp / PayOS gửi lại → chỉ đảm bảo đã cấp gói (idempotent), KHÔNG ghi đè trạng thái.
        // (Trước đây webhook code != "00" đến muộn có thể đổi PAID -> CANCELLED.)
        if (payment.getStatus() == PaymentStatus.PAID) {
            if ("00".equals(code)) {
                grantSubscriptionIfNeeded(payment);
            } else {
                log.warn("Bỏ qua webhook code={} cho giao dịch đã PAID: orderCode={}", code, orderCode);
            }
            return;
        }

        if ("00".equals(code)) {
            // Đối chiếu số tiền PayOS báo đã thu với số tiền ta tạo cho đơn này (chống nâng gói khi trả thiếu).
            // Lệch → KHÔNG cấp gói, để PENDING để admin kiểm tra tay; trả 200 để PayOS không gửi lại vô ích.
            Object paidAmountObj = data.get("amount");
            if (!(paidAmountObj instanceof Number paidAmount) || paidAmount.longValue() != payment.getAmount().longValue()) {
                log.error("Webhook PayOS lệch số tiền, KHÔNG cấp gói: orderCode={}, expected={}, received={}",
                        orderCode, payment.getAmount(), paidAmountObj);
                alertMismatch(payment, paidAmountObj);
                return;
            }

            // Thanh toán thành công
            payment.setStatus(PaymentStatus.PAID);
            payment.setPaidAt(LocalDateTime.now());
            payment.setPayosTransactionId(reference);
            paymentRepository.save(payment);

            grantSubscriptionIfNeeded(payment);
        } else {
            // Chỉ huỷ đơn đang PENDING (đơn đã CANCELLED thì giữ nguyên)
            if (payment.getStatus() == PaymentStatus.PENDING) {
                payment.setStatus(PaymentStatus.CANCELLED);
                paymentRepository.save(payment);
            }
            log.warn("Giao dịch thất bại/hủy: orderCode={}, code={}", orderCode, code);
        }
    }

    /**
     * Đồng bộ trạng thái 1 giao dịch với PayOS (dùng chung cho FE poll và admin đối soát).
     * Chỉ hỏi PayOS khi đơn chưa PAID. PayOS báo PAID mà đơn đang PENDING/CANCELLED (vd thanh toán muộn sau khi
     * đơn bị tự huỷ) → chuyển PAID + cấp gói, giống nhánh webhook code "00".
     *
     * @return Payment sau khi cập nhật.
     */
    @Transactional
    public Payment syncWithPayos(Payment payment) throws Exception {
        Payment current = paymentRepository.findById(payment.getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Không tìm thấy giao dịch thanh toán với id: " + payment.getId()));
        if (current.getStatus() == PaymentStatus.PAID) {
            return current;
        }

        PayosInfo payosInfo = getPaymentInfo(current.getOrderCode());
        String payosStatus = payosInfo.status();

        if ("PAID".equals(payosStatus)) {
            if (current.getAmount() == null || payosInfo.amountPaid() != current.getAmount().longValue()) {
                // Số tiền PayOS ghi nhận lệch hóa đơn: KHÔNG cấp gói, chờ admin kiểm tra
                log.error("PayOS lệch số tiền orderCode={}, hóa đơn={}, đã thanh toán={}. KHÔNG cấp gói.",
                        current.getOrderCode(), current.getAmount(), payosInfo.amountPaid());
                alertMismatch(current, payosInfo.amountPaid());
            } else {
                current.setStatus(PaymentStatus.PAID);
                current.setPaidAt(LocalDateTime.now());
                paymentRepository.save(current);
                grantSubscriptionIfNeeded(current);
            }
        } else if ("CANCELLED".equals(payosStatus) && current.getStatus() == PaymentStatus.PENDING) {
            current.setStatus(PaymentStatus.CANCELLED);
            paymentRepository.save(current);
        }
        return current;
    }

    /** Cảnh báo admin (email, có cooldown) khi số tiền thu về lệch hóa đơn. */
    private void alertMismatch(Payment payment, Object paid) {
        // Key theo orderCode (yêu cầu nghiệp vụ): mỗi đơn lệch chỉ báo tối đa 1 mail/cooldown
        alertService.alert("PAYMENT_MISMATCH_" + payment.getOrderCode(), "Giao dịch lệch số tiền",
                "orderCode=" + payment.getOrderCode() + ", hóa đơn=" + payment.getAmount()
                        + ", đã thu=" + paid + ", user=" + payment.getUser().getEmail());
    }

    /**
     * Cấp Subscription cho payment đã PAID — idempotent, an toàn khi gọi nhiều lần
     * (webhook lặp lại, hoặc cả webhook lẫn poll FE cùng trigger).
     */
    @Transactional
    public void grantSubscriptionIfNeeded(Payment payment) {
        // Payment truyền vào có thể đã bị "detach" khỏi session cũ (vd: được lấy ở
        // PaymentController.getPaymentStatus() - method đó không có @Transactional nên
        // session đóng lại ngay sau khi query xong). Nếu dùng thẳng payment/proxy user
        // của nó thì sẽ dính LazyInitializationException: "no session" khi lazy-load
        // payment.getUser(). Nên fetch lại payment mới từ DB, gắn với session hiện tại
        // của chính method @Transactional này, để mọi lazy-load phía sau đều an toàn.
        Payment currentPayment = paymentRepository.findById(payment.getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Không tìm thấy giao dịch thanh toán với id: " + payment.getId()));

        if (currentPayment.isSubscriptionGranted()) {
            log.info("Payment orderCode={} đã được cấp gói trước đó, bỏ qua.", currentPayment.getOrderCode());
            return;
        }

        Payment paymentToGrant = currentPayment;
        User user = paymentToGrant.getUser();

        // Cộng dồn: nếu còn gói ACTIVE chưa hết hạn thì gói mới bắt đầu từ lúc gói cũ hết,
        // để user không mất ngày đã trả tiền.
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startDate = now;
        var oldSubOpt = subscriptionRepository.findByUserIdAndStatus(user.getId(), SubscriptionStatus.ACTIVE);
        if (oldSubOpt.isPresent()) {
            Subscription oldSub = oldSubOpt.get();
            if (oldSub.getEndDate() != null && oldSub.getEndDate().isAfter(now)) {
                startDate = oldSub.getEndDate();
            }
            oldSub.setStatus(SubscriptionStatus.EXPIRED);
            subscriptionRepository.save(oldSub);
            log.info("Thay gói active cũ ID: {} của user: {} (gói mới bắt đầu {})",
                    oldSub.getId(), user.getEmail(), startDate);
        }

        LocalDateTime endDate = (paymentToGrant.getPlan() == SubscriptionPlan.PRO)
                ? startDate.plusDays(7)
                : startDate.plusDays(30);

        Subscription newSub = Subscription.builder()
                .user(user)
                .plan(paymentToGrant.getPlan())
                .status(SubscriptionStatus.ACTIVE)
                .startDate(startDate)
                .endDate(endDate)
                .build();
        subscriptionRepository.save(newSub);

        paymentToGrant.setSubscriptionGranted(true);
        paymentRepository.save(paymentToGrant);

        log.info("Nâng cấp gói thành công: user={}, plan={}, hết hạn={}",
                user.getEmail(), paymentToGrant.getPlan(), endDate);
    }

    /**
     * Lấy trạng thái thanh toán từ PayOS REST API.
     */
    public String getPaymentStatus(long orderCode) throws Exception {
        return getPaymentInfo(orderCode).status();
    }

    /** Kết quả tra cứu PayOS: trạng thái + số tiền đã thanh toán thực tế. */
    public record PayosInfo(String status, long amountPaid) {
    }

    public PayosInfo getPaymentInfo(long orderCode) throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.set("x-client-id", clientId.trim());
        headers.set("x-api-key", apiKey.trim());

        HttpEntity<Void> request = new HttpEntity<>(headers);
        ResponseEntity<String> response = restTemplate.exchange(
                PAYOS_API_URL + "/" + orderCode, HttpMethod.GET, request, String.class);

        JsonNode root = objectMapper.readTree(response.getBody());
        JsonNode data = root.path("data");
        return new PayosInfo(data.path("status").asText(), data.path("amountPaid").asLong(0));
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
