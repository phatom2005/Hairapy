package com.hairapy.controllers.admin;

import com.hairapy.models.*;
import com.hairapy.repositories.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
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
                .andExpect(jsonPath("$.ratingDistribution[4]").value(0));
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
