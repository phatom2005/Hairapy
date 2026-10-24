package com.hairapy.controllers;

import com.hairapy.models.Role;
import com.hairapy.models.Subscription;
import com.hairapy.models.SubscriptionPlan;
import com.hairapy.models.SubscriptionStatus;
import com.hairapy.models.User;
import com.hairapy.repositories.SubscriptionRepository;
import com.hairapy.repositories.UsageHistoryRepository;
import com.hairapy.repositories.UserRepository;
import com.hairapy.services.AiStylistService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AiStylistControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SubscriptionRepository subscriptionRepository;

    @Autowired
    private UsageHistoryRepository usageHistoryRepository;

    @MockBean
    private AiStylistService aiStylistService;

    private User proUser;
    private User premiumUser;

    @BeforeEach
    void setUp() {
        usageHistoryRepository.deleteAll();
        subscriptionRepository.deleteAll();
        userRepository.deleteAll();

        proUser = userRepository.save(User.builder()
                .email("pro_user@hairapy.id.vn")
                .fullName("Pro User")
                .role(Role.USER)
                .build());

        subscriptionRepository.save(Subscription.builder()
                .user(proUser)
                .plan(SubscriptionPlan.PRO)
                .status(SubscriptionStatus.ACTIVE)
                .startDate(LocalDateTime.now())
                .endDate(LocalDateTime.now().plusDays(7))
                .build());

        premiumUser = userRepository.save(User.builder()
                .email("premium_user@hairapy.id.vn")
                .fullName("Premium User")
                .role(Role.USER)
                .build());

        subscriptionRepository.save(Subscription.builder()
                .user(premiumUser)
                .plan(SubscriptionPlan.PREMIUM)
                .status(SubscriptionStatus.ACTIVE)
                .startDate(LocalDateTime.now())
                .endDate(LocalDateTime.now().plusDays(30))
                .build());
    }

    @AfterEach
    void tearDown() {
        usageHistoryRepository.deleteAll();
        subscriptionRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    @WithMockUser(username = "pro_user@hairapy.id.vn")
    void consult_ProUser_Returns403Forbidden() throws Exception {
        String requestJson = """
                {
                    "question": "Mặt tròn hợp tóc nào?",
                    "faceShape": "Tròn"
                }
                """;

        mockMvc.perform(post("/api/stylist/consult")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.requiresPremium").value(true))
                .andExpect(jsonPath("$.error").value("AI Stylist là quyền lợi của Gói Tháng. Nâng cấp để được tư vấn cùng AI!"));
    }

    @Test
    @WithMockUser(username = "premium_user@hairapy.id.vn")
    void consult_PremiumUser_Success() throws Exception {
        when(aiStylistService.consult(any(), any(), any(), any()))
                .thenReturn("Với mặt tròn, bạn nên thử kiểu tóc Layer dài...");

        String requestJson = """
                {
                    "question": "Mặt tròn hợp tóc nào?",
                    "faceShape": "Tròn"
                }
                """;

        mockMvc.perform(post("/api/stylist/consult")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.answer").value("Với mặt tròn, bạn nên thử kiểu tóc Layer dài..."));
    }

    @Test
    @WithMockUser(username = "premium_user@hairapy.id.vn")
    void getMyUsage_IncludesAiStylistQuota() throws Exception {
        mockMvc.perform(get("/api/usage/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.faceScan").exists())
                .andExpect(jsonPath("$.hairSwap").exists())
                .andExpect(jsonPath("$.aiStylist").exists())
                .andExpect(jsonPath("$.aiStylist.limit").value(5))
                .andExpect(jsonPath("$.aiStylist.used").value(0));
    }
}
