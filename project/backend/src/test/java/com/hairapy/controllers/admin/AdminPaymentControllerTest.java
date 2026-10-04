package com.hairapy.controllers.admin;

import com.hairapy.models.Payment;
import com.hairapy.models.PaymentStatus;
import com.hairapy.models.Role;
import com.hairapy.models.SubscriptionPlan;
import com.hairapy.models.User;
import com.hairapy.repositories.FeedbackRepository;
import com.hairapy.repositories.PaymentRepository;
import com.hairapy.repositories.UserRepository;
import org.junit.jupiter.api.AfterEach;
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
class AdminPaymentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private FeedbackRepository feedbackRepository;

    @Autowired
    private UserRepository userRepository;

    private User testUser;

    @BeforeEach
    void setUp() {
        feedbackRepository.deleteAll();
        paymentRepository.deleteAll();
        userRepository.deleteAll();

        testUser = userRepository.save(User.builder()
                .email("payer@hairapy.id.vn")
                .fullName("Payer One")
                .role(Role.USER)
                .build());

        paymentRepository.save(Payment.builder()
                .user(testUser)
                .orderCode(2001L)
                .plan(SubscriptionPlan.PREMIUM)
                .amount(199000)
                .status(PaymentStatus.PAID)
                .paidAt(LocalDateTime.now())
                .payosTransactionId("PAYOS_TX_001")
                .build());

        paymentRepository.save(Payment.builder()
                .user(testUser)
                .orderCode(2002L)
                .plan(SubscriptionPlan.PRO)
                .amount(99000)
                .status(PaymentStatus.PENDING)
                .build());
    }

    @AfterEach
    void tearDown() {
        paymentRepository.deleteAll();
        feedbackRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void getPayments_Admin_Success() throws Exception {
        mockMvc.perform(get("/api/admin/payments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(2)))
                .andExpect(jsonPath("$.totalElements").value(2));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void getPayments_FilterByStatus_Success() throws Exception {
        mockMvc.perform(get("/api/admin/payments?status=PAID"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].orderCode").value(2001))
                .andExpect(jsonPath("$.content[0].status").value("PAID"))
                .andExpect(jsonPath("$.content[0].userEmail").value("payer@hairapy.id.vn"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void getPayments_InvalidStatus_Returns400() throws Exception {
        mockMvc.perform(get("/api/admin/payments?status=ABC"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    @WithMockUser(roles = "USER")
    void getPayments_RegularUser_Forbidden() throws Exception {
        mockMvc.perform(get("/api/admin/payments"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void getPaymentSummary_Admin_Success() throws Exception {
        mockMvc.perform(get("/api/admin/payments/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalAmountPaid").value(199000))
                .andExpect(jsonPath("$.paidCount").value(1))
                .andExpect(jsonPath("$.pendingCount").value(1))
                .andExpect(jsonPath("$.cancelledCount").value(0));
    }
}
