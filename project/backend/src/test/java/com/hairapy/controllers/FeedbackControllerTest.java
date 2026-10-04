package com.hairapy.controllers;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hairapy.dto.FeedbackRequest;
import com.hairapy.models.Feedback;
import com.hairapy.models.FeedbackFeature;
import com.hairapy.models.Role;
import com.hairapy.models.User;
import com.hairapy.repositories.FeedbackRepository;
import com.hairapy.services.UsageService;
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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class FeedbackControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private FeedbackRepository feedbackRepository;

    @MockBean
    private UsageService usageService;

    private User mockUser;

    @BeforeEach
    void setUp() {
        mockUser = User.builder()
                .id(100L)
                .email("user@hairapy.id.vn")
                .fullName("User Test")
                .role(Role.USER)
                .build();
    }

    @Test
    @WithMockUser
    void submitFeedback_Success() throws Exception {
        when(usageService.getCurrentUser()).thenReturn(mockUser);
        when(feedbackRepository.countByUserIdAndCreatedAtAfter(eq(100L), any(LocalDateTime.class))).thenReturn(0L);

        FeedbackRequest request = new FeedbackRequest(5, "Ứng dụng rất tuyệt vời!", "HAIR_SWAP");

        mockMvc.perform(post("/api/feedback")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.message").value("Cảm ơn bạn đã đánh giá!"));

        verify(feedbackRepository, times(1)).save(any(Feedback.class));
    }

    @Test
    @WithMockUser
    void submitFeedback_InvalidRating_Returns400() throws Exception {
        FeedbackRequest requestZero = new FeedbackRequest(0, "Tệ", "GENERAL");

        mockMvc.perform(post("/api/feedback")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestZero)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").exists());

        FeedbackRequest requestSix = new FeedbackRequest(6, "Quá 5 sao", "GENERAL");

        mockMvc.perform(post("/api/feedback")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestSix)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    @WithMockUser
    void submitFeedback_RateLimitExceeded_Returns429() throws Exception {
        when(usageService.getCurrentUser()).thenReturn(mockUser);
        when(feedbackRepository.countByUserIdAndCreatedAtAfter(eq(100L), any(LocalDateTime.class))).thenReturn(10L);

        FeedbackRequest request = new FeedbackRequest(4, "Spam feedback", "GENERAL");

        mockMvc.perform(post("/api/feedback")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.error").value("Bạn đã gửi quá nhiều đánh giá hôm nay."));

        verify(feedbackRepository, never()).save(any(Feedback.class));
    }

    @Test
    void submitFeedback_Unauthenticated_Returns403() throws Exception {
        // Không có JWT token -> Spring Security chặn bằng 403 Forbidden theo cấu hình mặc định
        FeedbackRequest request = new FeedbackRequest(5, "Đánh giá không login", "GENERAL");

        mockMvc.perform(post("/api/feedback")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser
    void submitFeedback_NoCurrentUser_Returns401() throws Exception {
        // Có context xác thực nhưng không tìm thấy user trong database
        when(usageService.getCurrentUser()).thenReturn(null);

        FeedbackRequest request = new FeedbackRequest(5, "Đánh giá user null", "GENERAL");

        mockMvc.perform(post("/api/feedback")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Vui lòng đăng nhập để gửi đánh giá."));
    }
}
