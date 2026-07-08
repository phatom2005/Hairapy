package com.hairapy.controllers;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hairapy.dto.ScanHistoryResponse;
import com.hairapy.models.*;
import com.hairapy.repositories.*;
import com.hairapy.services.PaymentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "app.payos.checksum-key=test_checksum_key",
        "app.payos.client-id=test_client_id",
        "app.payos.api-key=test_api_key"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class ManualVerificationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private SubscriptionRepository subscriptionRepository;

    @Autowired
    private HairstyleCatalogRepository hairstyleCatalogRepository;

    @Autowired
    private ScanHistoryRepository scanHistoryRepository;

    @Autowired
    private UsageHistoryRepository usageHistoryRepository;

    @Autowired
    private com.hairapy.services.CloudinaryService cloudinaryService;

    @Autowired
    private PaymentService paymentService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private com.cloudinary.Cloudinary cloudinary;

    @MockBean(name = "aiRestTemplate")
    private org.springframework.web.client.RestTemplate aiRestTemplate;

    private User freeUser;
    private User premiumUser;

    @BeforeEach
    void setUp() throws Exception {
        subscriptionRepository.deleteAll();
        paymentRepository.deleteAll();
        scanHistoryRepository.deleteAll();
        usageHistoryRepository.deleteAll();
        hairstyleCatalogRepository.deleteAll();
        userRepository.deleteAll();

        // Mock Cloudinary Uploader
        com.cloudinary.Uploader uploader = Mockito.mock(com.cloudinary.Uploader.class);
        Mockito.when(cloudinary.uploader()).thenReturn(uploader);
        Mockito.when(uploader.upload(Mockito.any(), Mockito.anyMap()))
                .thenReturn(new HashMap<>(Map.of("secure_url", "https://res.cloudinary.com/dummy.jpg")));

        // Tạo users test
        freeUser = User.builder()
                .email("free@hairapy.ai")
                .passwordHash(passwordEncoder.encode("password123"))
                .role(Role.USER)
                .fullName("Free User")
                .build();
        freeUser = userRepository.save(freeUser);

        premiumUser = User.builder()
                .email("premium@hairapy.ai")
                .passwordHash(passwordEncoder.encode("password123"))
                .role(Role.USER)
                .fullName("Premium User")
                .build();
        premiumUser = userRepository.save(premiumUser);

        // Cấp subscription active cho premiumUser
        Subscription premiumSub = Subscription.builder()
                .user(premiumUser)
                .plan(SubscriptionPlan.PREMIUM)
                .status(SubscriptionStatus.ACTIVE)
                .startDate(LocalDateTime.now())
                .endDate(LocalDateTime.now().plusDays(30))
                .build();
        subscriptionRepository.save(premiumSub);
    }

    // --- 1. Gọi Webhook 2 lần liên tiếp ---
    @Test
    void test1_WebhookIdempotency() throws Exception {
        // Tạo pending payment cho freeUser
        long orderCode = 99999L;
        Payment payment = Payment.builder()
                .user(freeUser)
                .orderCode(orderCode)
                .plan(SubscriptionPlan.PRO)
                .amount(49000)
                .status(PaymentStatus.PENDING)
                .build();
        paymentRepository.save(payment);

        // Tạo payload
        Map<String, Object> data = new TreeMap<>();
        data.put("amount", 49000);
        data.put("code", "00");
        data.put("desc", "Thành công");
        data.put("orderCode", orderCode);
        data.put("reference", "payos_trans_123");

        // Tạo signature data
        StringBuilder sb = new StringBuilder();
        for (Map.Entry<String, Object> entry : data.entrySet()) {
            if (sb.length() > 0) sb.append("&");
            sb.append(entry.getKey()).append("=").append(entry.getValue());
        }
        String signData = sb.toString();
        String signature = hmacSHA256("test_checksum_key", signData);

        Map<String, Object> payload = Map.of(
                "data", data,
                "signature", signature
        );

        // Gọi Webhook lần 1
        mockMvc.perform(post("/api/payments/webhook")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk());

        // Kiểm tra đã có 1 subscription được cấp cho freeUser
        List<Subscription> subs1 = subscriptionRepository.findByUserId(freeUser.getId());
        assertEquals(1, subs1.size());
        assertEquals(SubscriptionStatus.ACTIVE, subs1.get(0).getStatus());

        // Kiểm tra payment status đã chuyển thành PAID và subscriptionGranted = true
        Payment p1 = paymentRepository.findByOrderCode(orderCode).orElseThrow();
        assertEquals(PaymentStatus.PAID, p1.getStatus());
        assertTrue(p1.isSubscriptionGranted());

        // Gọi Webhook lần 2
        mockMvc.perform(post("/api/payments/webhook")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk());

        // Đảm bảo số lượng subscription vẫn là 1 (không đổi, không bị nhân đôi)
        List<Subscription> subs2 = subscriptionRepository.findByUserId(freeUser.getId());
        assertEquals(1, subs2.size());
    }

    // --- 2. So sánh watermark URL Free/Premium ---
    @Test
    void test2_WatermarkTransformation() throws Exception {
        com.cloudinary.Uploader uploader = cloudinary.uploader();

        // 2a. Gọi upload với watermark = true (dành cho Free user)
        cloudinaryService.uploadFromUrl("http://example.com/image.jpg", "ai-results", true);

        org.mockito.ArgumentCaptor<Map> optionsCaptor = org.mockito.ArgumentCaptor.forClass(Map.class);
        Mockito.verify(uploader).upload(Mockito.eq("http://example.com/image.jpg"), optionsCaptor.capture());

        Map optionsTrue = optionsCaptor.getValue();
        assertNotNull(optionsTrue.get("transformation"));
        List transformation = (List) optionsTrue.get("transformation");
        Map transMap = (Map) transformation.get(0);
        assertEquals("text:Arial_60_bold:Hairapy", transMap.get("overlay"));
        assertEquals("south_east", transMap.get("gravity"));

        // 2b. Gọi upload với watermark = false (dành cho Premium user)
        Mockito.clearInvocations(uploader);
        cloudinaryService.uploadFromUrl("http://example.com/image.jpg", "ai-results", false);
        Mockito.verify(uploader).upload(Mockito.eq("http://example.com/image.jpg"), optionsCaptor.capture());
        assertNull(optionsCaptor.getValue().get("transformation"));
    }

    // --- 3. Dump JSON check không lộ password ---
    @Test
    @org.springframework.security.test.context.support.WithMockUser(username = "free@hairapy.ai")
    void test3_ScanHistoryNotLeakingPassword() throws Exception {
        ScanHistory history = ScanHistory.builder()
                .user(freeUser)
                .faceShape("Oval")
                .imageUrl("https://res.cloudinary.com/dummy.jpg")
                .hairType("Normal")
                .build();
        scanHistoryRepository.save(history);

        mockMvc.perform(get("/api/profile/scans"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.scans[0].faceShape").value("Oval"))
                .andExpect(jsonPath("$.scans[0].imageUrl").value("https://res.cloudinary.com/dummy.jpg"))
                // Kiểm tra không có password hay passwordHash được serialize ra ngoài
                .andExpect(jsonPath("$.scans[0].user").doesNotExist())
                .andExpect(jsonPath("$.scans[0].password").doesNotExist())
                .andExpect(jsonPath("$.scans[0].passwordHash").doesNotExist());
    }

    // --- 4. Chặn Free user thử kiểu tóc Premium (403 Forbidden) + Quota không bị trừ ---
    @Test
    @org.springframework.security.test.context.support.WithMockUser(username = "free@hairapy.ai")
    void test4_FreeUserTryingPremiumStyleRejected() throws Exception {
        // Tạo hairstyle premiumOnly
        HairstyleCatalog premiumStyle = HairstyleCatalog.builder()
                .name("Premium Style Name")
                .imageUrl("https://example.com/premium.jpg")
                .premiumOnly(true)
                .ailabProStyle("LongWavyPremium")
                .gender("Unisex")
                .build();
        premiumStyle = hairstyleCatalogRepository.save(premiumStyle);

        MockMultipartFile file = new MockMultipartFile("image", "test.jpg", "image/jpeg", "dummy image content".getBytes());

        // Gửi request thử kiểu tóc premium
        mockMvc.perform(multipart("/api/swap/try")
                        .file(file)
                        .param("hairStyle", "LongWavyPremium")
                        .param("hairstyleId", String.valueOf(premiumStyle.getId())))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.requiresPremium").value(true))
                .andExpect(jsonPath("$.error").value("Kiểu tóc này chỉ dành cho gói Premium. Nâng cấp để thử ngay!"));

        // Đảm bảo không có dòng ghi nhận lượt sử dụng nào trong DB
        long count = usageHistoryRepository.count();
        assertEquals(0, count);
    }

    // Helper ký hmacSHA256
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
}
