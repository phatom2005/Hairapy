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

    @Autowired
    private com.hairapy.repositories.EmailVerificationTokenRepository emailVerificationTokenRepository;

    @org.springframework.boot.test.mock.mockito.MockBean
    private com.hairapy.services.FacebookAuthService facebookAuthService;

    // Mock để không gọi Resend thật, đồng thời bắt được link xác minh
    @org.springframework.boot.test.mock.mockito.MockBean
    private com.hairapy.services.EmailService emailService;

    @Autowired
    private com.hairapy.repositories.SubscriptionRepository subscriptionRepository;

    @Autowired
    private com.hairapy.repositories.PasswordResetTokenRepository passwordResetTokenRepository;

    @Autowired
    private com.hairapy.security.JwtService jwtService;

    @BeforeEach
    void setUp() {
        // Dọn dẹp database trước mỗi test case (token xác minh + subscription trước vì có FK tới users)
        emailVerificationTokenRepository.deleteAll();
        passwordResetTokenRepository.deleteAll();
        subscriptionRepository.deleteAll();
        userRepository.deleteAll();
    }

    @org.junit.jupiter.api.AfterEach
    void tearDown() {
        // Không để lại subscription làm hỏng deleteAll(users) của các test class khác
        passwordResetTokenRepository.deleteAll();
        subscriptionRepository.deleteAll();
    }

    /** Tạo user đã xác minh email rồi đăng nhập để lấy JWT thật. */
    private String createVerifiedUserAndLogin(String email, String password, String fullName) throws Exception {
        userRepository.save(User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(password))
                .role(Role.USER)
                .fullName(fullName)
                .emailVerified(true)
                .build());
        String loginJson = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest(email, password))))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(loginJson).get("token").asText();
    }

    /** Đăng ký rồi lấy raw token từ link mà EmailService được gọi để gửi. */
    private String registerAndCaptureToken(String email, String password) throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new RegisterRequest("Nguyễn Anh", email, password, password))))
                .andExpect(status().isCreated());
        org.mockito.ArgumentCaptor<String> link = org.mockito.ArgumentCaptor.forClass(String.class);
        org.mockito.Mockito.verify(emailService).sendVerificationEmail(org.mockito.ArgumentMatchers.eq(email), link.capture());
        return link.getValue().substring(link.getValue().indexOf("token=") + "token=".length());
    }

    @Test
    void registerUser_Success() throws Exception {
        RegisterRequest request = new RegisterRequest("Nguyễn Anh", "test@example.com", "password123", "password123");

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(jsonPath("$.email").value("test@example.com"))
                .andExpect(jsonPath("$.message").isNotEmpty());

        User saved = userRepository.findByEmail("test@example.com").orElseThrow();
        org.junit.jupiter.api.Assertions.assertFalse(saved.isEmailVerified());
        org.mockito.Mockito.verify(emailService).sendVerificationEmail(
                org.mockito.ArgumentMatchers.eq("test@example.com"), org.mockito.ArgumentMatchers.contains("/verify-email?token="));
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
                .emailVerified(true)
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
        // Tạo user đã xác minh rồi đăng nhập để lấy JWT token hợp lệ
        String token = createVerifiedUserAndLogin("test@example.com", "password123", "Nguyễn Anh");

        // Gửi request lấy thông tin /me kèm token
        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("test@example.com"))
                .andExpect(jsonPath("$.role").value("USER"))
                .andExpect(jsonPath("$.fullName").value("Nguyễn Anh"));
    }

    @Test
    void getCurrentUser_NoSubscription_ReturnsFreePlan() throws Exception {
        String token = createVerifiedUserAndLogin("test@example.com", "password123", "Nguyễn Anh");

        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.plan").value("FREE"))
                .andExpect(jsonPath("$.planEndDate").doesNotExist())
                .andExpect(jsonPath("$.provider").value("LOCAL"))
                .andExpect(jsonPath("$.hasPassword").value(true));
    }

    @Test
    void getCurrentUser_ActivePremium_ReturnsPlanAndEndDate() throws Exception {
        String token = createVerifiedUserAndLogin("test@example.com", "password123", "Nguyễn Anh");
        User user = userRepository.findByEmail("test@example.com").orElseThrow();
        java.time.LocalDateTime end = java.time.LocalDateTime.now().plusDays(20).withNano(0);
        subscriptionRepository.save(com.hairapy.models.Subscription.builder()
                .user(user)
                .plan(com.hairapy.models.SubscriptionPlan.PREMIUM)
                .status(com.hairapy.models.SubscriptionStatus.ACTIVE)
                .startDate(java.time.LocalDateTime.now().minusDays(10))
                .endDate(end)
                .build());

        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("PREMIUM"))
                .andExpect(jsonPath("$.plan").value("PREMIUM"))
                // Jackson luôn ghi đủ giây (13:40:00), còn LocalDateTime.toString() bỏ ":00" khi giây = 0
                // -> format giống Jackson để test không fail ngẫu nhiên (1/60 khả năng)
                .andExpect(jsonPath("$.planEndDate").value(end.format(java.time.format.DateTimeFormatter.ISO_LOCAL_DATE_TIME)));
    }

    @Test
    void getCurrentUser_NoToken() throws Exception {
        // Gửi request không kèm token -> Nhận về 403 Forbidden
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isForbidden());
    }

    @Test
    void updateCurrentUser_Success() throws Exception {
        // Tạo user đã xác minh rồi đăng nhập để lấy JWT token hợp lệ
        String token = createVerifiedUserAndLogin("test@example.com", "password123", "Nguyễn Anh");

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

    @Test
    void loginWithFacebook_NewUser_Success() throws Exception {
        org.mockito.Mockito.when(facebookAuthService.verifyAndFetchProfile("mock_token"))
                .thenReturn(new com.hairapy.services.FacebookAuthService.FacebookProfile("fbuser@example.com", "fb_12345", "Facebook User"));

        com.hairapy.dto.auth.FacebookLoginRequest request = new com.hairapy.dto.auth.FacebookLoginRequest("mock_token");

        mockMvc.perform(post("/api/auth/facebook")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.email").value("fbuser@example.com"))
                .andExpect(jsonPath("$.role").value("USER"))
                .andExpect(jsonPath("$.fullName").value("Facebook User"));

        User savedUser = userRepository.findByEmail("fbuser@example.com").orElse(null);
        org.junit.jupiter.api.Assertions.assertNotNull(savedUser);
        org.junit.jupiter.api.Assertions.assertEquals(com.hairapy.models.AuthProvider.FACEBOOK, savedUser.getProvider());
        org.junit.jupiter.api.Assertions.assertEquals("fb_12345", savedUser.getProviderId());
    }

    @Test
    void loginWithFacebook_ExistingUser_AccountLinking() throws Exception {
        User existing = User.builder()
                .email("existing@example.com")
                .fullName("Existing User")
                .passwordHash("somehash")
                .role(Role.USER)
                .build();
        userRepository.save(existing);

        org.mockito.Mockito.when(facebookAuthService.verifyAndFetchProfile("mock_token"))
                .thenReturn(new com.hairapy.services.FacebookAuthService.FacebookProfile("existing@example.com", "fb_99999", "Facebook User"));

        com.hairapy.dto.auth.FacebookLoginRequest request = new com.hairapy.dto.auth.FacebookLoginRequest("mock_token");

        mockMvc.perform(post("/api/auth/facebook")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.email").value("existing@example.com"));

        User updatedUser = userRepository.findByEmail("existing@example.com").orElse(null);
        org.junit.jupiter.api.Assertions.assertNotNull(updatedUser);
        org.junit.jupiter.api.Assertions.assertEquals("fb_99999", updatedUser.getProviderId());
        // Facebook đã xác thực email → tài khoản LOCAL chưa xác minh trước đó được nâng thành đã xác minh
        org.junit.jupiter.api.Assertions.assertTrue(updatedUser.isEmailVerified());
    }

    @Test
    void loginUser_EmailNotVerified_Returns403WithCode() throws Exception {
        userRepository.save(User.builder()
                .email("unverified@example.com")
                .passwordHash(passwordEncoder.encode("password123"))
                .role(Role.USER)
                .fullName("Chưa Xác Minh")
                .build());

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest("unverified@example.com", "password123"))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("EMAIL_NOT_VERIFIED"))
                .andExpect(jsonPath("$.token").doesNotExist());
    }

    @Test
    void loginUser_EmailNotVerified_WrongPassword_Returns401NotLeakingStatus() throws Exception {
        userRepository.save(User.builder()
                .email("unverified@example.com")
                .passwordHash(passwordEncoder.encode("password123"))
                .role(Role.USER)
                .fullName("Chưa Xác Minh")
                .build());

        // Sai mật khẩu → 401 như bình thường, không để lộ tài khoản này chưa xác minh
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest("unverified@example.com", "wrongpassword"))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void verifyEmail_Success_ThenLoginWorks_AndIsIdempotent() throws Exception {
        String token = registerAndCaptureToken("test@example.com", "password123");
        String body = objectMapper.writeValueAsString(java.util.Map.of("token", token));

        mockMvc.perform(post("/api/auth/verify-email").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk());
        org.junit.jupiter.api.Assertions.assertTrue(userRepository.findByEmail("test@example.com").orElseThrow().isEmailVerified());

        // Bấm lại cùng link vẫn trả thành công (idempotent)
        mockMvc.perform(post("/api/auth/verify-email").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest("test@example.com", "password123"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty());
    }

    @Test
    void verifyEmail_InvalidToken_Returns400() throws Exception {
        mockMvc.perform(post("/api/auth/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(java.util.Map.of("token", "khong-ton-tai"))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void verifyEmail_ExpiredToken_Returns400() throws Exception {
        String token = registerAndCaptureToken("test@example.com", "password123");
        // Ép token hết hạn
        var entity = emailVerificationTokenRepository.findAll().get(0);
        entity.setExpiresAt(java.time.LocalDateTime.now().minusMinutes(1));
        emailVerificationTokenRepository.save(entity);

        mockMvc.perform(post("/api/auth/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(java.util.Map.of("token", token))))
                .andExpect(status().isBadRequest());
        org.junit.jupiter.api.Assertions.assertFalse(userRepository.findByEmail("test@example.com").orElseThrow().isEmailVerified());
    }

    @Test
    void resendVerification_WithinCooldown_DoesNotSendAgain_AndUnknownEmailIsGeneric() throws Exception {
        registerAndCaptureToken("test@example.com", "password123");

        // Gửi lại ngay sau khi đăng ký → vẫn 200 generic nhưng bị cooldown, không gửi thêm email
        mockMvc.perform(post("/api/auth/resend-verification")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(java.util.Map.of("email", "test@example.com"))))
                .andExpect(status().isOk());
        org.mockito.Mockito.verify(emailService, org.mockito.Mockito.times(1))
                .sendVerificationEmail(org.mockito.ArgumentMatchers.eq("test@example.com"), org.mockito.ArgumentMatchers.anyString());

        // Email không tồn tại → vẫn 200, không gửi gì
        mockMvc.perform(post("/api/auth/resend-verification")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(java.util.Map.of("email", "ghost@example.com"))))
                .andExpect(status().isOk());
        org.mockito.Mockito.verify(emailService, org.mockito.Mockito.never())
                .sendVerificationEmail(org.mockito.ArgumentMatchers.eq("ghost@example.com"), org.mockito.ArgumentMatchers.anyString());
    }

    @Test
    void resendVerification_AfterCooldown_SendsNewTokenAndInvalidatesOld() throws Exception {
        String oldToken = registerAndCaptureToken("test@example.com", "password123");
        // Giả lập đã qua cooldown
        var entity = emailVerificationTokenRepository.findAll().get(0);
        entity.setCreatedAt(java.time.LocalDateTime.now().minusMinutes(5));
        emailVerificationTokenRepository.save(entity);

        mockMvc.perform(post("/api/auth/resend-verification")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(java.util.Map.of("email", "test@example.com"))))
                .andExpect(status().isOk());
        org.mockito.Mockito.verify(emailService, org.mockito.Mockito.times(2))
                .sendVerificationEmail(org.mockito.ArgumentMatchers.eq("test@example.com"), org.mockito.ArgumentMatchers.anyString());

        // Token cũ không còn dùng được
        mockMvc.perform(post("/api/auth/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(java.util.Map.of("token", oldToken))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void resetPassword_SetsEmailVerifiedTrue_AndMarksAllTokensUsed() throws Exception {
        User user = userRepository.save(User.builder()
                .email("unverified@example.com")
                .passwordHash(passwordEncoder.encode("oldPassword1"))
                .role(Role.USER)
                .fullName("Unverified User")
                .emailVerified(false)
                .build());

        // Tạo 2 token reset mật khẩu cho user này
        com.hairapy.models.PasswordResetToken t1 = passwordResetTokenRepository.save(
                com.hairapy.models.PasswordResetToken.builder()
                        .tokenHash(sha256Hex("token-old-123"))
                        .user(user)
                        .expiresAt(java.time.LocalDateTime.now().plusHours(1))
                        .used(false)
                        .build()
        );
        com.hairapy.models.PasswordResetToken t2 = passwordResetTokenRepository.save(
                com.hairapy.models.PasswordResetToken.builder()
                        .tokenHash(sha256Hex("token-active-456"))
                        .user(user)
                        .expiresAt(java.time.LocalDateTime.now().plusHours(1))
                        .used(false)
                        .build()
        );

        // Reset mật khẩu dùng token 2
        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(java.util.Map.of(
                                "token", "token-active-456",
                                "newPassword", "brandNewPassword123",
                                "confirmPassword", "brandNewPassword123"
                        ))))
                .andExpect(status().isOk());

        // User phải được set emailVerified = true
        User updated = userRepository.findByEmail("unverified@example.com").orElseThrow();
        org.junit.jupiter.api.Assertions.assertTrue(updated.isEmailVerified());
        org.junit.jupiter.api.Assertions.assertTrue(passwordEncoder.matches("brandNewPassword123", updated.getPasswordHash()));

        // Cả 2 token đều phải bị đánh dấu used = true
        var tokens = passwordResetTokenRepository.findAll();
        for (var t : tokens) {
            org.junit.jupiter.api.Assertions.assertTrue(t.isUsed(), "Token ID " + t.getId() + " should be marked used");
        }
    }

    private String sha256Hex(String input) {
        try {
            java.security.MessageDigest md = java.security.MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(input.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(digest);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    @Test
    void changePassword_Success_UpdatesPassword() throws Exception {
        String token = createVerifiedUserAndLogin("change-pass@example.com", "currentPass123", "User Change Pass");

        mockMvc.perform(put("/api/auth/me/password")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(java.util.Map.of(
                                "currentPassword", "currentPass123",
                                "newPassword", "newSuperPass123",
                                "confirmPassword", "newSuperPass123"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Đổi mật khẩu thành công."));

        // Đăng nhập lại bằng mật khẩu mới thành công
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest("change-pass@example.com", "newSuperPass123"))))
                .andExpect(status().isOk());
    }

    @Test
    void changePassword_WrongCurrentPassword_Returns400() throws Exception {
        String token = createVerifiedUserAndLogin("wrong-curr@example.com", "currentPass123", "Wrong Curr");

        mockMvc.perform(put("/api/auth/me/password")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(java.util.Map.of(
                                "currentPassword", "incorrectPass123",
                                "newPassword", "newSuperPass123",
                                "confirmPassword", "newSuperPass123"
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Mật khẩu hiện tại không đúng."));
    }

    @Test
    void changePassword_MismatchedConfirmPassword_Returns400() throws Exception {
        String token = createVerifiedUserAndLogin("mismatch@example.com", "currentPass123", "Mismatch");

        mockMvc.perform(put("/api/auth/me/password")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(java.util.Map.of(
                                "currentPassword", "currentPass123",
                                "newPassword", "newSuperPass123",
                                "confirmPassword", "differentPass123"
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Mật khẩu xác nhận không khớp."));
    }

    @Test
    void changePassword_OAuthUserWithoutPassword_CanSetNewPasswordWithoutCurrent() throws Exception {
        User oauthUser = userRepository.save(User.builder()
                .email("oauth-user@example.com")
                .passwordHash(null)
                .provider(com.hairapy.models.AuthProvider.GOOGLE)
                .role(Role.USER)
                .fullName("OAuth User")
                .emailVerified(true)
                .build());

        String jwt = jwtService.generateToken(oauthUser);

        mockMvc.perform(put("/api/auth/me/password")
                        .header("Authorization", "Bearer " + jwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(java.util.Map.of(
                                "newPassword", "createdPassword123",
                                "confirmPassword", "createdPassword123"
                        ))))
                .andExpect(status().isOk());

        User updated = userRepository.findByEmail("oauth-user@example.com").orElseThrow();
        org.junit.jupiter.api.Assertions.assertNotNull(updated.getPasswordHash());
        org.junit.jupiter.api.Assertions.assertTrue(passwordEncoder.matches("createdPassword123", updated.getPasswordHash()));
    }
}

