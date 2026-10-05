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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "app.jwt.blacklist.enabled=true"
})
@AutoConfigureMockMvc
@ActiveProfiles("test") // vẫn H2 cho DB, chỉ Redis là thật (CI service container / docker-compose local)
class TokenBlacklistTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private com.hairapy.repositories.UserRepository userRepository;

    @Autowired
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @Autowired
    private org.springframework.data.redis.connection.RedisConnectionFactory redisConnectionFactory;

    @Test
    void logout_ThenOldTokenIsRejected() throws Exception {
        // Kiểm tra kết nối Redis trước khi chạy test, skip nếu không kết nối được
        try {
            redisConnectionFactory.getConnection().ping();
        } catch (Exception e) {
            org.junit.jupiter.api.Assumptions.assumeTrue(false, "Redis không hoạt động - Bỏ qua test này");
        }

        // 1. Đăng ký + đăng nhập để lấy token thật
        // RegisterRequest thật có 4 field theo thứ tự: fullName, email, password, confirmPassword
        // (Đăng ký không còn trả JWT và đăng nhập yêu cầu email đã xác minh → tạo thẳng user đã xác minh)
        if (userRepository.findByEmail("blacklist-test@hairapy.ai").isEmpty()) {
            userRepository.save(com.hairapy.models.User.builder()
                    .email("blacklist-test@hairapy.ai")
                    .passwordHash(passwordEncoder.encode("Password123!"))
                    .fullName("Blacklist Test")
                    .role(com.hairapy.models.Role.USER)
                    .emailVerified(true)
                    .build());
        }

        LoginRequest login = new LoginRequest("blacklist-test@hairapy.ai", "Password123!");
        String loginResponse = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(login)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        String token = objectMapper.readTree(loginResponse).get("token").asText();

        // 2. Token còn hợp lệ -> gọi /me thành công
        mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        // 3. Logout -> token bị đưa vào blacklist
        mockMvc.perform(post("/api/auth/logout").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        // 4. Dùng lại đúng token đó -> bị chặn, giống hệt hành vi "không có token"
        //    (getCurrentUser_NoToken hiện tại expect 403 Forbidden — giữ nhất quán)
        mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }
}
