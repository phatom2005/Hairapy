package com.hairapy.controllers;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hairapy.dto.auth.LoginRequest;
import com.hairapy.dto.auth.RegisterRequest;
import com.hairapy.models.Role;
import com.hairapy.models.User;
import com.hairapy.repositories.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Các bài kiểm thử tích hợp (Integration Test) cho AuthController.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        // Dọn dẹp database trước mỗi test case
        userRepository.deleteAll();
    }

    @Test
    void registerUser_Success() throws Exception {
        RegisterRequest request = new RegisterRequest("Nguyễn Anh", "test@example.com", "password123", "password123");

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.email").value("test@example.com"))
                .andExpect(jsonPath("$.role").value("USER"))
                .andExpect(jsonPath("$.fullName").value("Nguyễn Anh"));
    }

    @Test
    void registerUser_PasswordMismatch() throws Exception {
        RegisterRequest request = new RegisterRequest("Nguyễn Anh", "test@example.com", "password123", "different");

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Mật khẩu xác nhận không khớp"));
    }

    @Test
    void registerUser_EmailAlreadyExists() throws Exception {
        // Tạo trước một user trùng email
        User existingUser = User.builder()
                .email("test@example.com")
                .passwordHash(passwordEncoder.encode("password123"))
                .role(Role.USER)
                .fullName("Nguyễn Anh")
                .build();
        userRepository.save(existingUser);

        RegisterRequest request = new RegisterRequest("Nguyễn Anh", "test@example.com", "password123", "password123");

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Email đã được sử dụng"));
    }

    @Test
    void loginUser_Success() throws Exception {
        // Tạo trước user hợp lệ
        User user = User.builder()
                .email("test@example.com")
                .passwordHash(passwordEncoder.encode("password123"))
                .role(Role.USER)
                .fullName("Nguyễn Anh")
                .build();
        userRepository.save(user);

        LoginRequest request = new LoginRequest("test@example.com", "password123");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.email").value("test@example.com"))
                .andExpect(jsonPath("$.role").value("USER"))
                .andExpect(jsonPath("$.fullName").value("Nguyễn Anh"));
    }

    @Test
    void loginUser_InvalidCredentials() throws Exception {
        // Tạo trước user
        User user = User.builder()
                .email("test@example.com")
                .passwordHash(passwordEncoder.encode("password123"))
                .role(Role.USER)
                .fullName("Nguyễn Anh")
                .build();
        userRepository.save(user);

        // Đăng nhập sai mật khẩu
        LoginRequest request = new LoginRequest("test@example.com", "wrongpassword");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Email hoặc mật khẩu không đúng"));
    }

    @Test
    void getCurrentUser_Success() throws Exception {
        // Đăng ký trước để lấy JWT token hợp lệ
        RegisterRequest registerRequest = new RegisterRequest("Nguyễn Anh", "test@example.com", "password123", "password123");

        String responseJson = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String token = objectMapper.readTree(responseJson).get("token").asText();

        // Gửi request lấy thông tin /me kèm token
        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("test@example.com"))
                .andExpect(jsonPath("$.role").value("USER"))
                .andExpect(jsonPath("$.fullName").value("Nguyễn Anh"));
    }

    @Test
    void getCurrentUser_NoToken() throws Exception {
        // Gửi request không kèm token -> Nhận về 403 Forbidden
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isForbidden());
    }

    @Test
    void updateCurrentUser_Success() throws Exception {
        // Đăng ký trước để lấy JWT token hợp lệ
        RegisterRequest registerRequest = new RegisterRequest("Nguyễn Anh", "test@example.com", "password123", "password123");

        String responseJson = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String token = objectMapper.readTree(responseJson).get("token").asText();

        // Gửi request cập nhật profile
        com.hairapy.dto.auth.UpdateProfileRequest updateRequest = new com.hairapy.dto.auth.UpdateProfileRequest(
                "Nguyễn Anh Cập Nhật", "+84999999999", java.time.LocalDate.of(2000, 1, 1));

        mockMvc.perform(put("/api/auth/me")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("test@example.com"))
                .andExpect(jsonPath("$.role").value("USER"))
                .andExpect(jsonPath("$.fullName").value("Nguyễn Anh Cập Nhật"))
                .andExpect(jsonPath("$.phone").value("+84999999999"))
                .andExpect(jsonPath("$.dateOfBirth").value("2000-01-01"));

        // Lấy lại thông tin để kiểm tra DB thực tế đã thay đổi
        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fullName").value("Nguyễn Anh Cập Nhật"))
                .andExpect(jsonPath("$.phone").value("+84999999999"))
                .andExpect(jsonPath("$.dateOfBirth").value("2000-01-01"));
    }

    @Test
    void updateCurrentUser_NoToken() throws Exception {
        // Gửi request không kèm token -> Nhận về 403 Forbidden
        com.hairapy.dto.auth.UpdateProfileRequest updateRequest = new com.hairapy.dto.auth.UpdateProfileRequest(
                "Nguyễn Anh Cập Nhật", "+84999999999", java.time.LocalDate.of(2000, 1, 1));

        mockMvc.perform(put("/api/auth/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isForbidden());
    }
}
