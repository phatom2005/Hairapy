package com.hairapy.security;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Rate limit theo IP cho endpoint đăng nhập — chống brute-force đoán mật khẩu.
 * Thuật toán Token Bucket (Bucket4j): mỗi IP có 1 "xô" token, refill theo thời gian,
 * mỗi request tiêu 1 token, hết token thì bị chặn 429.
 *
 * Bật/tắt và ngưỡng cấu hình qua app.ratelimit.login.* (đọc từ env var, xem application.properties) —
 * KHÔNG hardcode, KHÔNG gắn theo Spring profile dev/prod (lý do: xem gemini-prompt.md phần "QUAN TRỌNG").
 */
@Slf4j
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    @Value("${app.ratelimit.login.enabled:true}")
    private boolean enabled;

    @Value("${app.ratelimit.login.capacity:30}")
    private int capacity;

    @Value("${app.ratelimit.login.refill-minutes:1}")
    private int refillMinutes;

    private final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        boolean isLoginRequest = "POST".equalsIgnoreCase(request.getMethod())
                && "/api/auth/login".equals(request.getRequestURI());

        if (!enabled || !isLoginRequest) {
            filterChain.doFilter(request, response);
            return;
        }

        String clientIp = resolveClientIp(request);
        Bucket bucket = buckets.computeIfAbsent(clientIp, ip -> Bucket.builder()
                .addLimit(Bandwidth.classic(capacity, Refill.intervally(capacity, Duration.ofMinutes(refillMinutes))))
                .build());

        if (bucket.tryConsume(1)) {
            filterChain.doFilter(request, response);
        } else {
            log.warn("Rate limit chặn login từ IP: {}", clientIp);
            response.setStatus(429);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"error\":\"Quá nhiều lần thử đăng nhập, vui lòng đợi 1 phút.\"}");
        }
    }

    /**
     * Lấy IP thật của client — ưu tiên header X-Forwarded-For (Railway/reverse proxy set header này),
     * fallback về getRemoteAddr() khi chạy local không qua proxy.
     * QUAN TRỌNG: nếu bỏ qua bước này, mọi user trên Railway sẽ bị tính chung 1 IP (IP nội bộ của proxy)
     * -> rate limit sai hoàn toàn, 1 người bị khoá kéo theo tất cả người khác.
     */
    private String resolveClientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            // X-Forwarded-For có thể là chuỗi "client, proxy1, proxy2" — lấy IP đầu tiên (client gốc)
            return forwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
