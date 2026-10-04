package com.hairapy.controllers.admin;

import com.hairapy.models.Feedback;
import com.hairapy.models.FeedbackFeature;
import com.hairapy.models.Role;
import com.hairapy.models.User;
import com.hairapy.repositories.FeedbackRepository;
import com.hairapy.repositories.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AdminFeedbackControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private FeedbackRepository feedbackRepository;

    @Autowired
    private UserRepository userRepository;

    private User testUser;

    @BeforeEach
    void setUp() {
        feedbackRepository.deleteAll();
        userRepository.deleteAll();

        testUser = userRepository.save(User.builder()
                .email("feedbackuser@hairapy.id.vn")
                .fullName("Feedback Tester")
                .role(Role.USER)
                .build());

        feedbackRepository.save(Feedback.builder()
                .user(testUser)
                .rating(5)
                .comment("Tuyệt vời")
                .feature(FeedbackFeature.HAIR_SWAP)
                .build());

        feedbackRepository.save(Feedback.builder()
                .user(testUser)
                .rating(2)
                .comment("Cần cải thiện")
                .feature(FeedbackFeature.FACE_SCAN)
                .build());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void getFeedbackList_Admin_Success() throws Exception {
        mockMvc.perform(get("/api/admin/feedback"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(2)))
                .andExpect(jsonPath("$.totalElements").value(2));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void getFeedbackList_FilterByRating_Success() throws Exception {
        mockMvc.perform(get("/api/admin/feedback?rating=5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].rating").value(5))
                .andExpect(jsonPath("$.content[0].comment").value("Tuyệt vời"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void getFeedbackList_InvalidRating_Returns400() throws Exception {
        mockMvc.perform(get("/api/admin/feedback?rating=6"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Số sao lọc phải từ 1 đến 5"));

        mockMvc.perform(get("/api/admin/feedback?rating=0"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Số sao lọc phải từ 1 đến 5"));
    }

    @Test
    @WithMockUser(roles = "USER")
    void getFeedbackList_RegularUser_Forbidden() throws Exception {
        mockMvc.perform(get("/api/admin/feedback"))
                .andExpect(status().isForbidden());
    }
}
