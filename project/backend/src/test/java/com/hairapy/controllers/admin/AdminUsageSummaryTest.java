package com.hairapy.controllers.admin;

import com.hairapy.models.Role;
import com.hairapy.models.UsageHistory;
import com.hairapy.models.User;
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

import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Phase 6.2 — GET /api/admin/usage/summary */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AdminUsageSummaryTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private UsageHistoryRepository usageHistoryRepository;

    private User an;
    private User binh;

    @BeforeEach
    void setUp() {
        usageHistoryRepository.deleteAll();
        userRepository.deleteAll();
        an = userRepository.save(User.builder().email("an@hairapy.io.vn").fullName("An").role(Role.USER).build());
        binh = userRepository.save(User.builder().email("binh@hairapy.io.vn").fullName("Bình").role(Role.USER).build());
    }

    @AfterEach
    void tearDown() {
        usageHistoryRepository.deleteAll();
        userRepository.deleteAll();
    }

    private void use(User u, String feature, LocalDateTime at) {
        usageHistoryRepository.save(UsageHistory.builder().user(u).feature(feature).usedAt(at).build());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void summary_GroupsByUser_ForOneVnDay() throws Exception {
        LocalDate day = LocalDate.of(2026, 11, 2);
        LocalDateTime noon = VnTime.startOfDayVn(day).plusHours(12);
        // An: 1 quét + 3 thử tóc trong ngày
        use(an, "FACE_SCAN", noon);
        use(an, "HAIR_SWAP", noon.plusMinutes(1));
        use(an, "HAIR_SWAP", noon.plusMinutes(2));
        use(an, "HAIR_SWAP", noon.plusMinutes(3));
        // Bình: 1 AI Stylist trong ngày + 1 thử tóc NGÀY HÔM SAU (không được tính)
        use(binh, "AI_STYLIST", noon.plusHours(1));
        use(binh, "HAIR_SWAP", VnTime.startOfDayVn(day.plusDays(1)).plusMinutes(5));

        mockMvc.perform(get("/api/admin/usage/summary").param("date", "2026-11-02"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.date").value("2026-11-02"))
                .andExpect(jsonPath("$.activeUsers").value(2))
                .andExpect(jsonPath("$.totals.hairSwap").value(3))
                .andExpect(jsonPath("$.totals.total").value(5))
                .andExpect(jsonPath("$.rows", hasSize(2)))
                // nhiều lượt nhất trước
                .andExpect(jsonPath("$.rows[0].userEmail").value("an@hairapy.io.vn"))
                .andExpect(jsonPath("$.rows[0].faceScan").value(1))
                .andExpect(jsonPath("$.rows[0].hairSwap").value(3))
                .andExpect(jsonPath("$.rows[0].total").value(4))
                .andExpect(jsonPath("$.rows[1].userEmail").value("binh@hairapy.io.vn"))
                .andExpect(jsonPath("$.rows[1].aiStylist").value(1))
                .andExpect(jsonPath("$.rows[1].hairSwap").value(0));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void summary_InvalidDate_Returns400() throws Exception {
        mockMvc.perform(get("/api/admin/usage/summary").param("date", "02/11/2026"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void summary_NoUsage_ReturnsEmpty() throws Exception {
        mockMvc.perform(get("/api/admin/usage/summary").param("date", "2020-01-01"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activeUsers").value(0))
                .andExpect(jsonPath("$.rows", hasSize(0)));
    }

    @Test
    @WithMockUser(roles = "USER")
    void summary_RegularUser_Forbidden() throws Exception {
        mockMvc.perform(get("/api/admin/usage/summary"))
                .andExpect(status().isForbidden());
    }
}
