package com.hairapy.controllers.admin;

import com.hairapy.models.Role;
import com.hairapy.models.Subscription;
import com.hairapy.models.SubscriptionPlan;
import com.hairapy.models.SubscriptionStatus;
import com.hairapy.models.User;
import com.hairapy.repositories.SubscriptionRepository;
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
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AdminSubscriptionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private SubscriptionRepository subscriptionRepository;

    @Autowired
    private UserRepository userRepository;

    private User testUser;

    @BeforeEach
    void setUp() {
        subscriptionRepository.deleteAll();
        userRepository.deleteAll();

        testUser = userRepository.save(User.builder()
                .email("subscriber@hairapy.id.vn")
                .fullName("Subscriber One")
                .role(Role.USER)
                .build());
    }

    @AfterEach
    void tearDown() {
        subscriptionRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void grant_ExtendMode_AppendsToExistingEndDate() throws Exception {
        LocalDateTime futureEnd = LocalDateTime.now().plusDays(20);
        Subscription existing = subscriptionRepository.save(Subscription.builder()
                .user(testUser)
                .plan(SubscriptionPlan.PREMIUM)
                .status(SubscriptionStatus.ACTIVE)
                .startDate(LocalDateTime.now().minusDays(10))
                .endDate(futureEnd)
                .build());

        String requestJson = """
                {
                    "email": "subscriber@hairapy.id.vn",
                    "plan": "PRO",
                    "days": 7,
                    "mode": "EXTEND"
                }
                """;

        mockMvc.perform(post("/api/admin/subscriptions/grant")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.plan").value("PREMIUM")); // giữ plan cao hơn

        // Gói cũ phải chuyển EXPIRED
        Subscription oldSub = subscriptionRepository.findById(existing.getId()).orElseThrow();
        assertEquals(SubscriptionStatus.EXPIRED, oldSub.getStatus());

        // Gói mới bắt đầu từ futureEnd, kết thúc futureEnd + 7 ngày
        Subscription newSub = subscriptionRepository.findByUserIdAndStatus(testUser.getId(), SubscriptionStatus.ACTIVE)
                .orElseThrow();
        assertEquals(SubscriptionPlan.PREMIUM, newSub.getPlan());
        assertTrue(newSub.getEndDate().isAfter(futureEnd.plusDays(6)));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void grant_ReplaceMode_CalculatesFromNow() throws Exception {
        LocalDateTime futureEnd = LocalDateTime.now().plusDays(20);
        Subscription existing = subscriptionRepository.save(Subscription.builder()
                .user(testUser)
                .plan(SubscriptionPlan.PREMIUM)
                .status(SubscriptionStatus.ACTIVE)
                .startDate(LocalDateTime.now().minusDays(10))
                .endDate(futureEnd)
                .build());

        String requestJson = """
                {
                    "email": "subscriber@hairapy.id.vn",
                    "plan": "PRO",
                    "days": 7,
                    "mode": "REPLACE"
                }
                """;

        mockMvc.perform(post("/api/admin/subscriptions/grant")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.plan").value("PRO"));

        // Gói cũ bị CANCELLED
        Subscription oldSub = subscriptionRepository.findById(existing.getId()).orElseThrow();
        assertEquals(SubscriptionStatus.CANCELLED, oldSub.getStatus());

        // Gói mới tính từ now + 7
        Subscription newSub = subscriptionRepository.findByUserIdAndStatus(testUser.getId(), SubscriptionStatus.ACTIVE)
                .orElseThrow();
        assertEquals(SubscriptionPlan.PRO, newSub.getPlan());
        assertTrue(newSub.getEndDate().isBefore(LocalDateTime.now().plusDays(8)));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void getSubscriptions_SearchKeyword_ReturnsMatching() throws Exception {
        subscriptionRepository.save(Subscription.builder()
                .user(testUser)
                .plan(SubscriptionPlan.PREMIUM)
                .status(SubscriptionStatus.ACTIVE)
                .startDate(LocalDateTime.now())
                .endDate(LocalDateTime.now().plusDays(30))
                .build());

        mockMvc.perform(get("/api/admin/subscriptions?keyword=subscriber"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)));

        mockMvc.perform(get("/api/admin/subscriptions?keyword=nonexistent"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(0)));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void cancelSubscription_WithReason_LogsAndCancels() throws Exception {
        Subscription existing = subscriptionRepository.save(Subscription.builder()
                .user(testUser)
                .plan(SubscriptionPlan.PREMIUM)
                .status(SubscriptionStatus.ACTIVE)
                .startDate(LocalDateTime.now())
                .endDate(LocalDateTime.now().plusDays(30))
                .build());

        mockMvc.perform(put("/api/admin/subscriptions/" + existing.getId() + "/cancel")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\": \"Khách yêu cầu hoàn tiền\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));

        Subscription updated = subscriptionRepository.findById(existing.getId()).orElseThrow();
        assertEquals(SubscriptionStatus.CANCELLED, updated.getStatus());
    }
}
