package com.hairapy.controllers.admin;

import com.hairapy.models.*;
import com.hairapy.repositories.AiContentReportRepository;
import com.hairapy.repositories.UsageHistoryRepository;
import com.hairapy.repositories.UserRepository;
import com.hairapy.utils.VnTime;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AdminAiReportControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private AiContentReportRepository reportRepository;
    @Autowired
    private UsageHistoryRepository usageHistoryRepository;

    private User reporter;

    @BeforeEach
    void setUp() {
        reportRepository.deleteAll();
        usageHistoryRepository.deleteAll();
        userRepository.deleteAll();
        reporter = userRepository.save(User.builder()
                .email("reporter@hairapy.io.vn")
                .fullName("Reporter")
                .role(Role.USER)
                .build());
    }

    @AfterEach
    void tearDown() {
        reportRepository.deleteAll();
        usageHistoryRepository.deleteAll();
        userRepository.deleteAll();
    }

    private AiContentReport newReport(FeedbackFeature feature) {
        return reportRepository.save(AiContentReport.builder()
                .user(reporter)
                .feature(feature)
                .reason(AiReportReason.DISTORTED)
                .build());
    }

    private void useToday(String feature) {
        usageHistoryRepository.save(UsageHistory.builder()
                .user(reporter)
                .feature(feature)
                .usedAt(VnTime.nowVn())
                .build());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void resolve_WithoutRefund_KeepsUsage() throws Exception {
        AiContentReport r = newReport(FeedbackFeature.HAIR_SWAP);
        useToday("HAIR_SWAP");

        mockMvc.perform(post("/api/admin/ai-reports/" + r.getId() + "/resolve"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        assertEquals(1, usageHistoryRepository.count());
        assertEquals(AiReportStatus.RESOLVED, reportRepository.findById(r.getId()).orElseThrow().getStatus());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void resolve_WithRefund_RemovesOneTodayUsage_AndBlocksSecondRefund() throws Exception {
        AiContentReport r = newReport(FeedbackFeature.HAIR_SWAP);
        useToday("HAIR_SWAP");
        useToday("HAIR_SWAP");

        mockMvc.perform(post("/api/admin/ai-reports/" + r.getId() + "/resolve").param("refundUsage", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.refunded").value(true));
        assertEquals(1, usageHistoryRepository.count());

        // Xử lý lại cùng báo cáo với refund → bị chặn, không hoàn thêm
        mockMvc.perform(post("/api/admin/ai-reports/" + r.getId() + "/resolve").param("refundUsage", "true"))
                .andExpect(status().isBadRequest());
        assertEquals(1, usageHistoryRepository.count());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void resolve_WithRefund_NoUsageToday_StillResolves() throws Exception {
        AiContentReport r = newReport(FeedbackFeature.HAIR_SWAP);
        // Lượt dùng hôm qua → không được hoàn
        usageHistoryRepository.save(UsageHistory.builder()
                .user(reporter)
                .feature("HAIR_SWAP")
                .usedAt(VnTime.startOfTodayVn().minusHours(2))
                .build());

        mockMvc.perform(post("/api/admin/ai-reports/" + r.getId() + "/resolve").param("refundUsage", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.refunded").value(false));

        assertEquals(1, usageHistoryRepository.count());
        assertEquals(AiReportStatus.RESOLVED, reportRepository.findById(r.getId()).orElseThrow().getStatus());
    }

    @Test
    @WithMockUser(roles = "USER")
    void resolve_RegularUser_Forbidden() throws Exception {
        AiContentReport r = newReport(FeedbackFeature.HAIR_SWAP);
        mockMvc.perform(post("/api/admin/ai-reports/" + r.getId() + "/resolve"))
                .andExpect(status().isForbidden());
    }
}
