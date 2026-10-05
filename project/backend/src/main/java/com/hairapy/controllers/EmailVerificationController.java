package com.hairapy.controllers;

import com.hairapy.dto.auth.ResendVerificationRequest;
import com.hairapy.dto.auth.VerifyEmailRequest;
import com.hairapy.services.EmailVerificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Endpoint xác minh email. Dùng POST (không phải GET) để scanner/prefetch của mail client
 * không vô tình "tiêu" token khi quét link.
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class EmailVerificationController {

    private final EmailVerificationService emailVerificationService;

    @PostMapping("/verify-email")
    public ResponseEntity<?> verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
        emailVerificationService.verify(request.token());
        return ResponseEntity.ok(Map.of("message", "Xác minh email thành công. Bạn có thể đăng nhập."));
    }

    @PostMapping("/resend-verification")
    public ResponseEntity<?> resendVerification(@Valid @RequestBody ResendVerificationRequest request) {
        emailVerificationService.resend(request.email());
        return ResponseEntity.ok(Map.of(
                "message", "Nếu tài khoản tồn tại và chưa xác minh, email xác minh đã được gửi lại."));
    }
}
