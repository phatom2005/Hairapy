package com.hairapy.services;

import com.hairapy.config.LlmConfig;
import com.hairapy.dto.insight.WeeklyInsightResponse;
import com.hairapy.repositories.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InsightDigestServiceTest {

    @Mock
    private GaReportService gaReportService;
    @Mock
    private TrendService trendService;
    @Mock
    private EmailService emailService;
    @Mock
    private LlmConfig llmConfig;
    @Mock
    private RestTemplate llmRestTemplate;

    @Mock
    private ScanHistoryRepository scanHistoryRepository;
    @Mock
    private UsageHistoryRepository usageHistoryRepository;
    @Mock
    private SavedHairstyleRepository savedHairstyleRepository;
    @Mock
    private BookingRequestRepository bookingRequestRepository;
    @Mock
    private PaymentRepository paymentRepository;
    @Mock
    private SalonPartnerPaymentRepository salonPartnerPaymentRepository;

    private InsightDigestService service;

    @BeforeEach
    void setUp() {
        service = new InsightDigestService(
                gaReportService,
                trendService,
                emailService,
                llmConfig,
                llmRestTemplate,
                scanHistoryRepository,
                usageHistoryRepository,
                savedHairstyleRepository,
                bookingRequestRepository,
                paymentRepository,
                salonPartnerPaymentRepository
        );
    }

    @Test
    @DisplayName("generateWeeklyDigest tạo báo cáo và phát hiện bất thường đúng quy tắc (giảm >= 20% khi prev >= 20)")
    void testAnomalyDetectionDown() {
        when(scanHistoryRepository.countByCreatedAtBetween(any(), any())).thenReturn(70L, 100L); // last=70, prev=100 -> -30%
        when(usageHistoryRepository.countByFeatureBetween(eq("HAIR_SWAP"), any(), any())).thenReturn(150L, 100L); // last=150, prev=100 -> +50%
        when(savedHairstyleRepository.countBetween(any(), any())).thenReturn(50L, 50L);
        when(bookingRequestRepository.countByCreatedAtBetween(any(), any())).thenReturn(10L, 10L);
        when(paymentRepository.sumPaidAmountBetween(any(), any())).thenReturn(1_000_000L, 1_000_000L);
        when(salonPartnerPaymentRepository.sumAmountBetween(any(), any())).thenReturn(0L, 0L);
        when(trendService.getTrending(isNull(), eq(5))).thenReturn(List.of());
        when(llmConfig.getApiKey()).thenReturn(null); // Kích hoạt fallback summary

        WeeklyInsightResponse digest = service.generateWeeklyDigest(false);

        assertThat(digest).isNotNull();
        assertThat(digest.scans().changePercent()).isEqualTo(-30.0);
        assertThat(digest.scans().anomaly()).isEqualTo("DOWN");

        assertThat(digest.swaps().changePercent()).isEqualTo(50.0);
        assertThat(digest.swaps().anomaly()).isEqualTo("UP");

        assertThat(digest.saves().anomaly()).isEqualTo("STABLE");

        // Anomaly alert list should have items
        assertThat(digest.anomalies()).hasSize(2);
        assertThat(digest.anomalies()).anyMatch(a -> a.metric().equals("Lượt quét mặt") && a.direction().equals("DOWN"));
        assertThat(digest.anomalies()).anyMatch(a -> a.metric().equals("Lượt thử tóc AI") && a.direction().equals("UP"));
        assertThat(digest.aiGenerated()).isFalse();
    }

    @Test
    @DisplayName("Biến động giảm khi tuần trước < 20 đơn vị thì không đánh dấu bất thường DOWN")
    void testAnomalyDetectionThresholdUnder20() {
        when(scanHistoryRepository.countByCreatedAtBetween(any(), any())).thenReturn(5L, 10L); // -50% nhưng prev=10 (< 20)
        when(usageHistoryRepository.countByFeatureBetween(eq("HAIR_SWAP"), any(), any())).thenReturn(10L, 10L);
        when(savedHairstyleRepository.countBetween(any(), any())).thenReturn(0L, 0L);
        when(bookingRequestRepository.countByCreatedAtBetween(any(), any())).thenReturn(0L, 0L);
        when(paymentRepository.sumPaidAmountBetween(any(), any())).thenReturn(0L, 0L);
        when(salonPartnerPaymentRepository.sumAmountBetween(any(), any())).thenReturn(0L, 0L);
        when(trendService.getTrending(isNull(), eq(5))).thenReturn(List.of());
        when(llmConfig.getApiKey()).thenReturn(null);

        WeeklyInsightResponse digest = service.generateWeeklyDigest(false);

        assertThat(digest.scans().changePercent()).isEqualTo(-50.0);
        assertThat(digest.scans().anomaly()).isEqualTo("STABLE");
        assertThat(digest.anomalies()).isEmpty();
    }

    @Test
    @DisplayName("buildFallbackSummary sinh văn bản tóm tắt hợp lệ khi không có LLM")
    void testFallbackSummary() {
        WeeklyInsightResponse.MetricComparison users = new WeeklyInsightResponse.MetricComparison(100, 80, 25.0, "UP");
        WeeklyInsightResponse.MetricComparison scans = new WeeklyInsightResponse.MetricComparison(50, 50, 0.0, "STABLE");
        WeeklyInsightResponse.MetricComparison swaps = new WeeklyInsightResponse.MetricComparison(30, 50, -40.0, "DOWN");
        WeeklyInsightResponse.RevenueComparison revenue = new WeeklyInsightResponse.RevenueComparison(
                1_000_000, 500_000, 0, 0, 1_000_000, 500_000, 100.0, "UP");
        WeeklyInsightResponse.MetricComparison bookings = new WeeklyInsightResponse.MetricComparison(5, 5, 0.0, "STABLE");
        List<WeeklyInsightResponse.AnomalyAlert> alerts = List.of(
                new WeeklyInsightResponse.AnomalyAlert("Lượt thử tóc AI", "DOWN", -40.0, "Giảm 40%"),
                new WeeklyInsightResponse.AnomalyAlert("Tổng doanh thu", "UP", 100.0, "Tăng 100%")
        );

        String summary = service.buildFallbackSummary(users, scans, swaps, revenue, bookings, alerts);

        assertThat(summary).contains("Tóm tắt vận hành tuần này");
        assertThat(summary).contains("100 người dùng");
        assertThat(summary).contains("Lượt thử tóc AI");
        assertThat(summary).contains("Tổng doanh thu");
    }

    @Test
    @DisplayName("refreshDigest bị giới hạn tần suất 5 phút (429 Too Many Requests)")
    void testRateLimiting() {
        when(trendService.getTrending(isNull(), eq(5))).thenReturn(List.of());

        // Lần 1: thành công
        service.refreshDigest();

        // Lần 2: ngay sau đó -> ném ResponseStatusException TOO_MANY_REQUESTS
        assertThrows(ResponseStatusException.class, () -> service.refreshDigest());
    }
}
