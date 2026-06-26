package com.hairapy.services;

import com.hairapy.exceptions.ResourceNotFoundException;
import com.hairapy.models.*;
import com.hairapy.repositories.PaymentRepository;
import com.hairapy.repositories.SubscriptionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.payos.PayOS;
import vn.payos.type.CheckoutResponseData;
import vn.payos.type.ItemData;
import vn.payos.type.PaymentData;
import vn.payos.type.PaymentLinkData;
import vn.payos.type.Webhook;
import vn.payos.type.WebhookData;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Service xử lý các nghiệp vụ thanh toán liên quan đến cổng thanh toán PayOS.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PayOS payOS;
    private final PaymentRepository paymentRepository;
    private final SubscriptionRepository subscriptionRepository;

    @Value("${app.frontend.url}")
    private String frontendUrl;

    /**
     * Tạo đường dẫn thanh toán qua PayOS cho gói dịch vụ của người dùng.
     */
    @Transactional
    public String createPaymentLink(User user, String planCode) throws Exception {
        SubscriptionPlan plan = SubscriptionPlan.valueOf(planCode.toUpperCase());
        int amount;

        if (plan == SubscriptionPlan.PRO) {
            amount = 29000; // Gói tuần 29,000 VND
        } else if (plan == SubscriptionPlan.PREMIUM) {
            amount = 199000; // Gói tháng 199,000 VND
        } else {
            throw new IllegalArgumentException("Gói dịch vụ không hợp lệ");
        }

        // Sinh mã orderCode duy nhất và tránh xung đột (collision)
        long orderCode = System.currentTimeMillis() * 1000 + ThreadLocalRandom.current().nextInt(1000);

        // Lưu thông tin giao dịch tạm thời vào cơ sở dữ liệu với trạng thái PENDING
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

        // Tạo item mô tả cho hóa đơn PayOS
        ItemData item = ItemData.builder()
                .name("Hairapy " + planCode)
                .quantity(1)
                .price(amount)
                .build();

        // Tạo đối tượng dữ liệu thanh toán để gọi PayOS SDK
        PaymentData paymentData = PaymentData.builder()
                .orderCode(orderCode)
                .amount(amount)
                .description("Hairapy " + planCode)
                .returnUrl(frontendUrl + "/payment/success")
                .cancelUrl(frontendUrl + "/payment/cancel")
                .items(Collections.singletonList(item))
                .build();

        // Gọi API của PayOS tạo link checkout
        CheckoutResponseData checkoutResponse = payOS.createPaymentLink(paymentData);
        return checkoutResponse.getCheckoutUrl();
    }

    /**
     * Xử lý webhook cập nhật trạng thái thanh toán từ PayOS.
     */
    @Transactional
    public void handleWebhook(Webhook webhook) throws Exception {
        // Xác thực dữ liệu webhook nhận được bằng chữ ký bảo mật
        WebhookData data = payOS.verifyPaymentWebhookData(webhook);

        long orderCode = data.getOrderCode();
        String code = data.getCode(); // Mã kết quả giao dịch ("00" là thành công)

        log.info("Nhận webhook PayOS: orderCode={}, code={}, reference={}", orderCode, code, data.getReference());

        // Tìm kiếm giao dịch thanh toán trong hệ thống của chúng ta
        Payment payment = paymentRepository.findByOrderCode(orderCode)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy giao dịch thanh toán với orderCode: " + orderCode));

        if ("00".equals(code)) {
            // Thanh toán thành công
            payment.setStatus(PaymentStatus.PAID);
            payment.setPaidAt(LocalDateTime.now());
            payment.setPayosTransactionId(data.getReference());
            paymentRepository.save(payment);

            // Cập nhật subscription của user
            User user = payment.getUser();

            // Hạ cấp/hủy kích hoạt gói active cũ nếu có
            subscriptionRepository.findByUserIdAndStatus(user.getId(), SubscriptionStatus.ACTIVE)
                    .ifPresent(oldSub -> {
                        oldSub.setStatus(SubscriptionStatus.EXPIRED);
                        subscriptionRepository.save(oldSub);
                        log.info("Hủy gói active cũ ID: {} của user: {}", oldSub.getId(), user.getEmail());
                    });

            // Xác định thời hạn cho gói mới
            LocalDateTime startDate = LocalDateTime.now();
            LocalDateTime endDate;
            if (payment.getPlan() == SubscriptionPlan.PRO) {
                endDate = startDate.plusDays(7); // Gói Tuần
            } else {
                endDate = startDate.plusDays(30); // Gói Tháng (PREMIUM)
            }

            // Tạo subscription mới
            Subscription newSub = Subscription.builder()
                    .user(user)
                    .plan(payment.getPlan())
                    .status(SubscriptionStatus.ACTIVE)
                    .startDate(startDate)
                    .endDate(endDate)
                    .build();
            subscriptionRepository.save(newSub);

            log.info("Nâng cấp gói tài khoản thành công cho user: {}, gói: {}, hạn dùng đến: {}",
                    user.getEmail(), payment.getPlan(), endDate);

        } else {
            // Thanh toán bị hủy hoặc thất bại
            payment.setStatus(PaymentStatus.CANCELLED);
            paymentRepository.save(payment);
            log.warn("Giao dịch thanh toán thất bại/bị hủy: orderCode={}, code={}", orderCode, code);
        }
    }

    /**
     * Lấy trạng thái giao dịch thanh toán realtime từ PayOS.
     */
    public String getPaymentStatus(long orderCode) throws Exception {
        PaymentLinkData paymentLinkData = payOS.getPaymentLinkInformation(orderCode);
        return paymentLinkData.getStatus();
    }
}
