package com.hairapy.services;

import com.hairapy.config.LlmConfig;
import com.hairapy.dto.insight.TrendingStyleResponse;
import com.hairapy.dto.insight.WeeklyInsightResponse;
import com.hairapy.models.BookingStatus;
import com.hairapy.repositories.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Service tổng hợp bản tin insight hàng tuần cho admin và team sản phẩm:
 * - So sánh tuần vừa qua (lastWeek) với tuần trước đó (prevWeek).
 * - Tự động phát hiện bất thường (tăng/giảm >= 20%).
 * - Tạo tóm tắt bằng Gemini AI (hoặc fallback theo quy tắc).
 * - Gửi email HTML định kỳ tới ALERT_EMAIL và lưu bộ nhớ để admin xem trên dashboard.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class InsightDigestService {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final long REFRESH_COOLDOWN_MS = 5 * 60 * 1000; // 5 phút

    private final GaReportService gaReportService;
    private final TrendService trendService;
    private final EmailService emailService;
    private final LlmConfig llmConfig;
    private final RestTemplate llmRestTemplate;

    private final ScanHistoryRepository scanHistoryRepository;
    private final UsageHistoryRepository usageHistoryRepository;
    private final SavedHairstyleRepository savedHairstyleRepository;
    private final BookingRequestRepository bookingRequestRepository;
    private final PaymentRepository paymentRepository;
    private final SalonPartnerPaymentRepository salonPartnerPaymentRepository;

    @Value("${app.alert.email:}")
    private String alertEmail;

    private volatile WeeklyInsightResponse latestDigest;
    private final AtomicLong lastRefreshedAt = new AtomicLong(0);

    /**
     * Lấy digest mới nhất từ cache; nếu chưa có thì tính toán và lưu cache (không bắt buộc gửi mail).
     */
    public WeeklyInsightResponse getLatestDigest() {
        if (latestDigest == null) {
            synchronized (this) {
                if (latestDigest == null) {
                    latestDigest = generateWeeklyDigest(false);
                }
            }
        }
        return latestDigest;
    }

    /**
     * Làm mới digest thủ công (admin bấm nút "Tạo lại ngay"). Giới hạn 1 lần / 5 phút.
     */
    public WeeklyInsightResponse refreshDigest() {
        long now = System.currentTimeMillis();
        long last = lastRefreshedAt.get();
        if (last > 0 && (now - last) < REFRESH_COOLDOWN_MS) {
            long remainingSeconds = (REFRESH_COOLDOWN_MS - (now - last)) / 1000;
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Vui lòng đợi thêm " + remainingSeconds + " giây trước khi tạo lại bản tin insight.");
        }
        lastRefreshedAt.set(now);
        WeeklyInsightResponse fresh = generateWeeklyDigest(false);
        latestDigest = fresh;
        return fresh;
    }

    /**
     * Tính toán bản tin insight cho tuần này so với tuần trước.
     *
     * @param sendEmail có gửi email thông báo tới ALERT_EMAIL hay không
     */
    public synchronized WeeklyInsightResponse generateWeeklyDigest(boolean sendEmail) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime lastWeekStart = now.minusDays(7);
        LocalDateTime prevWeekStart = now.minusDays(14);
        LocalDateTime prevWeekEnd = lastWeekStart;

        String period = lastWeekStart.format(DATE_FMT) + " - " + now.format(DATE_FMT);

        // 1. Số người dùng (Ưu tiên GA4 activeUsers, fallback DB)
        long usersLastWeek = getActiveUsersCount("7daysAgo", "today", lastWeekStart, now);
        long usersPrevWeek = getActiveUsersCount("14daysAgo", "8daysAgo", prevWeekStart, prevWeekEnd);
        WeeklyInsightResponse.MetricComparison users = evaluateMetric(usersLastWeek, usersPrevWeek);

        // 2. Lượt quét mặt (DB)
        long scansLastWeek = scanHistoryRepository.countByCreatedAtBetween(lastWeekStart, now);
        long scansPrevWeek = scanHistoryRepository.countByCreatedAtBetween(prevWeekStart, prevWeekEnd);
        WeeklyInsightResponse.MetricComparison scans = evaluateMetric(scansLastWeek, scansPrevWeek);

        // 3. Lượt thử tóc bằng AI (DB)
        long swapsLastWeek = usageHistoryRepository.countByFeatureBetween("HAIR_SWAP", lastWeekStart, now);
        long swapsPrevWeek = usageHistoryRepository.countByFeatureBetween("HAIR_SWAP", prevWeekStart, prevWeekEnd);
        WeeklyInsightResponse.MetricComparison swaps = evaluateMetric(swapsLastWeek, swapsPrevWeek);

        // 4. Lượt lưu kiểu tóc (DB)
        long savesLastWeek = savedHairstyleRepository.countBetween(lastWeekStart, now);
        long savesPrevWeek = savedHairstyleRepository.countBetween(prevWeekStart, prevWeekEnd);
        WeeklyInsightResponse.MetricComparison saves = evaluateMetric(savesLastWeek, savesPrevWeek);

        // 5. Yêu cầu đặt lịch (DB)
        long bookingsLastWeek = bookingRequestRepository.countByCreatedAtBetween(lastWeekStart, now);
        long bookingsPrevWeek = bookingRequestRepository.countByCreatedAtBetween(prevWeekStart, prevWeekEnd);
        WeeklyInsightResponse.MetricComparison bookings = evaluateMetric(bookingsLastWeek, bookingsPrevWeek);

        // 6. Doanh thu (DB)
        long custRevLastWeek = paymentRepository.sumPaidAmountBetween(lastWeekStart, now);
        long custRevPrevWeek = paymentRepository.sumPaidAmountBetween(prevWeekStart, prevWeekEnd);
        long salonRevLastWeek = salonPartnerPaymentRepository.sumAmountBetween(lastWeekStart, now);
        long salonRevPrevWeek = salonPartnerPaymentRepository.sumAmountBetween(prevWeekStart, prevWeekEnd);
        long totalRevLastWeek = custRevLastWeek + salonRevLastWeek;
        long totalRevPrevWeek = custRevPrevWeek + salonRevPrevWeek;
        WeeklyInsightResponse.MetricComparison revComp = evaluateMetric(totalRevLastWeek, totalRevPrevWeek);
        WeeklyInsightResponse.RevenueComparison revenue = new WeeklyInsightResponse.RevenueComparison(
                custRevLastWeek, custRevPrevWeek,
                salonRevLastWeek, salonRevPrevWeek,
                totalRevLastWeek, totalRevPrevWeek,
                revComp.changePercent(), revComp.anomaly()
        );

        // 7. Phễu chuyển đổi
        List<WeeklyInsightResponse.FunnelStep> funnel = buildFunnel(lastWeekStart, now, prevWeekStart, prevWeekEnd,
                scansLastWeek, scansPrevWeek, swapsLastWeek, swapsPrevWeek, bookingsLastWeek, bookingsPrevWeek);

        // 8. Top 5 kiểu tóc đang hot
        List<TrendingStyleResponse> topTrending = trendService.getTrending(null, 5);

        // 9. Top lỗi (swap_error, scan_error, exception)
        List<WeeklyInsightResponse.ErrorItem> topErrors = fetchTopErrors();

        // 10. Kênh thu hút người dùng mới
        List<WeeklyInsightResponse.ChannelItem> topChannels = fetchTopChannels(usersLastWeek);

        // 11. Tổng hợp cảnh báo bất thường (>= 20%)
        List<WeeklyInsightResponse.AnomalyAlert> anomalies = new ArrayList<>();
        checkAnomaly(anomalies, "Người dùng hoạt động", users);
        checkAnomaly(anomalies, "Lượt quét mặt", scans);
        checkAnomaly(anomalies, "Lượt thử tóc AI", swaps);
        checkAnomaly(anomalies, "Lượt lưu yêu thích", saves);
        checkAnomaly(anomalies, "Yêu cầu đặt lịch", bookings);
        checkAnomaly(anomalies, "Tổng doanh thu", revComp);

        // 12. Tóm tắt AI (hoặc fallback theo quy tắc)
        AiSummaryResult summaryResult = generateSummary(users, scans, swaps, saves, revenue, bookings, anomalies, topTrending);

        WeeklyInsightResponse response = new WeeklyInsightResponse(
                period,
                now,
                users,
                scans,
                swaps,
                saves,
                revenue,
                bookings,
                funnel,
                topTrending,
                topErrors,
                topChannels,
                anomalies,
                summaryResult.summary(),
                summaryResult.isAiGenerated()
        );

        this.latestDigest = response;

        // 13. Gửi email nếu được yêu cầu
        if (sendEmail && alertEmail != null && !alertEmail.isBlank()) {
            try {
                String emailHtml = buildEmailHtml(response);
                emailService.sendAlertEmail(alertEmail, "[Hairapy] Báo cáo Insight tuần " + period, emailHtml);
            } catch (Exception e) {
                log.error("Không gửi được email báo cáo insight tuần: {}", e.getMessage());
            }
        }

        return response;
    }

    private long getActiveUsersCount(String gaStart, String gaEnd, LocalDateTime dbStart, LocalDateTime dbEnd) {
        try {
            List<GaReportService.Row> rows = gaReportService.runReport(gaStart, gaEnd, List.of(), List.of("activeUsers"), 1, null, null);
            if (!rows.isEmpty() && !rows.get(0).metrics().isEmpty()) {
                double gaVal = rows.get(0).metrics().get(0);
                if (gaVal > 0) {
                    return (long) gaVal;
                }
            }
        } catch (Exception e) {
            log.debug("Không lấy được GA activeUsers (dùng fallback DB): {}", e.getMessage());
        }
        return usageHistoryRepository.countActiveUsersBetween(dbStart, dbEnd);
    }

    private WeeklyInsightResponse.MetricComparison evaluateMetric(long current, long previous) {
        double changePercent = 0.0;
        String anomaly = "STABLE";
        if (previous > 0) {
            changePercent = Math.round(((double) (current - previous) / previous) * 1000.0) / 10.0;
            if (previous >= 20 && changePercent <= -20.0) {
                anomaly = "DOWN";
            } else if (changePercent >= 20.0) {
                anomaly = "UP";
            }
        } else if (current >= 20) {
            changePercent = 100.0;
            anomaly = "UP";
        }
        return new WeeklyInsightResponse.MetricComparison(current, previous, changePercent, anomaly);
    }

    private void checkAnomaly(List<WeeklyInsightResponse.AnomalyAlert> list, String name, WeeklyInsightResponse.MetricComparison m) {
        if ("DOWN".equals(m.anomaly())) {
            list.add(new WeeklyInsightResponse.AnomalyAlert(name, "DOWN", m.changePercent(),
                    "Giảm " + Math.abs(m.changePercent()) + "% so với tuần trước (từ " + m.prevWeek() + " xuống " + m.lastWeek() + ")"));
        } else if ("UP".equals(m.anomaly())) {
            list.add(new WeeklyInsightResponse.AnomalyAlert(name, "UP", m.changePercent(),
                    "Tăng " + m.changePercent() + "% so với tuần trước (từ " + m.prevWeek() + " lên " + m.lastWeek() + ")"));
        }
    }

    private List<WeeklyInsightResponse.FunnelStep> buildFunnel(
            LocalDateTime lastWeekStart, LocalDateTime now,
            LocalDateTime prevWeekStart, LocalDateTime prevWeekEnd,
            long scansLastWeek, long scansPrevWeek,
            long swapsLastWeek, long swapsPrevWeek,
            long bookingsLastWeek, long bookingsPrevWeek) {

        // Thử lấy số lượt salon_match_open từ GA
        long salonMatchLastWeek = fetchGaEventCount("7daysAgo", "today", "salon_match_open");
        long salonMatchPrevWeek = fetchGaEventCount("14daysAgo", "8daysAgo", "salon_match_open");

        // Lấy số booking confirmed từ DB
        long confirmedLastWeek = bookingRequestRepository.countByStatusAndCreatedAtBetween(BookingStatus.CONFIRMED, lastWeekStart, now)
                + bookingRequestRepository.countByStatusAndCreatedAtBetween(BookingStatus.COMPLETED, lastWeekStart, now);
        long confirmedPrevWeek = bookingRequestRepository.countByStatusAndCreatedAtBetween(BookingStatus.CONFIRMED, prevWeekStart, prevWeekEnd)
                + bookingRequestRepository.countByStatusAndCreatedAtBetween(BookingStatus.COMPLETED, prevWeekStart, prevWeekEnd);

        List<WeeklyInsightResponse.FunnelStep> steps = new ArrayList<>();
        steps.add(new WeeklyInsightResponse.FunnelStep("face_scan", "Quét phân tích mặt", scansLastWeek, scansPrevWeek, 100.0));

        double swapRate = scansLastWeek > 0 ? Math.round(((double) swapsLastWeek / scansLastWeek) * 1000.0) / 10.0 : 0.0;
        steps.add(new WeeklyInsightResponse.FunnelStep("hair_swap", "Thử kiểu tóc AI", swapsLastWeek, swapsPrevWeek, swapRate));

        double matchRate = swapsLastWeek > 0 && salonMatchLastWeek > 0
                ? Math.round(((double) salonMatchLastWeek / swapsLastWeek) * 1000.0) / 10.0 : 0.0;
        steps.add(new WeeklyInsightResponse.FunnelStep("salon_match_open", "Xem salon phù hợp", salonMatchLastWeek, salonMatchPrevWeek, matchRate));

        double submitBase = salonMatchLastWeek > 0 ? salonMatchLastWeek : (swapsLastWeek > 0 ? swapsLastWeek : 1);
        double submitRate = Math.round(((double) bookingsLastWeek / submitBase) * 1000.0) / 10.0;
        steps.add(new WeeklyInsightResponse.FunnelStep("booking_submit", "Gửi yêu cầu đặt lịch", bookingsLastWeek, bookingsPrevWeek, submitRate));

        double confirmRate = bookingsLastWeek > 0 ? Math.round(((double) confirmedLastWeek / bookingsLastWeek) * 1000.0) / 10.0 : 0.0;
        steps.add(new WeeklyInsightResponse.FunnelStep("booking_confirmed", "Salon xác nhận lịch", confirmedLastWeek, confirmedPrevWeek, confirmRate));

        return steps;
    }

    private long fetchGaEventCount(String start, String end, String eventName) {
        try {
            Map<String, Object> filter = Map.of("filter", Map.of(
                    "fieldName", "eventName",
                    "stringFilter", Map.of("value", eventName, "matchType", "EXACT")
            ));
            List<GaReportService.Row> rows = gaReportService.runReport(start, end, List.of("eventName"), List.of("eventCount"), 1, "eventCount", filter);
            if (!rows.isEmpty() && !rows.get(0).metrics().isEmpty()) {
                return (long) (double) rows.get(0).metrics().get(0);
            }
        } catch (Exception e) {
            log.debug("Không lấy được GA event {}: {}", eventName, e.getMessage());
        }
        return 0;
    }

    private List<WeeklyInsightResponse.ErrorItem> fetchTopErrors() {
        try {
            Map<String, Object> filter = Map.of("filter", Map.of(
                    "fieldName", "eventName",
                    "inListFilter", Map.of("values", List.of("swap_error", "scan_error", "exception"))
            ));
            List<GaReportService.Row> rows = gaReportService.runReport("7daysAgo", "today",
                    List.of("eventName", "pagePath"), List.of("eventCount"), 10, "eventCount", filter);
            List<WeeklyInsightResponse.ErrorItem> out = new ArrayList<>();
            for (GaReportService.Row r : rows) {
                String eventName = r.dims().size() > 0 ? r.dims().get(0) : "unknown";
                String pagePath = r.dims().size() > 1 ? r.dims().get(1) : "-";
                long count = r.metrics().isEmpty() ? 0 : (long) (double) r.metrics().get(0);
                out.add(new WeeklyInsightResponse.ErrorItem(eventName, pagePath, count));
            }
            return out;
        } catch (Exception e) {
            log.debug("Không lấy được GA top errors: {}", e.getMessage());
            return List.of();
        }
    }

    private List<WeeklyInsightResponse.ChannelItem> fetchTopChannels(long fallbackUsers) {
        try {
            List<GaReportService.Row> rows = gaReportService.runReport("7daysAgo", "today",
                    List.of("sessionDefaultChannelGroup"), List.of("newUsers"), 5, "newUsers", null);
            if (!rows.isEmpty()) {
                List<WeeklyInsightResponse.ChannelItem> list = new ArrayList<>();
                for (GaReportService.Row r : rows) {
                    String ch = r.dims().isEmpty() ? "Khác" : r.dims().get(0);
                    long u = r.metrics().isEmpty() ? 0 : (long) (double) r.metrics().get(0);
                    list.add(new WeeklyInsightResponse.ChannelItem(ch, u));
                }
                return list;
            }
        } catch (Exception e) {
            log.debug("Không lấy được GA channels: {}", e.getMessage());
        }
        return List.of(new WeeklyInsightResponse.ChannelItem("Trực tiếp (Direct)", fallbackUsers));
    }

    private record AiSummaryResult(String summary, boolean isAiGenerated) {}

    private AiSummaryResult generateSummary(
            WeeklyInsightResponse.MetricComparison users,
            WeeklyInsightResponse.MetricComparison scans,
            WeeklyInsightResponse.MetricComparison swaps,
            WeeklyInsightResponse.MetricComparison saves,
            WeeklyInsightResponse.RevenueComparison revenue,
            WeeklyInsightResponse.MetricComparison bookings,
            List<WeeklyInsightResponse.AnomalyAlert> anomalies,
            List<TrendingStyleResponse> trending) {

        if (llmConfig.getApiKey() == null || llmConfig.getApiKey().isBlank()) {
            return new AiSummaryResult(buildFallbackSummary(users, scans, swaps, revenue, bookings, anomalies), false);
        }

        StringBuilder prompt = new StringBuilder();
        prompt.append("Bạn là chuyên gia phân tích dữ liệu sản phẩm của Hairapy (nền tảng tư vấn và thử kiểu tóc bằng AI).\n");
        prompt.append("Dưới đây là số liệu vận hành tuần này so với tuần trước (tất cả là dữ liệu tổng hợp không định danh):\n");
        prompt.append(String.format("- Người dùng hoạt động: %d (tuần trước: %d, biến động: %+.1f%%)\n",
                users.lastWeek(), users.prevWeek(), users.changePercent()));
        prompt.append(String.format("- Lượt quét mặt (face_scan): %d (tuần trước: %d, biến động: %+.1f%%)\n",
                scans.lastWeek(), scans.prevWeek(), scans.changePercent()));
        prompt.append(String.format("- Lượt thử tóc AI (hair_swap): %d (tuần trước: %d, biến động: %+.1f%%)\n",
                swaps.lastWeek(), swaps.prevWeek(), swaps.changePercent()));
        prompt.append(String.format("- Lượt lưu kiểu tóc yêu thích: %d (tuần trước: %d, biến động: %+.1f%%)\n",
                saves.lastWeek(), saves.prevWeek(), saves.changePercent()));
        prompt.append(String.format("- Doanh thu tổng: %,d đ (Gói khách: %,d đ, Salon đối tác: %,d đ | tuần trước: %,d đ, biến động: %+.1f%%)\n",
                revenue.totalLastWeek(), revenue.customerLastWeek(), revenue.salonLastWeek(), revenue.totalPrevWeek(), revenue.changePercent()));
        prompt.append(String.format("- Yêu cầu đặt lịch salon: %d (tuần trước: %d, biến động: %+.1f%%)\n",
                bookings.lastWeek(), bookings.prevWeek(), bookings.changePercent()));

        if (trending != null && !trending.isEmpty()) {
            prompt.append("- Top kiểu tóc hot: ");
            for (int i = 0; i < Math.min(3, trending.size()); i++) {
                prompt.append(trending.get(i).name()).append(" (").append(trending.get(i).score()).append(" điểm), ");
            }
            prompt.append("\n");
        }

        if (!anomalies.isEmpty()) {
            prompt.append("- Các biến động bất thường cần lưu ý:\n");
            for (WeeklyInsightResponse.AnomalyAlert a : anomalies) {
                prompt.append(String.format("  + %s: %s (%+.1f%%)\n",
                        a.metric(), "UP".equals(a.direction()) ? "Tăng mạnh" : "Giảm sút", a.changePercent()));
            }
        }

        prompt.append("\nYêu cầu: Tóm tắt 3 điểm đáng chú ý và 2 hành động gợi ý cho team sản phẩm, ngắn gọn, chỉ dựa trên số liệu được cung cấp. "
                + "Viết bằng tiếng Việt, gạch đầu dòng rõ ràng, súc tích.");

        try {
            String url = UriComponentsBuilder
                    .fromHttpUrl("https://generativelanguage.googleapis.com/v1beta/models/" + llmConfig.getModel() + ":generateContent")
                    .queryParam("key", llmConfig.getApiKey())
                    .toUriString();

            Map<String, Object> requestBody = Map.of(
                    "contents", List.of(
                            Map.of("parts", List.of(Map.of("text", prompt.toString())))
                    ),
                    "generationConfig", Map.of(
                            "maxOutputTokens", 500,
                            "temperature", 0.7
                    )
            );

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            ResponseEntity<Map> resp = llmRestTemplate.postForEntity(url, entity, Map.class);
            if (resp.getStatusCode() == HttpStatus.OK && resp.getBody() != null) {
                String ans = extractGeminiText(resp.getBody());
                if (ans != null && !ans.isBlank()) {
                    return new AiSummaryResult(ans.trim(), true);
                }
            }
        } catch (Exception e) {
            log.warn("Lỗi gọi Gemini cho Weekly Insight summary (chuyển sang fallback): {}", e.getMessage());
        }

        return new AiSummaryResult(buildFallbackSummary(users, scans, swaps, revenue, bookings, anomalies), false);
    }

    public String buildFallbackSummary(
            WeeklyInsightResponse.MetricComparison users,
            WeeklyInsightResponse.MetricComparison scans,
            WeeklyInsightResponse.MetricComparison swaps,
            WeeklyInsightResponse.RevenueComparison revenue,
            WeeklyInsightResponse.MetricComparison bookings,
            List<WeeklyInsightResponse.AnomalyAlert> anomalies) {
        StringBuilder sb = new StringBuilder();
        sb.append("Tóm tắt vận hành tuần này:\n");
        sb.append(String.format("- Hoạt động chung: %d người dùng, %d lượt thử tóc AI, %d yêu cầu đặt lịch.\n",
                users.lastWeek(), swaps.lastWeek(), bookings.lastWeek()));
        sb.append(String.format("- Doanh thu: %,d đ (biến động %+.1f%% so với tuần trước).\n",
                revenue.totalLastWeek(), revenue.changePercent()));
        if (!anomalies.isEmpty()) {
            sb.append("- Điểm biến động đáng chú ý:\n");
            for (WeeklyInsightResponse.AnomalyAlert a : anomalies) {
                sb.append(String.format("  + %s %s: %s\n",
                        "UP".equals(a.direction()) ? "Tăng trưởng" : "Cần lưu ý",
                        a.metric(), a.note()));
            }
        } else {
            sb.append("- Hoạt động ổn định, không ghi nhận biến động bất thường nào vượt ngưỡng 20%.\n");
        }
        sb.append("- Gợi ý hành động: Tiếp tục theo dõi tỷ lệ chuyển đổi salon và tối ưu danh mục kiểu tóc đang thịnh hành.");
        return sb.toString();
    }

    @SuppressWarnings("unchecked")
    private String extractGeminiText(Map<String, Object> body) {
        try {
            List<Map<String, Object>> candidates = (List<Map<String, Object>>) body.get("candidates");
            if (candidates == null || candidates.isEmpty()) return null;
            Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
            if (content == null) return null;
            List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
            if (parts == null || parts.isEmpty()) return null;
            Object text = parts.get(0).get("text");
            return text != null ? text.toString() : null;
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Dựng template HTML cho email báo cáo tuần (sử dụng inline CSS và ▲/▼).
     */
    public String buildEmailHtml(WeeklyInsightResponse r) {
        StringBuilder sb = new StringBuilder();
        sb.append("<div style=\"font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 640px; margin: 0 auto; color: #1e293b; background: #ffffff; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0;\">");

        // Header
        sb.append("<div style=\"border-bottom: 2px solid #f1f5f9; padding-bottom: 16px; margin-bottom: 20px;\">");
        sb.append("<h2 style=\"margin: 0; color: #0f172a; font-size: 20px;\">Hairapy — Bản tin Insight Tuần</h2>");
        sb.append("<p style=\"margin: 4px 0 0 0; color: #64748b; font-size: 14px;\">Kỳ báo cáo: <b>").append(r.period()).append("</b></p>");
        sb.append("</div>");

        // Summary Box
        sb.append("<div style=\"background: #f8fafc; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 6px; margin-bottom: 24px;\">");
        sb.append("<div style=\"font-weight: 600; font-size: 14px; color: #1e3a8a; margin-bottom: 8px;\">");
        sb.append(r.aiGenerated() ? "Tóm tắt do AI tạo" : "Tóm tắt vận hành tuần");
        sb.append("</div>");
        sb.append("<div style=\"font-size: 14px; line-height: 1.6; color: #334155; white-space: pre-line;\">")
                .append(escapeHtml(r.aiSummary())).append("</div>");
        sb.append("</div>");

        // Metrics Table
        sb.append("<h3 style=\"font-size: 16px; margin: 0 0 12px 0; color: #0f172a;\">1. Chỉ số hoạt động cốt lõi</h3>");
        sb.append("<table style=\"width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 24px;\">");
        sb.append("<thead><tr style=\"background: #f1f5f9; text-align: left;\">");
        sb.append("<th style=\"padding: 8px 12px; border: 1px solid #e2e8f0;\">Chỉ số</th>");
        sb.append("<th style=\"padding: 8px 12px; border: 1px solid #e2e8f0; text-align: right;\">Tuần này</th>");
        sb.append("<th style=\"padding: 8px 12px; border: 1px solid #e2e8f0; text-align: right;\">Tuần trước</th>");
        sb.append("<th style=\"padding: 8px 12px; border: 1px solid #e2e8f0; text-align: right;\">Biến động</th>");
        sb.append("</tr></thead><tbody>");

        appendMetricRow(sb, "Người dùng hoạt động", r.users().lastWeek(), r.users().prevWeek(), r.users().changePercent(), r.users().anomaly());
        appendMetricRow(sb, "Lượt quét mặt", r.scans().lastWeek(), r.scans().prevWeek(), r.scans().changePercent(), r.scans().anomaly());
        appendMetricRow(sb, "Lượt thử tóc AI", r.swaps().lastWeek(), r.swaps().prevWeek(), r.swaps().changePercent(), r.swaps().anomaly());
        appendMetricRow(sb, "Lượt lưu yêu thích", r.saves().lastWeek(), r.saves().prevWeek(), r.saves().changePercent(), r.saves().anomaly());
        appendMetricRow(sb, "Yêu cầu đặt lịch", r.bookings().lastWeek(), r.bookings().prevWeek(), r.bookings().changePercent(), r.bookings().anomaly());
        appendRevenueRow(sb, "Doanh thu tổng (VNĐ)", r.revenue().totalLastWeek(), r.revenue().totalPrevWeek(), r.revenue().changePercent(), r.revenue().anomaly());

        sb.append("</tbody></table>");

        // Trending styles
        if (r.topTrending() != null && !r.topTrending().isEmpty()) {
            sb.append("<h3 style=\"font-size: 16px; margin: 0 0 12px 0; color: #0f172a;\">2. Top kiểu tóc hot tuần này</h3>");
            sb.append("<ol style=\"font-size: 14px; color: #334155; padding-left: 20px; margin-bottom: 24px;\">");
            for (TrendingStyleResponse s : r.topTrending()) {
                sb.append("<li style=\"margin-bottom: 4px;\"><b>").append(escapeHtml(s.name())).append("</b> (")
                        .append(s.score()).append(" điểm)</li>");
            }
            sb.append("</ol>");
        }

        // Funnel
        if (r.funnel() != null && !r.funnel().isEmpty()) {
            sb.append("<h3 style=\"font-size: 16px; margin: 0 0 12px 0; color: #0f172a;\">3. Tỷ lệ chuyển đổi phễu</h3>");
            sb.append("<ul style=\"font-size: 14px; color: #334155; padding-left: 20px; margin-bottom: 24px;\">");
            for (WeeklyInsightResponse.FunnelStep step : r.funnel()) {
                sb.append("<li style=\"margin-bottom: 4px;\">").append(escapeHtml(step.label()))
                        .append(": <b>").append(step.lastWeekCount()).append("</b> lượt")
                        .append(" (chuyển đổi: <b>").append(step.conversionRate()).append("%</b>)</li>");
            }
            sb.append("</ul>");
        }

        // Footer
        sb.append("<div style=\"border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 12px; color: #94a3b8; text-align: center;\">");
        sb.append("Báo cáo tự động từ Hairapy Analytics. Đăng nhập trang Admin để xem chi tiết.");
        sb.append("</div>");

        sb.append("</div>");
        return sb.toString();
    }

    private void appendMetricRow(StringBuilder sb, String name, long cur, long prev, double change, String anomaly) {
        sb.append("<tr>");
        sb.append("<td style=\"padding: 8px 12px; border: 1px solid #e2e8f0;\">").append(name).append("</td>");
        sb.append("<td style=\"padding: 8px 12px; border: 1px solid #e2e8f0; text-align: right; font-weight: 500;\">").append(String.format("%,d", cur)).append("</td>");
        sb.append("<td style=\"padding: 8px 12px; border: 1px solid #e2e8f0; text-align: right; color: #64748b;\">").append(String.format("%,d", prev)).append("</td>");
        sb.append("<td style=\"padding: 8px 12px; border: 1px solid #e2e8f0; text-align: right;\">");
        formatBadge(sb, change, anomaly);
        sb.append("</td></tr>");
    }

    private void appendRevenueRow(StringBuilder sb, String name, long cur, long prev, double change, String anomaly) {
        sb.append("<tr style=\"background: #fafafa;\">");
        sb.append("<td style=\"padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: 600;\">").append(name).append("</td>");
        sb.append("<td style=\"padding: 8px 12px; border: 1px solid #e2e8f0; text-align: right; font-weight: 600;\">").append(String.format("%,d", cur)).append("</td>");
        sb.append("<td style=\"padding: 8px 12px; border: 1px solid #e2e8f0; text-align: right; color: #64748b;\">").append(String.format("%,d", prev)).append("</td>");
        sb.append("<td style=\"padding: 8px 12px; border: 1px solid #e2e8f0; text-align: right;\">");
        formatBadge(sb, change, anomaly);
        sb.append("</td></tr>");
    }

    private void formatBadge(StringBuilder sb, double change, String anomaly) {
        if ("UP".equals(anomaly)) {
            sb.append("<span style=\"color: #16a34a; font-weight: 600;\">▲ +").append(change).append("%</span>");
        } else if ("DOWN".equals(anomaly)) {
            sb.append("<span style=\"color: #dc2626; font-weight: 600;\">▼ ").append(change).append("%</span>");
        } else {
            sb.append("<span style=\"color: #64748b;\">").append(change >= 0 ? "+" : "").append(change).append("%</span>");
        }
    }

    private String escapeHtml(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
