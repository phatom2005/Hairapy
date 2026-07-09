package com.hairapy.security;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.Date;
import java.util.HexFormat;

/**
 * Danh sách token JWT bị thu hồi (logout), lưu trong Redis với TTL = thời gian
 * còn lại tới khi token tự hết hạn — Redis tự xoá key, không cần job dọn dẹp riêng.
 *
 * Không lưu token gốc làm key mà lưu hash SHA-256 của nó (nhất quán với cách
 * PaymentService dùng MessageDigest cho chữ ký webhook) — tránh việc raw JWT
 * (chứa thông tin định danh user) nằm trực tiếp trong Redis.
 *
 * Fail-open: nếu Redis lỗi kết nối, coi như token chưa bị blacklist thay vì
 * chặn cả request — Redis sập không được kéo sập luôn hệ thống đăng nhập.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TokenBlacklistService {

    private static final String KEY_PREFIX = "blacklist:jwt:";

    private final StringRedisTemplate redisTemplate;
    private final JwtService jwtService;

    public void blacklist(String token) {
        try {
            Date expiration = jwtService.extractExpiration(token);
            long remainingMs = expiration.getTime() - System.currentTimeMillis();
            if (remainingMs <= 0) {
                return; // token đã hết hạn tự nhiên, không cần lưu nữa
            }
            redisTemplate.opsForValue().set(
                    buildKey(token), "1", Duration.ofMillis(remainingMs));
        } catch (Exception ex) {
            log.warn("Không thể lưu token vào blacklist Redis (fail-open, bỏ qua): {}", ex.getMessage());
        }
    }

    public boolean isBlacklisted(String token) {
        try {
            return Boolean.TRUE.equals(redisTemplate.hasKey(buildKey(token)));
        } catch (Exception ex) {
            log.warn("Không thể kiểm tra blacklist Redis (fail-open, coi như chưa bị chặn): {}", ex.getMessage());
            return false;
        }
    }

    private String buildKey(String token) {
        return KEY_PREFIX + sha256Hex(token);
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
