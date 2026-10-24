package com.hairapy.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hairapy.dto.auth.LoginRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "app.ratelimit.login.enabled=true",
        "app.ratelimit.login.capacity=2",
        "app.ratelimit.login.refill-minutes=1",
        "app.ratelimit.forgot.capacity=2",
        "app.ratelimit.forgot.refill-minutes=1"
})
@AutoConfigureMockMvc
@ActiveProfiles("test") // vẫn dùng H2 + các default khác của test profile, chỉ override riêng các property rate limit ở trên
class RateLimitFilterTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void loginRateLimit_BlocksAfterCapacityExceeded() throws Exception {
        LoginRequest badLogin = new LoginRequest("nobody@hairapy.ai", "wrongpassword");
        String body = objectMapper.writeValueAsString(badLogin);

        // 2 lần đầu (capacity=2): sai mật khẩu -> 401, KHÔNG bị rate limit
        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isUnauthorized());

        // Lần thứ 3: hết token -> 429, không còn liên quan tới đúng/sai mật khẩu nữa
        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().is(429));
    }

    @Test
    void forgotPasswordRateLimit_BlocksAfterCapacityExceeded() throws Exception {
        String body = objectMapper.writeValueAsString(java.util.Map.of("email", "nobody@hairapy.ai"));

        // 2 lần đầu (capacity=2): 200 OK
        mockMvc.perform(post("/api/auth/forgot-password").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/auth/forgot-password").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk());

        // Lần thứ 3: hết token -> 429
        mockMvc.perform(post("/api/auth/forgot-password").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().is(429));
    }
}

