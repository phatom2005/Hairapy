package com.hairapy.controllers;

import com.hairapy.models.Payment;
import com.hairapy.models.PaymentStatus;
import com.hairapy.models.User;
import com.hairapy.repositories.PaymentRepository;
import com.hairapy.services.PaymentService;
import com.hairapy.services.UsageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

/**
 * Controller cung cấp các API xử lý thanh toán thông qua PayOS.
 */
@Slf4j
@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;
    private final UsageService usageService;
    private final PaymentRepository paymentRepository;

    /**
     * API tạo đường dẫn thanh toán qua VietQR của PayOS cho gói dịch vụ đã chọn.
     * Endpoint: POST /api/payments/create
     */
    @PostMapping("/create")
    public ResponseEntity<?> createPayment(
            @RequestBody Map<String, String> request,
            @RequestHeader(value = "X-GA-Client-Id", required = false) String gaClientIdHeader) {
        User currentUser = usageService.getCurrentUser();
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "error", "Yêu cầu không hợp lệ. Vui lòng đăng nhập."
            ));
        }

        String plan = request.get("plan");
        if (plan == null || (!plan.equalsIgnoreCase("PRO") && !plan.equalsIgnoreCase("PREMIUM"))) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Gói dịch vụ không hợp lệ. Chỉ chấp nhận PRO hoặc PREMIUM."
            ));
        }

        try {
            String sanitizedGaClientId = sanitizeGaClientId(gaClientIdHeader);
            String checkoutUrl = paymentService.createPaymentLink(currentUser, plan, sanitizedGaClientId);
            return ResponseEntity.ok(Map.of("checkoutUrl", checkoutUrl));
        } catch (IllegalArgumentException e) {
            // Lỗi nghiệp vụ (vd đang Gói Tháng mà mua Gói Tuần) → 400 kèm lý do cho FE
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("Lỗi khi khởi tạo link thanh toán PayOS cho user {}: ", currentUser.getEmail(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "error", "Không thể khởi tạo thanh toán. Vui lòng thử lại sau."
            ));
        }
    }

    /**
     * API nhận dữ liệu webhook trực tiếp từ PayOS (không yêu cầu Auth).
     * Endpoint: POST /api/payments/webhook
     */
    @PostMapping("/webhook")
    public ResponseEntity<?> handleWebhook(@RequestBody Map<String, Object> webhookBody) {
        try {
            paymentService.handleWebhook(webhookBody);
            // Trả về HTTP 200 OK cho PayOS biết hệ thống đã xử lý thành công
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            log.error("Lỗi xử lý webhook từ PayOS: ", e);
            // Trả về BAD_REQUEST hoặc INTERNAL_SERVER_ERROR nếu xác thực chữ ký thất bại
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "success", false,
                    "error", "Không thể xử lý webhook."
            ));
        }
    }

    /**
     * Lịch sử thanh toán của chính user đang đăng nhập (mới nhất trước).
     * Endpoint: GET /api/payments/my?page=0&size=10
     */
    @GetMapping("/my")
    public ResponseEntity<?> getMyPayments(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        User currentUser = usageService.getCurrentUser();
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "error", "Yêu cầu không hợp lệ. Vui lòng đăng nhập."
            ));
        }
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(
                Math.max(page, 0), Math.min(Math.max(size, 1), 50),
                org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(paymentRepository.findByUserId(currentUser.getId(), pageable)
                .map(p -> new com.hairapy.dto.MyPaymentResponse(
                        p.getOrderCode(), p.getPlan().name(), p.getAmount(), p.getStatus().name(),
                        p.getCreatedAt(), p.getPaidAt())));
    }

    /**
     * API lấy trạng thái hóa đơn thanh toán để cập nhật UI realtime (yêu cầu Auth).
     * Endpoint: GET /api/payments/status/{orderCode}
     */
    @GetMapping("/status/{orderCode}")
    public ResponseEntity<?> getPaymentStatus(@PathVariable("orderCode") long orderCode) {
        User currentUser = usageService.getCurrentUser();
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "error", "Yêu cầu không hợp lệ. Vui lòng đăng nhập."
            ));
        }

        try {
            Payment payment = paymentRepository.findByOrderCode(orderCode)
                    .orElse(null);

            if (payment == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                        "error", "Không tìm thấy giao dịch thanh toán này."
                ));
            }

            // Kiểm tra phân quyền: Chỉ cho phép người sở hữu hóa đơn hoặc admin xem
            if (!payment.getUser().getId().equals(currentUser.getId()) && !currentUser.getRole().name().equals("ADMIN")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                        "error", "Bạn không có quyền xem thông tin thanh toán này."
                ));
            }

            // Đồng bộ với PayOS nếu đơn chưa PAID (logic dùng chung với admin đối soát)
            payment = paymentService.syncWithPayos(payment);

            return ResponseEntity.ok(Map.of(
                    "status", payment.getStatus().name(),
                    "plan", payment.getPlan().name(),
                    "amount", payment.getAmount()
            ));
        } catch (Exception e) {
            log.error("Lỗi khi kiểm tra trạng thái thanh toán orderCode {}: ", orderCode, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "error", "Không thể kiểm tra trạng thái thanh toán. Vui lòng thử lại sau."
            ));
        }
    }

    /**
     * Chuẩn hóa Client ID của GA4: cắt tối đa 100 ký tự, chỉ nhận ký tự số và dấu chấm [0-9.].
     */
    public static String sanitizeGaClientId(String raw) {
        if (raw == null || raw.isBlank()) return null;
        String clean = raw.replaceAll("[^0-9.]", "");
        if (clean.isBlank()) return null;
        return clean.length() > 100 ? clean.substring(0, 100) : clean;
    }
}
