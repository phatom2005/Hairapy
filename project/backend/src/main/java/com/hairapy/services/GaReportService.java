package com.hairapy.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Jwts;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Lấy số liệu Google Analytics 4 (Data API v1beta) để hiện trên dashboard admin.
 * Xác thực bằng service account (JWT RS256 ký bằng jjwt có sẵn, không cần thêm thư viện Google).
 * Kết quả cache 10 phút theo số ngày; lỗi/thiếu cấu hình chỉ trả về trường error, không ném exception.
 *
 * Cấu hình (Railway): GA_PROPERTY_ID (số, vd 558206401), GA_SERVICE_ACCOUNT_JSON (JSON key hoặc base64 của nó).
 * Service account phải được thêm làm Viewer trong GA4 (Quản trị → Quản lý quyền truy cập property).
 */
@Slf4j
@Service
public class GaReportService {

    private static final String TOKEN_URL = "https://oauth2.googleapis.com/token";
    private static final String SCOPE = "https://www.googleapis.com/auth/analytics.readonly";
    private static final Duration CACHE_TTL = Duration.ofMinutes(10);

    /** Các sự kiện tuỳ chỉnh của Hairapy (khớp frontend lib/analytics.js và các trang). */
    private static final List<String> TRACKED_EVENTS = List.of(
            "page_view", "sign_up", "login", "face_scan", "view_hairstyle", "select_hair_color", "hair_swap",
            "download_result", "save_favorite", "view_plans", "begin_checkout", "purchase",
            "paywall_view", "quota_exceeded", "scan_error", "swap_error", "ai_report_submit", "feedback_submit",
            "search", "filter_catalog", "filter_salons", "view_salon", "exception", "page_timing");

    /** Từ khoá nhận diện nền tảng MXH trong "nguồn / phương tiện" của GA4. */
    private static final Map<String, String> SOCIAL_KEYWORDS = new LinkedHashMap<>();
    static {
        SOCIAL_KEYWORDS.put("Facebook", "facebook|fb.com|fb.me|fbclid");
        SOCIAL_KEYWORDS.put("Instagram", "instagram");
        SOCIAL_KEYWORDS.put("TikTok", "tiktok");
        SOCIAL_KEYWORDS.put("Zalo", "zalo");
        SOCIAL_KEYWORDS.put("YouTube", "youtube|youtu.be");
        SOCIAL_KEYWORDS.put("Threads", "threads");
        SOCIAL_KEYWORDS.put("X / Twitter", "twitter");
        SOCIAL_KEYWORDS.put("Reddit", "reddit");
    }

    public record Row(List<String> dims, List<Double> metrics) {}

    public record SocialRow(String platform, double sessions, double users, double keyEvents) {}

    public record GaSnapshot(
            boolean configured,
            String error,
            int days,
            Map<String, Double> overview,
            List<Row> channels,
            List<Row> sources,
            List<SocialRow> social,
            List<Row> events,
            List<Row> daily,
            Map<String, List<Row>> extra,
            LocalDateTime fetchedAt) {}

    private final RestTemplate restTemplate;
    private final ObjectMapper mapper = new ObjectMapper();
    private final String propertyId;
    private final String serviceAccountJson;

    private final Map<Integer, GaSnapshot> cache = new ConcurrentHashMap<>();
    private String accessToken;
    private Instant tokenExpiry = Instant.EPOCH;

    public GaReportService(@Qualifier("aiRestTemplate") RestTemplate restTemplate,
                           @Value("${app.ga.property-id:}") String propertyId,
                           @Value("${app.ga.service-account-json:}") String serviceAccountJson) {
        this.restTemplate = restTemplate;
        this.propertyId = propertyId == null ? "" : propertyId.trim();
        this.serviceAccountJson = serviceAccountJson == null ? "" : serviceAccountJson.trim();
    }

    public synchronized GaSnapshot getSnapshot(int days, boolean forceRefresh) {
        int d = Math.min(Math.max(days, 1), 365);
        if (propertyId.isEmpty() || serviceAccountJson.isEmpty()) {
            return empty(d, false, "Chưa cấu hình GA_PROPERTY_ID / GA_SERVICE_ACCOUNT_JSON trên server.");
        }
        GaSnapshot current = cache.get(d);
        if (current != null && current.error() == null) {
            long age = Duration.between(current.fetchedAt(), LocalDateTime.now()).getSeconds();
            if (age < (forceRefresh ? 60 : CACHE_TTL.getSeconds())) return current;
        }
        try {
            GaSnapshot fresh = fetch(d);
            cache.put(d, fresh);
            return fresh;
        } catch (Exception e) {
            log.warn("Không lấy được dữ liệu GA4: {}", e.getMessage());
            return empty(d, true, "Không lấy được dữ liệu GA4: " + shorten(e.getMessage()));
        }
    }

    private GaSnapshot fetch(int days) throws Exception {
        String start = days + "daysAgo";
        List<Map<String, Object>> requests = new ArrayList<>();
        // 0: tổng quan
        requests.add(report(start, List.of(), List.of("activeUsers", "newUsers", "sessions", "screenPageViews",
                "engagementRate", "averageSessionDuration", "keyEvents"), 1, null, null));
        // 1: kênh mặc định (Organic Social, Direct, Referral...)
        requests.add(report(start, List.of("sessionDefaultChannelGroup"), List.of("sessions", "activeUsers", "keyEvents"),
                10, "sessions", null));
        // 2: nguồn / phương tiện (facebook / social, tiktok / social...)
        requests.add(report(start, List.of("sessionSourceMedium"), List.of("sessions", "activeUsers", "keyEvents"),
                50, "sessions", null));
        // 3: số lần mỗi sự kiện của Hairapy
        requests.add(report(start, List.of("eventName"), List.of("eventCount", "totalUsers"),
                50, "eventCount", TRACKED_EVENTS));
        // 4: theo ngày
        requests.add(report(start, List.of("date"), List.of("activeUsers", "sessions"), days + 1, null, null));

        Map<String, Object> body = Map.of("requests", requests);
        JsonNode resp = post("https://analyticsdata.googleapis.com/v1beta/properties/" + propertyId + ":batchRunReports", body);
        JsonNode reports = resp.path("reports");

        Map<String, Double> overview = new LinkedHashMap<>();
        List<Row> overviewRows = parse(reports.get(0));
        String[] names = {"activeUsers", "newUsers", "sessions", "screenPageViews", "engagementRate",
                "averageSessionDuration", "keyEvents"};
        for (int i = 0; i < names.length; i++) {
            double v = overviewRows.isEmpty() || overviewRows.get(0).metrics().size() <= i ? 0
                    : overviewRows.get(0).metrics().get(i);
            overview.put(names[i], v);
        }

        List<Row> sources = parse(reports.get(2));
        List<Row> daily = parse(reports.get(4));
        daily.sort((a, b) -> a.dims().get(0).compareTo(b.dims().get(0)));

        return new GaSnapshot(true, null, days, overview, parse(reports.get(1)), sources, socialFrom(sources),
                parse(reports.get(3)), daily, fetchExtra(start, days), LocalDateTime.now());
    }

    /**
     * Các báo cáo chi tiết cho trang GA4 riêng. Mỗi nhóm gọi riêng và bọc try/catch:
     * một nhóm lỗi (vd custom dimension chưa đăng ký trong GA4) chỉ làm nhóm đó rỗng.
     */
    private Map<String, List<Row>> fetchExtra(String start, int days) {
        Map<String, List<Row>> out = new LinkedHashMap<>();
        List<String> sessUsers = List.of("sessions", "activeUsers");
        // Nhóm 1: trang, quốc gia, thiết bị, trình duyệt
        runGroup(out, List.of("topPages", "landingPages", "countries", "devices", "browsers"), List.of(
                report(start, List.of("pagePath"), List.of("screenPageViews", "activeUsers", "averageSessionDuration"), 15, "screenPageViews", null),
                report(start, List.of("landingPage"), List.of("sessions", "activeUsers", "keyEvents"), 15, "sessions", null),
                report(start, List.of("country"), sessUsers, 15, "sessions", null),
                report(start, List.of("deviceCategory"), sessUsers, 10, "sessions", null),
                report(start, List.of("browser"), sessUsers, 10, "sessions", null)));
        // Nhóm 2: hệ điều hành, người dùng mới/cũ, giờ trong ngày, thành phố, nguồn đầu tiên của người dùng mới
        runGroup(out, List.of("os", "newVsReturning", "hours", "cities", "firstUserSources"), List.of(
                report(start, List.of("operatingSystem"), sessUsers, 10, "sessions", null),
                report(start, List.of("newVsReturning"), sessUsers, 5, "sessions", null),
                report(start, List.of("hour"), List.of("sessions"), 24, null, null),
                report(start, List.of("city"), sessUsers, 15, "sessions", null),
                report(start, List.of("firstUserSourceMedium"), List.of("newUsers", "keyEvents"), 15, "newUsers", null)));
        // Nhóm 3: kỳ trước (để so sánh), ngôn ngữ, doanh thu theo nguồn, trang hay lỗi
        String prevStart = (days * 2) + "daysAgo";
        String prevEnd = (days + 1) + "daysAgo";
        runGroup(out, List.of("prevOverview", "languages", "revenueBySource", "errorPages"), List.of(
                report(prevStart, prevEnd, List.of(), List.of("activeUsers", "newUsers", "sessions", "screenPageViews",
                        "engagementRate", "averageSessionDuration", "keyEvents"), 1, null, null),
                report(start, List.of("language"), sessUsers, 10, "sessions", null),
                report(start, List.of("sessionSourceMedium"), List.of("purchaseRevenue", "ecommercePurchases"), 15, "purchaseRevenue", null),
                report(start, List.of("pagePath"), List.of("eventCount"), 10, "eventCount", List.of("exception"))));
        // Custom dimension (chỉ có số liệu sau khi đăng ký trong GA4: Quản trị → Định nghĩa tùy chỉnh)
        runGroup(out, List.of("hairColors"), List.of(
                report(start, List.of("customEvent:hair_color"), List.of("eventCount"), 25, "eventCount", List.of("hair_swap"))));
        runGroup(out, List.of("faceShapes"), List.of(
                report(start, List.of("customEvent:face_shape"), List.of("eventCount"), 10, "eventCount", List.of("face_scan"))));
        runGroup(out, List.of("searchTerms"), List.of(
                report(start, List.of("customEvent:search_term"), List.of("eventCount"), 20, "eventCount", List.of("search"))));
        runGroup(out, List.of("signupSources"), List.of(
                report(start, List.of("customEvent:ft_source", "eventName"), List.of("eventCount"), 50, "eventCount",
                        List.of("sign_up", "face_scan", "hair_swap", "purchase"))));
        return out;
    }

    public record RealtimeSnapshot(boolean configured, String error, double activeUsers, List<Row> countries,
                                   List<Row> pages, List<Row> devices, LocalDateTime fetchedAt) {}

    private RealtimeSnapshot realtimeCache;

    /** Số người đang dùng web trong 30 phút qua (GA4 realtime). Cache 30 giây để không vượt hạn mức API. */
    public synchronized RealtimeSnapshot getRealtime() {
        if (propertyId.isEmpty() || serviceAccountJson.isEmpty()) {
            return new RealtimeSnapshot(false, "Chưa cấu hình GA_PROPERTY_ID / GA_SERVICE_ACCOUNT_JSON trên server.",
                    0, List.of(), List.of(), List.of(), LocalDateTime.now());
        }
        RealtimeSnapshot c = realtimeCache;
        if (c != null && c.error() == null && Duration.between(c.fetchedAt(), LocalDateTime.now()).getSeconds() < 30) return c;
        try {
            List<Row> countries = realtime("country", 10);
            List<Row> pages = realtime("unifiedScreenName", 10);
            List<Row> devices = realtime("deviceCategory", 5);
            double total = countries.stream().mapToDouble(r -> r.metrics().get(0)).sum();
            realtimeCache = new RealtimeSnapshot(true, null, total, countries, pages, devices, LocalDateTime.now());
            return realtimeCache;
        } catch (Exception e) {
            log.warn("Không lấy được GA4 realtime: {}", shorten(e.getMessage()));
            return new RealtimeSnapshot(true, "Không lấy được dữ liệu thời gian thực: " + shorten(e.getMessage()),
                    0, List.of(), List.of(), List.of(), LocalDateTime.now());
        }
    }

    private List<Row> realtime(String dimension, int limit) {
        Map<String, Object> body = Map.of(
                "dimensions", List.of(Map.of("name", dimension)),
                "metrics", List.of(Map.of("name", "activeUsers")),
                "limit", String.valueOf(limit));
        JsonNode resp = post("https://analyticsdata.googleapis.com/v1beta/properties/" + propertyId + ":runRealtimeReport", body);
        return parse(resp);
    }

    private void runGroup(Map<String, List<Row>> out, List<String> names, List<Map<String, Object>> requests) {
        try {
            JsonNode resp = post("https://analyticsdata.googleapis.com/v1beta/properties/" + propertyId + ":batchRunReports",
                    Map.of("requests", requests));
            for (int i = 0; i < names.size(); i++) {
                out.put(names.get(i), parse(resp.path("reports").get(i)));
            }
        } catch (Exception e) {
            log.warn("Nhóm báo cáo GA4 {} bị bỏ qua: {}", names, shorten(e.getMessage()));
            names.forEach(n -> out.put(n, List.of()));
        }
    }

    /** Gộp các dòng nguồn truy cập theo nền tảng MXH (Facebook, TikTok, Zalo...). */
    private List<SocialRow> socialFrom(List<Row> sources) {
        Map<String, double[]> acc = new LinkedHashMap<>();
        for (Row r : sources) {
            String src = r.dims().get(0).toLowerCase();
            for (Map.Entry<String, String> e : SOCIAL_KEYWORDS.entrySet()) {
                if (src.matches(".*(" + e.getValue().replace(".", "\\.") + ").*")) {
                    double[] a = acc.computeIfAbsent(e.getKey(), k -> new double[3]);
                    a[0] += r.metrics().get(0);
                    a[1] += r.metrics().get(1);
                    a[2] += r.metrics().get(2);
                    break;
                }
            }
        }
        List<SocialRow> out = new ArrayList<>();
        acc.forEach((k, a) -> out.add(new SocialRow(k, a[0], a[1], a[2])));
        out.sort((x, y) -> Double.compare(y.sessions(), x.sessions()));
        return out;
    }

    private Map<String, Object> report(String start, List<String> dims, List<String> metrics, int limit,
                                       String orderMetric, List<String> eventFilter) {
        return report(start, "today", dims, metrics, limit, orderMetric, eventFilter);
    }

    private Map<String, Object> report(String start, String end, List<String> dims, List<String> metrics, int limit,
                                       String orderMetric, List<String> eventFilter) {
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("dateRanges", List.of(Map.of("startDate", start, "endDate", end)));
        r.put("dimensions", dims.stream().map(n -> Map.of("name", n)).toList());
        r.put("metrics", metrics.stream().map(n -> Map.of("name", n)).toList());
        r.put("limit", String.valueOf(limit));
        if (orderMetric != null) {
            r.put("orderBys", List.of(Map.of("metric", Map.of("metricName", orderMetric), "desc", true)));
        }
        if (eventFilter != null) {
            r.put("dimensionFilter", Map.of("filter", Map.of("fieldName", "eventName",
                    "inListFilter", Map.of("values", eventFilter))));
        }
        return r;
    }

    private List<Row> parse(JsonNode report) {
        List<Row> rows = new ArrayList<>();
        if (report == null) return rows;
        for (JsonNode row : report.path("rows")) {
            List<String> dims = new ArrayList<>();
            row.path("dimensionValues").forEach(n -> dims.add(n.path("value").asText("")));
            List<Double> metrics = new ArrayList<>();
            row.path("metricValues").forEach(n -> metrics.add(n.path("value").asDouble(0)));
            rows.add(new Row(dims, metrics));
        }
        return rows;
    }

    private JsonNode post(String url, Object body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(token());
        return restTemplate.postForObject(url, new HttpEntity<>(body, headers), JsonNode.class);
    }

    /** Lấy access token OAuth2 bằng service account (cache tới lúc gần hết hạn). */
    private String token() {
        if (accessToken != null && Instant.now().isBefore(tokenExpiry.minusSeconds(60))) return accessToken;
        try {
            String raw = serviceAccountJson.startsWith("{") ? serviceAccountJson
                    : new String(Base64.getDecoder().decode(serviceAccountJson), StandardCharsets.UTF_8);
            JsonNode sa = mapper.readTree(raw);
            String pem = sa.path("private_key").asText()
                    .replace("-----BEGIN PRIVATE KEY-----", "")
                    .replace("-----END PRIVATE KEY-----", "")
                    .replaceAll("\\s", "");
            PrivateKey key = KeyFactory.getInstance("RSA")
                    .generatePrivate(new PKCS8EncodedKeySpec(Base64.getDecoder().decode(pem)));
            Instant now = Instant.now();
            String assertion = Jwts.builder()
                    .issuer(sa.path("client_email").asText())
                    .claim("scope", SCOPE)
                    .claim("aud", TOKEN_URL)
                    .issuedAt(Date.from(now))
                    .expiration(Date.from(now.plusSeconds(3600)))
                    .signWith(key, Jwts.SIG.RS256)
                    .compact();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
            MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
            form.add("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer");
            form.add("assertion", assertion);
            JsonNode resp = restTemplate.postForObject(TOKEN_URL, new HttpEntity<>(form, headers), JsonNode.class);
            accessToken = resp.path("access_token").asText();
            tokenExpiry = now.plusSeconds(resp.path("expires_in").asLong(3600));
            return accessToken;
        } catch (Exception e) {
            throw new IllegalStateException("Không lấy được access token Google: " + e.getMessage(), e);
        }
    }

    private GaSnapshot empty(int days, boolean configured, String error) {
        return new GaSnapshot(configured, error, days, Map.of(), List.of(), List.of(), List.of(), List.of(), List.of(),
                Map.of(), LocalDateTime.now());
    }

    private static String shorten(String s) {
        if (s == null) return "lỗi không rõ";
        return s.length() > 300 ? s.substring(0, 300) + "…" : s;
    }
}
