package com.hairapy.services;

import com.hairapy.models.AuthProvider;
import com.hairapy.models.EmailVerificationToken;
import com.hairapy.models.User;
import com.hairapy.repositories.EmailVerificationTokenRepository;
import com.hairapy.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;

/**
 * Xác minh email khi đăng ký — cùng pattern với PasswordResetService:
 * token ngẫu nhiên 32 byte, chỉ lưu hash SHA-256, dùng 1 lần, hết hạn sau 24 giờ.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmailVerificationService {

    private static final int TOKEN_TTL_HOURS = 24;
    private static final int RESEND_COOLDOWN_SECONDS = 60;

    private final UserRepository userRepository;
    private final EmailVerificationTokenRepository tokenRepository;
    private final EmailService emailService;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    private final SecureRandom secureRandom = new SecureRandom();

    /**
     * Tạo token mới (xóa token cũ của user) và gửi email xác minh.
     */
    @Transactional
    public void sendVerification(User user) {
        // Mỗi user chỉ giữ 1 token còn hiệu lực — token cũ bị vô hiệu khi gửi lại
        tokenRepository.deleteByUserId(user.getId());

        byte[] randomBytes = new byte[32];
        secureRandom.nextBytes(randomBytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);

        tokenRepository.save(EmailVerificationToken.builder()
                .user(user)
                .tokenHash(sha256Hex(rawToken))
                .expiresAt(LocalDateTime.now().plusHours(TOKEN_TTL_HOURS))
                .used(false)
                .build());

        String baseUrl = frontendUrl.trim();
        if (baseUrl.endsWith("/")) {
            baseUrl = baseUrl.substring(0, baseUrl.length() - 1);
        }
        emailService.sendVerificationEmail(user.getEmail(), baseUrl + "/verify-email?token=" + rawToken);
    }

    /**
     * Gửi lại email xác minh. Luôn "thành công" ở góc nhìn người gọi dù email có tồn tại,
     * đã xác minh hay đang trong thời gian chờ hay không (tránh user enumeration + spam).
     */
    @Transactional
    public void resend(String email) {
        userRepository.findByEmail(email.trim()).ifPresentOrElse(user -> {
            if (user.isEmailVerified() || user.getProvider() != AuthProvider.LOCAL) {
                return;
            }
            boolean inCooldown = tokenRepository.findTopByUserIdOrderByCreatedAtDesc(user.getId())
                    .map(t -> t.getCreatedAt().isAfter(LocalDateTime.now().minusSeconds(RESEND_COOLDOWN_SECONDS)))
                    .orElse(false);
            if (inCooldown) {
                log.info("Bỏ qua gửi lại email xác minh (cooldown) cho {}", user.getEmail());
                return;
            }
            sendVerification(user);
        }, () -> log.info("Yêu cầu gửi lại xác minh cho email không tồn tại: {}", email));
    }

    /**
     * Xác minh email bằng token. Idempotent: nếu user đã xác minh rồi (vd. bấm link 2 lần,
     * hoặc React StrictMode gọi effect 2 lần ở dev) thì vẫn coi là thành công.
     */
    @Transactional
    public void verify(String rawToken) {
        EmailVerificationToken entity = tokenRepository.findByTokenHash(sha256Hex(rawToken))
                .orElseThrow(() -> new IllegalArgumentException("Liên kết xác minh không hợp lệ."));

        User user = entity.getUser();
        if (user.isEmailVerified()) {
            return;
        }
        if (entity.isUsed()) {
            throw new IllegalArgumentException("Liên kết này đã được sử dụng.");
        }
        if (entity.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Liên kết xác minh đã hết hạn. Vui lòng yêu cầu gửi lại.");
        }

        user.setEmailVerified(true);
        userRepository.save(user);

        entity.setUsed(true);
        tokenRepository.save(entity);

        log.info("Đã xác minh email cho user: {}", user.getEmail());
    }

    private String sha256Hex(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 không khả dụng", e);
        }
    }
}
