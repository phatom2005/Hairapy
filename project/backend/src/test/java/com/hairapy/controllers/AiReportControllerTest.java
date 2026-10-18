package com.hairapy.controllers;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hairapy.dto.AiReportRequest;
import com.hairapy.models.AiContentReport;
import com.hairapy.models.Role;
import com.hairapy.models.User;
import com.hairapy.repositories.AiContentReportRepository;
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
class AiReportControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AiContentReportRepository reportRepository;

    @MockBean
    private UsageService usageService;

    private User mockUser;

    @BeforeEach
    void setUp() {
        mockUser = User.builder()
                .id(100L)
                .email("user@hairapy.io.vn")
                .fullName("User Test")
                .role(Role.USER)
                .build();
    }

    private String body(String reason, String imageUrl) throws Exception {
        return objectMapper.writeValueAsString(
                new AiReportRequest(reason, "Ảnh bị méo", imageUrl, 5L, "HAIR_SWAP"));
    }

    @Test
    @WithMockUser
    void submit_Success_SavesReport() throws Exception {
        when(usageService.getCurrentUser()).thenReturn(mockUser);
        when(reportRepository.countByUserIdAndCreatedAtAfter(eq(100L), any(LocalDateTime.class))).thenReturn(0L);

        mockMvc.perform(post("/api/reports")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("distorted", "https://res.cloudinary.com/demo/image/upload/x.jpg")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.message").exists());

        verify(reportRepository, times(1)).save(any(AiContentReport.class));
    }

    @Test
    @WithMockUser
    void submit_InvalidReason_Returns400() throws Exception {
        when(usageService.getCurrentUser()).thenReturn(mockUser);

        mockMvc.perform(post("/api/reports")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("NOT_A_REASON", null)))
                .andExpect(status().isBadRequest());

        verify(reportRepository, never()).save(any(AiContentReport.class));
    }

    @Test
    @WithMockUser
    void submit_BlankReason_Returns400() throws Exception {
        mockMvc.perform(post("/api/reports")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("", null)))
                .andExpect(status().isBadRequest());

        verify(reportRepository, never()).save(any(AiContentReport.class));
    }

    @Test
    @WithMockUser
    void submit_TooManyReports_Returns429() throws Exception {
        when(usageService.getCurrentUser()).thenReturn(mockUser);
        when(reportRepository.countByUserIdAndCreatedAtAfter(eq(100L), any(LocalDateTime.class))).thenReturn(10L);

        mockMvc.perform(post("/api/reports")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("OTHER", null)))
                .andExpect(status().isTooManyRequests());

        verify(reportRepository, never()).save(any(AiContentReport.class));
    }
}
