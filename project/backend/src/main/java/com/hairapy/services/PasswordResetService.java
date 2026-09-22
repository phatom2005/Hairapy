package com.hairapy.services;

import com.hairapy.models.PasswordResetToken;
import com.hairapy.models.User;
import com.hairapy.repositories.PasswordResetTokenRepository;
import com.hairapy.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;

@Slf4j
@Service
@RequiredArgsConstructor
public class PasswordResetService {

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    private final SecureRandom secureRandom = new SecureRandom();

    /**
     * Luôn "thành công" ở góc nhìn người gọi dù email có tồn tại hay không (tránh user enumeration) —
     * chỉ thực sự gửi email nếu tìm thấy user.
     */
    @Transactional
    public void requestReset(String email) {
        userRepository.findByEmail(email.trim()).ifPresentOrElse(user -> {
            byte[] randomBytes = new byte[32];
            secureRandom.nextBytes(randomBytes);
            String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);

            PasswordResetToken entity = PasswordResetToken.builder()
                    .user(user)
                    .tokenHash(sha256Hex(rawToken))
                    .expiresAt(LocalDateTime.now().plusMinutes(30))
                    .used(false)
                    .build();
            passwordResetTokenRepository.save(entity);

            String baseUrl = frontendUrl.trim();
            if (baseUrl.endsWith("/")) {
                baseUrl = baseUrl.substring(0, baseUrl.length() - 1);
            }
            String resetLink = baseUrl + "/reset-password?token=" + rawToken;

            emailService.sendPasswordResetEmail(user.getEmail(), resetLink);
        }, () -> log.info("Yêu cầu quên mật khẩu cho email không tồn tại trong hệ thống: {}", email));
    }

    @Transactional
    public void confirmReset(String rawToken, String newPassword, String confirmPassword) {
        if (!newPassword.equals(confirmPassword)) {
            throw new IllegalArgumentException("Mật khẩu xác nhận không khớp");
        }

        PasswordResetToken entity = passwordResetTokenRepository.findByTokenHash(sha256Hex(rawToken))
                .orElseThrow(() -> new IllegalArgumentException("Liên kết đặt lại mật khẩu không hợp lệ."));

        if (entity.isUsed()) {
            throw new IllegalArgumentException("Liên kết này đã được sử dụng.");
        }
        if (entity.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Liên kết đặt lại mật khẩu đã hết hạn. Vui lòng yêu cầu lại.");
        }

        User user = entity.getUser();
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        entity.setUsed(true);
        passwordResetTokenRepository.save(entity);

        // NOTE: Khi triển khai Đợt 1 (Refresh Token), thêm refreshTokenService.revokeAllForUser(user.getId()) tại đây
        // để bắt buộc đăng nhập lại trên mọi thiết bị sau khi đổi mật khẩu.

        log.info("Đã đặt lại mật khẩu thành công cho user: {}", user.getEmail());
    }

    private String sha256Hex(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 không khả dụng", e);
        }
    }
}
