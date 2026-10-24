package com.hairapy.controllers.admin;

import com.hairapy.models.Role;
import com.hairapy.models.UsageHistory;
import com.hairapy.models.User;
import com.hairapy.repositories.PaymentRepository;
import com.hairapy.repositories.SubscriptionRepository;
import com.hairapy.repositories.SwapHistoryRepository;
import com.hairapy.repositories.UsageHistoryRepository;
import com.hairapy.repositories.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;

import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AdminUserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UsageHistoryRepository usageHistoryRepository;

    @Autowired
    private SubscriptionRepository subscriptionRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private SwapHistoryRepository swapHistoryRepository;

    private User targetUser;

    @BeforeEach
    void setUp() {
        usageHistoryRepository.deleteAll();
        swapHistoryRepository.deleteAll();
        paymentRepository.deleteAll();
        subscriptionRepository.deleteAll();
        userRepository.deleteAll();

        targetUser = userRepository.save(User.builder()
                .email("target@hairapy.id.vn")
                .fullName("Target User")
                .role(Role.USER)
                .emailVerified(false)
                .build());
    }

    @AfterEach
    void tearDown() {
        usageHistoryRepository.deleteAll();
        swapHistoryRepository.deleteAll();
        paymentRepository.deleteAll();
        subscriptionRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void getUserOverview_ReturnsCompleteData() throws Exception {
        mockMvc.perform(get("/api/admin/users/" + targetUser.getId() + "/overview"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.email").value("target@hairapy.id.vn"))
                .andExpect(jsonPath("$.subscriptions").isArray())
                .andExpect(jsonPath("$.recentPayments").isArray())
                .andExpect(jsonPath("$.todayUsage").exists())
                .andExpect(jsonPath("$.recentSwaps").isArray());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void verifyEmail_SetsEmailVerifiedTrue() throws Exception {
        mockMvc.perform(post("/api/admin/users/" + targetUser.getId() + "/verify-email"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.emailVerified").value(true));

        User updated = userRepository.findById(targetUser.getId()).orElseThrow();
        assertTrue(updated.isEmailVerified());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void refundUsage_HasUsage_DeletesAndReturns200() throws Exception {
        usageHistoryRepository.save(UsageHistory.builder()
                .user(targetUser)
                .feature("HAIR_SWAP")
                .usedAt(LocalDateTime.now())
                .build());

        assertEquals(1, usageHistoryRepository.count());

        mockMvc.perform(post("/api/admin/users/" + targetUser.getId() + "/refund-usage?feature=HAIR_SWAP"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").exists());

        assertEquals(0, usageHistoryRepository.count());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void refundUsage_NoUsage_Returns404() throws Exception {
        mockMvc.perform(post("/api/admin/users/" + targetUser.getId() + "/refund-usage?feature=HAIR_SWAP"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Hôm nay user chưa dùng tính năng này."));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void updateUserRole_AcceptsTesterRole() throws Exception {
        mockMvc.perform(put("/api/admin/users/" + targetUser.getId() + "/role")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\": \"TESTER\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("TESTER"));

        User updated = userRepository.findById(targetUser.getId()).orElseThrow();
        assertEquals(Role.TESTER, updated.getRole());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void updateUserRole_InvalidRole_ReturnsFriendlyErrorMessage() throws Exception {
        mockMvc.perform(put("/api/admin/users/" + targetUser.getId() + "/role")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\": \"INVALID_ROLE\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$").value("Vai trò không hợp lệ. Chỉ chấp nhận USER, ADMIN hoặc TESTER."));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void getUsers_SearchFilters_WorksCorrectly() throws Exception {
        userRepository.save(User.builder()
                .email("deleted_123@deleted.hairapy.invalid")
                .fullName("Deleted User")
                .role(Role.USER)
                .emailVerified(true)
                .build());

        // Mặc định không chứa deleted user
        mockMvc.perform(get("/api/admin/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].email").value("target@hairapy.id.vn"));

        // includeDeleted = true
        mockMvc.perform(get("/api/admin/users?includeDeleted=true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(2)));

        // verified = false
        mockMvc.perform(get("/api/admin/users?verified=false"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].email").value("target@hairapy.id.vn"));
    }
}
