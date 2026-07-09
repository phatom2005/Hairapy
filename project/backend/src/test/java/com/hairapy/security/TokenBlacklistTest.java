package com.hairapy.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hairapy.dto.auth.LoginRequest;
import com.hairapy.dto.auth.RegisterRequest;
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
        RegisterRequest register = new RegisterRequest(
                "Blacklist Test", "blacklist-test@hairapy.ai", "Password123!", "Password123!");
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(register)));

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
