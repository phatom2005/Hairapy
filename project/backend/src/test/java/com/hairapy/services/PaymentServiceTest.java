package com.hairapy.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hairapy.models.Payment;
import com.hairapy.models.PaymentStatus;
import com.hairapy.models.Subscription;
import com.hairapy.models.SubscriptionPlan;
import com.hairapy.models.User;
import com.hairapy.repositories.PaymentRepository;
import com.hairapy.repositories.SubscriptionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.test.util.ReflectionTestUtils;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.startsWith;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    private static final String CHECKSUM = "test-checksum-key";

    @Mock PaymentRepository paymentRepository;
    @Mock SubscriptionRepository subscriptionRepository;
    @Mock SubscriptionService subscriptionService;
    @Mock AlertService alertService;

    PaymentService service;
    User user;

    @BeforeEach
    void setUp() {
        service = new PaymentService(paymentRepository, subscriptionRepository, subscriptionService,
                alertService, new ObjectMapper(), new RestTemplateBuilder());
        ReflectionTestUtils.setField(service, "checksumKey", CHECKSUM);
        ReflectionTestUtils.setField(service, "clientId", "cid");
        ReflectionTestUtils.setField(service, "apiKey", "key");
        ReflectionTestUtils.setField(service, "frontendUrl", "http://localhost:5173");
        user = User.builder().id(5L).email("u@example.com").build();
    }

    /** Dựng webhook body có chữ ký hợp lệ theo đúng thuật toán PayOS (sắp key theo alphabet). */
    private Map<String, Object> webhook(long orderCode, String code, long amount) throws Exception {
        Map<String, Object> data = new HashMap<>();
        data.put("orderCode", orderCode);
        data.put("code", code);
        data.put("amount", amount);
        data.put("reference", "REF1");
        StringBuilder sb = new StringBuilder();
        for (Map.Entry<String, Object> e : new TreeMap<>(data).entrySet()) {
            if (sb.length() > 0) sb.append("&");
            sb.append(e.getKey()).append("=").append(e.getValue());
        }
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(CHECKSUM.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        StringBuilder hex = new StringBuilder();
        for (byte b : mac.doFinal(sb.toString().getBytes(StandardCharsets.UTF_8))) {
            hex.append(String.format("%02x", b));
        }
        Map<String, Object> body = new HashMap<>();
        body.put("data", data);
        body.put("signature", hex.toString());
        return body;
    }

    private Payment payment(PaymentStatus status, boolean granted) {
        return Payment.builder().id(1L).user(user).orderCode(777L).plan(SubscriptionPlan.PRO)
                .amount(49000).status(status).subscriptionGranted(granted).build();
    }

    @Test
    void createPaymentLink_dangPremiumMuaPro_biChan() {
        when(subscriptionService.getEffectivePlan(5L)).thenReturn(SubscriptionPlan.PREMIUM);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.createPaymentLink(user, "PRO"));

        assertEquals("Bạn đang dùng Gói Tháng. Hãy gia hạn Gói Tháng để giữ nguyên quyền lợi.", ex.getMessage());
        verify(paymentRepository, never()).save(any());
    }

    @Test
    void webhook_codeKhac00_choDonDaPaid_vanGiuPaid() throws Exception {
        Payment p = payment(PaymentStatus.PAID, true);
        when(paymentRepository.findByOrderCode(777L)).thenReturn(Optional.of(p));

        service.handleWebhook(webhook(777L, "01", 49000));

        assertEquals(PaymentStatus.PAID, p.getStatus());
        verify(paymentRepository, never()).save(any());
    }

    @Test
    void webhook_code00_choDonDaPaid_chiDamBaoCapGoiKhongGhiDe() throws Exception {
        Payment p = payment(PaymentStatus.PAID, true); // đã cấp gói → grant là no-op
        when(paymentRepository.findByOrderCode(777L)).thenReturn(Optional.of(p));
        when(paymentRepository.findById(1L)).thenReturn(Optional.of(p));

        service.handleWebhook(webhook(777L, "00", 49000));

        verify(paymentRepository, never()).save(any());
        verify(subscriptionRepository, never()).save(any(Subscription.class));
    }

    @Test
    void webhook_codeKhac00_choDonPending_chuyenCancelled() throws Exception {
        Payment p = payment(PaymentStatus.PENDING, false);
        when(paymentRepository.findByOrderCode(777L)).thenReturn(Optional.of(p));

        service.handleWebhook(webhook(777L, "01", 49000));

        assertEquals(PaymentStatus.CANCELLED, p.getStatus());
        verify(paymentRepository).save(p);
    }

    @Test
    void webhook_lechSoTien_khongCapGoi_vaCanhBaoAdmin() throws Exception {
        Payment p = payment(PaymentStatus.PENDING, false);
        when(paymentRepository.findByOrderCode(777L)).thenReturn(Optional.of(p));

        service.handleWebhook(webhook(777L, "00", 1000));

        assertEquals(PaymentStatus.PENDING, p.getStatus());
        verify(alertService).alert(startsWith("PAYMENT_MISMATCH_777"), anyString(), anyString());
        verify(paymentRepository, never()).save(any());
    }
}
