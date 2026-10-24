package com.hairapy.controllers;

import com.hairapy.dto.auth.LoginRequest;
import com.hairapy.models.Payment;
import com.hairapy.models.PaymentStatus;
import com.hairapy.models.Role;
import com.hairapy.models.SubscriptionPlan;
import com.hairapy.models.User;
import com.hairapy.repositories.PaymentRepository;
import com.hairapy.repositories.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** GET /api/payments/my chỉ trả giao dịch của chính user đang đăng nhập. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class MyPaymentsControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private PaymentRepository paymentRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private ObjectMapper objectMapper;

    // Chỉ xoá dữ liệu do chính test này tạo (test class khác có thể để lại scan_history → deleteAll(users) sẽ vỡ FK)
    private final java.util.List<User> created = new java.util.ArrayList<>();

    @BeforeEach
    void setUp() {
        created.clear();
    }

    @AfterEach
    void cleanup() {
        for (User u : created) {
            paymentRepository.findByUserId(u.getId(), org.springframework.data.domain.Pageable.unpaged())
                    .forEach(paymentRepository::delete);
            userRepository.deleteById(u.getId());
        }
    }

    private User newUser(String email) {
        User u = userRepository.save(User.builder().email(email)
                .passwordHash(passwordEncoder.encode("password123"))
                .role(Role.USER).fullName("U").emailVerified(true).build());
        created.add(u);
        return u;
    }

    private void newPayment(User u, long code, SubscriptionPlan plan, int amount) {
        paymentRepository.save(Payment.builder().user(u).orderCode(code).plan(plan).amount(amount)
                .status(PaymentStatus.PENDING).build());
    }

    private String login(String email) throws Exception {
        String json = mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest(email, "password123"))))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(json).get("token").asText();
    }

    @Test
    void myPayments_chiTraGiaoDichCuaChinhMinh() throws Exception {
        User a = newUser("mypay-a@example.com");
        User b = newUser("mypay-b@example.com");
        newPayment(a, 1001L, SubscriptionPlan.PRO, 49000);
        newPayment(a, 1002L, SubscriptionPlan.PREMIUM, 99000);
        newPayment(b, 2001L, SubscriptionPlan.PRO, 49000);

        mockMvc.perform(get("/api/payments/my").header("Authorization", "Bearer " + login("mypay-a@example.com")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.content[0].orderCode").exists())
                .andExpect(jsonPath("$.content[?(@.orderCode==2001)]").isEmpty());
    }

    @Test
    void myPayments_khongDangNhap_biChan() throws Exception {
        mockMvc.perform(get("/api/payments/my")).andExpect(status().isForbidden());
    }
}
