package com.hairapy.controllers.admin;

import com.hairapy.models.*;
import com.hairapy.repositories.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AdminDashboardControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private FeedbackRepository feedbackRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private User testUser;

    @BeforeEach
    void setUp() {
        feedbackRepository.deleteAll();
        paymentRepository.deleteAll();
        userRepository.deleteAll();

        testUser = userRepository.save(User.builder()
                .email("cust@hairapy.id.vn")
                .fullName("Customer Test")
                .role(Role.USER)
                .build());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void getStats_EmptyFeedback_ReturnsZeroAverageAndFiveDistribution() throws Exception {
        mockMvc.perform(get("/api/admin/dashboard/stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ratingCount").value(0))
                .andExpect(jsonPath("$.ratingTotalStars").value(0))
                .andExpect(jsonPath("$.ratingAverage").value(0.0))
                .andExpect(jsonPath("$.ratingDistribution", hasSize(5)))
                .andExpect(jsonPath("$.ratingDistribution[0]").value(0))
                .andExpect(jsonPath("$.ratingDistribution[4]").value(0))
                // Phase 8: số theo kỳ cũng phải là 0, không NaN
                .andExpect(jsonPath("$.ratingCountInPeriod").value(0))
                .andExpect(jsonPath("$.ratingAverageInPeriod").value(0.0))
                .andExpect(jsonPath("$.ratingAveragePrevPeriod").value(0.0))
                .andExpect(jsonPath("$.ratingDistributionInPeriod", hasSize(5)))
                .andExpect(jsonPath("$.ratingByFeature", hasSize(3)))
                .andExpect(jsonPath("$.ratingByFeature[0].feature").value("HAIR_SWAP"))
                .andExpect(jsonPath("$.ratingByFeature[0].count").value(0))
                .andExpect(jsonPath("$.ratingByFeature[0].average").value(0.0));
    }

    /** Lưu feedback rồi ghi đè created_at (vì @CreationTimestamp luôn đặt = hiện tại). */
    private void saveFeedbackAt(int rating, FeedbackFeature feature, LocalDateTime createdAt) {
        Feedback f = feedbackRepository.save(Feedback.builder()
                .user(testUser)
                .rating(rating)
                .feature(feature)
                .build());
        jdbcTemplate.update("UPDATE feedback SET created_at = ? WHERE id = ?", createdAt, f.getId());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void getStats_RatingInPeriod_ExcludesOldFeedbackAndComparesPrevPeriod() throws Exception {
        LocalDateTime now = LocalDateTime.now();
        // Trong kỳ 30 ngày: 5★ thử tóc, 3★ thử tóc, 4★ quét mặt → TB 4.0
        saveFeedbackAt(5, FeedbackFeature.HAIR_SWAP, now.minusDays(1));
        saveFeedbackAt(3, FeedbackFeature.HAIR_SWAP, now.minusDays(2));
        saveFeedbackAt(4, FeedbackFeature.FACE_SCAN, now.minusDays(3));
        // Kỳ trước (khoảng 30–60 ngày trước): 2★
        saveFeedbackAt(2, FeedbackFeature.GENERAL, now.minusDays(45));
        // Quá xa, không thuộc kỳ nào: 1★
        saveFeedbackAt(1, FeedbackFeature.GENERAL, now.minusDays(200));

        mockMvc.perform(get("/api/admin/dashboard/stats").param("period", "30d"))
                .andExpect(status().isOk())
                // Toàn thời gian vẫn giữ nguyên ý nghĩa cũ
                .andExpect(jsonPath("$.ratingCount").value(5))
                .andExpect(jsonPath("$.ratingAverage").value(3.0))
                // Theo kỳ
                .andExpect(jsonPath("$.ratingCountInPeriod").value(3))
                .andExpect(jsonPath("$.ratingAverageInPeriod").value(4.0))
                .andExpect(jsonPath("$.ratingCountPrevPeriod").value(1))
                .andExpect(jsonPath("$.ratingAveragePrevPeriod").value(2.0))
                .andExpect(jsonPath("$.ratingDistributionInPeriod[0]").value(0)) // 1★ cũ không tính
                .andExpect(jsonPath("$.ratingDistributionInPeriod[2]").value(1))
                .andExpect(jsonPath("$.ratingDistributionInPeriod[3]").value(1))
                .andExpect(jsonPath("$.ratingDistributionInPeriod[4]").value(1))
                // Theo tính năng: luôn đủ 3, đúng thứ tự
                .andExpect(jsonPath("$.ratingByFeature", hasSize(3)))
                .andExpect(jsonPath("$.ratingByFeature[0].feature").value("HAIR_SWAP"))
                .andExpect(jsonPath("$.ratingByFeature[0].count").value(2))
                .andExpect(jsonPath("$.ratingByFeature[0].average").value(4.0))
                .andExpect(jsonPath("$.ratingByFeature[1].feature").value("FACE_SCAN"))
                .andExpect(jsonPath("$.ratingByFeature[1].average").value(4.0))
                .andExpect(jsonPath("$.ratingByFeature[2].feature").value("GENERAL"))
                .andExpect(jsonPath("$.ratingByFeature[2].count").value(0));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void getStats_RevenueOnlyCountsPaidPayments() throws Exception {
        // Giao dịch PAID: 99,000 VND
        paymentRepository.save(Payment.builder()
                .user(testUser)
                .orderCode(1001L)
                .plan(SubscriptionPlan.PREMIUM)
                .amount(99000)
                .status(PaymentStatus.PAID)
                .paidAt(LocalDateTime.now())
                .build());

        // Giao dịch PENDING: 50,000 VND (không được tính vào doanh thu)
        paymentRepository.save(Payment.builder()
                .user(testUser)
                .orderCode(1002L)
                .plan(SubscriptionPlan.PRO)
                .amount(50000)
                .status(PaymentStatus.PENDING)
                .build());

        // Giao dịch CANCELLED: 75,000 VND (không được tính vào doanh thu)
        paymentRepository.save(Payment.builder()
                .user(testUser)
                .orderCode(1003L)
                .plan(SubscriptionPlan.PRO)
                .amount(75000)
                .status(PaymentStatus.CANCELLED)
                .build());

        // Thêm 2 feedback: 5 sao và 4 sao
        feedbackRepository.save(Feedback.builder()
                .user(testUser)
                .rating(5)
                .comment("Rất đẹp")
                .feature(FeedbackFeature.HAIR_SWAP)
                .build());

        feedbackRepository.save(Feedback.builder()
                .user(testUser)
                .rating(4)
                .comment("Khá ổn")
                .feature(FeedbackFeature.FACE_SCAN)
                .build());

        mockMvc.perform(get("/api/admin/dashboard/stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalRevenue").value(99000))
                .andExpect(jsonPath("$.totalTransactions").value(3))
                .andExpect(jsonPath("$.paidTransactions").value(1))
                .andExpect(jsonPath("$.pendingTransactions").value(1))
                .andExpect(jsonPath("$.cancelledTransactions").value(1))
                .andExpect(jsonPath("$.ratingCount").value(2))
                .andExpect(jsonPath("$.ratingTotalStars").value(9))
                .andExpect(jsonPath("$.ratingAverage").value(4.5))
                .andExpect(jsonPath("$.ratingDistribution", hasSize(5)))
                .andExpect(jsonPath("$.ratingDistribution[3]").value(1)) // 4 sao
                .andExpect(jsonPath("$.ratingDistribution[4]").value(1)); // 5 sao
    }
}
