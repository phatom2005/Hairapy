package com.hairapy.services;

import com.hairapy.dto.insight.FaceShapeStyleResponse;
import com.hairapy.dto.insight.TrendingStyleResponse;
import com.hairapy.models.HairstyleCatalog;
import com.hairapy.models.ScanHistory;
import com.hairapy.repositories.HairstyleCatalogRepository;
import com.hairapy.repositories.SavedHairstyleRepository;
import com.hairapy.repositories.ScanHistoryRepository;
import com.hairapy.repositories.UsageHistoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Service tính toán xu hướng kiểu tóc:
 * - "Đang hot tuần này": tính theo điểm (view=1, save=2, swap=3) 7 ngày qua so với 7 ngày trước đó.
 * - "Người có dáng mặt X hay thử nhất": top kiểu tóc được thử nhiều nhất bởi người có cùng dáng mặt trong 30 ngày.
 * - "Xu hướng theo thành phố": dùng cho portal salon đối tác.
 *
 * Ưu tiên lấy từ Google Analytics 4 (Data API), tự động fallback về Database khi GA chưa cấu hình hoặc lỗi.
 * Cache trong bộ nhớ, làm mới định kỳ mỗi 1 giờ hoặc on-demand (lazy load).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TrendService {

    private static final int MIN_TRENDING_ACTIONS = 5;
    private static final Duration CACHE_TTL = Duration.ofHours(1);

    private static final Map<String, Set<String>> SHAPE_SYNONYMS = Map.of(
            "oval", Set.of("oval", "trai xoan", "trái xoan"),
            "round", Set.of("round", "tron", "tròn"),
            "square", Set.of("square", "vuong", "vuông"),
            "heart", Set.of("heart", "trai tim", "trái tim"),
            "oblong", Set.of("oblong", "dai", "dài"),
            "diamond", Set.of("diamond", "kim cuong", "kim cương")
    );

    private final GaReportService gaReportService;
    private final HairstyleCatalogRepository hairstyleCatalogRepository;
    private final UsageHistoryRepository usageHistoryRepository;
    private final SavedHairstyleRepository savedHairstyleRepository;
    private final ScanHistoryRepository scanHistoryRepository;

    private volatile List<TrendingStyleResponse> cachedTrending = null;
    private final Map<String, List<FaceShapeStyleResponse>> cachedFaceShapes = new ConcurrentHashMap<>();
    private final Map<String, List<TrendingStyleResponse>> cachedCityTrends = new ConcurrentHashMap<>();
    private volatile LocalDateTime lastRefreshed = null;

    /**
     * Lấy danh sách kiểu tóc đang hot (7 ngày).
     */
    public List<TrendingStyleResponse> getTrending(String gender, int limit) {
        ensureCacheValid();
        List<TrendingStyleResponse> list = cachedTrending != null ? cachedTrending : List.of();
        if (gender != null && !gender.isBlank()) {
            String g = gender.trim();
            // Lọc theo giới tính từ HairstyleCatalog
            Map<Long, HairstyleCatalog> catalogMap = loadCatalogMap();
            list = list.stream().filter(item -> {
                HairstyleCatalog cat = catalogMap.get(item.hairstyleId());
                if (cat == null) return false;
                return cat.getGender().equalsIgnoreCase(g) || "Unisex".equalsIgnoreCase(cat.getGender());
            }).toList();
        }
        int effectiveLimit = Math.max(1, Math.min(limit, 50));
        return list.stream().limit(effectiveLimit).toList();
    }

    /**
     * Lấy danh sách kiểu tóc người có cùng dáng mặt hay thử nhất (30 ngày).
     */
    public List<FaceShapeStyleResponse> getFaceShapeStyles(String shape) {
        if (shape == null || shape.isBlank()) return List.of();
        String normalizedShape = shape.trim().toLowerCase();
        ensureCacheValid();
        return cachedFaceShapes.computeIfAbsent(normalizedShape, this::computeFaceShapeStyles);
    }

    /**
     * Lấy top kiểu tóc theo thành phố (30 ngày) - dùng cho salon đối tác.
     */
    public List<TrendingStyleResponse> getTopStylesByCity(String city, int limit) {
        String c = (city == null || city.isBlank()) ? "Ho Chi Minh City" : city.trim();
        ensureCacheValid();
        List<TrendingStyleResponse> list = cachedCityTrends.computeIfAbsent(c, this::computeCityTrends);
        int effectiveLimit = Math.max(1, Math.min(limit, 50));
        return list.stream().limit(effectiveLimit).toList();
    }

    /**
     * Làm mới cache mỗi 1 giờ.
     */
    @Scheduled(fixedRate = 3600000, initialDelay = 3600000)
    public synchronized void refreshTrends() {
        log.info("Bắt đầu làm mới cache xu hướng kiểu tóc...");
        try {
            cachedTrending = computeTrendingStyles();
            cachedFaceShapes.clear();
            cachedCityTrends.clear();
            lastRefreshed = LocalDateTime.now();
            log.info("Làm mới cache xu hướng thành công: {} kiểu đang hot", cachedTrending.size());
        } catch (Exception e) {
            log.warn("Lỗi khi làm mới cache xu hướng: {}", e.getMessage());
        }
    }

    private void ensureCacheValid() {
        if (cachedTrending == null || lastRefreshed == null
                || Duration.between(lastRefreshed, LocalDateTime.now()).compareTo(CACHE_TTL) > 0) {
            synchronized (this) {
                if (cachedTrending == null || lastRefreshed == null
                        || Duration.between(lastRefreshed, LocalDateTime.now()).compareTo(CACHE_TTL) > 0) {
                    refreshTrends();
                }
            }
        }
    }

    /* =========================================================================
     * 1. TÍNH TOÁN "ĐANG HOT" (7 NGÀY)
     * ========================================================================= */

    private List<TrendingStyleResponse> computeTrendingStyles() {
        LocalDateTime now = LocalDateTime.now();
        Map<Long, HairstyleCatalog> catalogMap = loadCatalogMap();

        if (gaReportService.isConfigured()) {
            try {
                List<TrendingStyleResponse> gaResult = computeTrendingFromGa(catalogMap, now);
                if (!gaResult.isEmpty()) {
                    return gaResult;
                }
            } catch (Exception e) {
                log.warn("Không tính được trending từ GA4 ({}), fallback sang DB", e.getMessage());
            }
        }

        return computeTrendingFromDb(catalogMap, now);
    }

    private List<TrendingStyleResponse> computeTrendingFromGa(Map<Long, HairstyleCatalog> catalogMap, LocalDateTime now) {
        // Query kỳ hiện tại (7 ngày qua)
        Map<String, Object> filter = Map.of(
                "andGroup", Map.of("expressions", List.of(
                        Map.of("filter", Map.of("fieldName", "country", "stringFilter", Map.of("value", "Vietnam", "matchType", "EXACT"))),
                        Map.of("filter", Map.of("fieldName", "eventName", "inListFilter", Map.of("values", List.of("view_hairstyle", "save_favorite", "hair_swap"))))
                ))
        );

        List<GaReportService.Row> currRows = gaReportService.runReport(
                "7daysAgo", "today",
                List.of("customEvent:hairstyle_id", "eventName"),
                List.of("eventCount"),
                100, "eventCount", filter);

        if (currRows.isEmpty()) {
            return List.of();
        }

        // Query kỳ trước (14 ngày trước đến 8 ngày trước)
        List<GaReportService.Row> prevRows = gaReportService.runReport(
                "14daysAgo", "8daysAgo",
                List.of("customEvent:hairstyle_id", "eventName"),
                List.of("eventCount"),
                100, "eventCount", filter);

        Map<Long, Double> currScores = new HashMap<>();
        Map<Long, Long> currActions = new HashMap<>();
        for (GaReportService.Row row : currRows) {
            Long hid = parseLong(row.dims().get(0));
            if (hid == null) continue;
            Long baseId = resolveBaseStyleId(hid, catalogMap);
            if (baseId == null) continue;

            String event = row.dims().get(1);
            double count = row.metrics().get(0);
            double multiplier = switch (event) {
                case "view_hairstyle" -> 1.0;
                case "save_favorite" -> 2.0;
                case "hair_swap" -> 3.0;
                default -> 1.0;
            };
            currScores.merge(baseId, count * multiplier, Double::sum);
            currActions.merge(baseId, (long) count, Long::sum);
        }

        Map<Long, Double> prevScores = new HashMap<>();
        for (GaReportService.Row row : prevRows) {
            Long hid = parseLong(row.dims().get(0));
            if (hid == null) continue;
            Long baseId = resolveBaseStyleId(hid, catalogMap);
            if (baseId == null) continue;

            String event = row.dims().get(1);
            double count = row.metrics().get(0);
            double multiplier = switch (event) {
                case "view_hairstyle" -> 1.0;
                case "save_favorite" -> 2.0;
                case "hair_swap" -> 3.0;
                default -> 1.0;
            };
            prevScores.merge(baseId, count * multiplier, Double::sum);
        }

        return buildTrendingList(currScores, prevScores, currActions, catalogMap, "ga", now);
    }

    private List<TrendingStyleResponse> computeTrendingFromDb(Map<Long, HairstyleCatalog> catalogMap, LocalDateTime now) {
        LocalDateTime currSince = now.minusDays(7);
        LocalDateTime prevSince = now.minusDays(14);

        // Kỳ hiện tại
        List<Object[]> currSwaps = usageHistoryRepository.countSwapsBetween(currSince, now);
        List<Object[]> currSaves = savedHairstyleRepository.countSavesBetween(currSince, now);

        // Kỳ trước
        List<Object[]> prevSwaps = usageHistoryRepository.countSwapsBetween(prevSince, currSince);
        List<Object[]> prevSaves = savedHairstyleRepository.countSavesBetween(prevSince, currSince);

        Map<Long, Double> currScores = new HashMap<>();
        Map<Long, Long> currActions = new HashMap<>();

        for (Object[] row : currSwaps) {
            Long hid = ((Number) row[0]).longValue();
            long count = ((Number) row[1]).longValue();
            Long baseId = resolveBaseStyleId(hid, catalogMap);
            if (baseId == null) continue;
            currScores.merge(baseId, count * 3.0, Double::sum);
            currActions.merge(baseId, count, Long::sum);
        }
        for (Object[] row : currSaves) {
            Long hid = ((Number) row[0]).longValue();
            long count = ((Number) row[1]).longValue();
            Long baseId = resolveBaseStyleId(hid, catalogMap);
            if (baseId == null) continue;
            currScores.merge(baseId, count * 2.0, Double::sum);
            currActions.merge(baseId, count, Long::sum);
        }

        Map<Long, Double> prevScores = new HashMap<>();
        for (Object[] row : prevSwaps) {
            Long hid = ((Number) row[0]).longValue();
            long count = ((Number) row[1]).longValue();
            Long baseId = resolveBaseStyleId(hid, catalogMap);
            if (baseId == null) continue;
            prevScores.merge(baseId, count * 3.0, Double::sum);
        }
        for (Object[] row : prevSaves) {
            Long hid = ((Number) row[0]).longValue();
            long count = ((Number) row[1]).longValue();
            Long baseId = resolveBaseStyleId(hid, catalogMap);
            if (baseId == null) continue;
            prevScores.merge(baseId, count * 2.0, Double::sum);
        }

        return buildTrendingList(currScores, prevScores, currActions, catalogMap, "db", now);
    }

    private List<TrendingStyleResponse> buildTrendingList(Map<Long, Double> currScores,
                                                          Map<Long, Double> prevScores,
                                                          Map<Long, Long> currActions,
                                                          Map<Long, HairstyleCatalog> catalogMap,
                                                          String source,
                                                          LocalDateTime now) {
        List<TrendingStyleResponse> result = new ArrayList<>();
        for (Map.Entry<Long, Double> entry : currScores.entrySet()) {
            Long baseId = entry.getKey();
            long actions = currActions.getOrDefault(baseId, 0L);
            if (actions < MIN_TRENDING_ACTIONS) {
                continue; // Loại nếu chưa đạt ngưỡng tối thiểu 5 lượt
            }
            HairstyleCatalog cat = catalogMap.get(baseId);
            if (cat == null || !cat.isActive()) {
                continue;
            }
            double score = Math.round(entry.getValue() * 10.0) / 10.0;
            double prev = prevScores.getOrDefault(baseId, 0.0);
            double growthPct = prev == 0.0
                    ? (score > 0 ? 100.0 : 0.0)
                    : Math.round(((score - prev) / prev) * 1000.0) / 10.0;

            result.add(new TrendingStyleResponse(
                    baseId,
                    cat.getName(),
                    cat.getImageUrl(),
                    growthPct,
                    score,
                    source,
                    now
            ));
        }

        result.sort((a, b) -> Double.compare(b.score(), a.score()));
        return result;
    }

    /* =========================================================================
     * 2. TÍNH TOÁN "THEO DÁNG MẶT" (30 NGÀY)
     * ========================================================================= */

    private List<FaceShapeStyleResponse> computeFaceShapeStyles(String shape) {
        LocalDateTime now = LocalDateTime.now();
        Map<Long, HairstyleCatalog> catalogMap = loadCatalogMap();

        if (gaReportService.isConfigured()) {
            try {
                List<FaceShapeStyleResponse> gaResult = computeFaceShapeFromGa(shape, catalogMap, now);
                if (!gaResult.isEmpty()) return gaResult;
            } catch (Exception e) {
                log.warn("Không lấy được face shape styles từ GA4: {}", e.getMessage());
            }
        }

        return computeFaceShapeFromDb(shape, catalogMap, now);
    }

    private List<FaceShapeStyleResponse> computeFaceShapeFromGa(String shape, Map<Long, HairstyleCatalog> catalogMap, LocalDateTime now) {
        Map<String, Object> filter = Map.of(
                "filter", Map.of("fieldName", "eventName", "stringFilter", Map.of("value", "hair_swap", "matchType", "EXACT"))
        );

        List<GaReportService.Row> rows = gaReportService.runReport(
                "30daysAgo", "today",
                List.of("customUser:face_shape", "customEvent:hairstyle_id"),
                List.of("eventCount"),
                200, "eventCount", filter);

        if (rows.isEmpty()) return List.of();

        Map<Long, Long> triesMap = new HashMap<>();
        for (GaReportService.Row row : rows) {
            String userFaceShape = row.dims().get(0);
            if (!isMatchingShape(shape, userFaceShape)) continue;

            Long hid = parseLong(row.dims().get(1));
            if (hid == null) continue;
            Long baseId = resolveBaseStyleId(hid, catalogMap);
            if (baseId == null) continue;

            long count = Math.round(row.metrics().get(0));
            triesMap.merge(baseId, count, Long::sum);
        }

        return buildFaceShapeList(triesMap, catalogMap, "ga", now);
    }

    private List<FaceShapeStyleResponse> computeFaceShapeFromDb(String shape, Map<Long, HairstyleCatalog> catalogMap, LocalDateTime now) {
        LocalDateTime since = now.minusDays(30);

        // Lấy tất cả lượt quét sắp xếp mới nhất trước
        List<ScanHistory> scans = scanHistoryRepository.findAllByOrderByCreatedAtDesc();
        // Lấy dáng mặt quét gần nhất của mỗi user
        Map<Long, String> latestUserShape = new HashMap<>();
        for (ScanHistory s : scans) {
            if (s.getUser() != null && s.getUser().getId() != null) {
                latestUserShape.putIfAbsent(s.getUser().getId(), s.getFaceShape());
            }
        }

        // Tìm danh sách userId có dáng mặt phù hợp
        List<Long> matchedUserIds = latestUserShape.entrySet().stream()
                .filter(e -> isMatchingShape(shape, e.getValue()))
                .map(Map.Entry::getKey)
                .toList();

        if (matchedUserIds.isEmpty()) {
            return List.of();
        }

        List<Object[]> swaps = usageHistoryRepository.countSwapsByUserIdsSince(matchedUserIds, since);
        Map<Long, Long> triesMap = new HashMap<>();
        for (Object[] row : swaps) {
            Long hid = ((Number) row[0]).longValue();
            long count = ((Number) row[1]).longValue();
            Long baseId = resolveBaseStyleId(hid, catalogMap);
            if (baseId == null) continue;
            triesMap.merge(baseId, count, Long::sum);
        }

        return buildFaceShapeList(triesMap, catalogMap, "db", now);
    }

    private List<FaceShapeStyleResponse> buildFaceShapeList(Map<Long, Long> triesMap,
                                                            Map<Long, HairstyleCatalog> catalogMap,
                                                            String source,
                                                            LocalDateTime now) {
        List<FaceShapeStyleResponse> list = new ArrayList<>();
        for (Map.Entry<Long, Long> entry : triesMap.entrySet()) {
            Long baseId = entry.getKey();
            HairstyleCatalog cat = catalogMap.get(baseId);
            if (cat == null || !cat.isActive()) continue;

            list.add(new FaceShapeStyleResponse(
                    baseId,
                    cat.getName(),
                    cat.getImageUrl(),
                    entry.getValue(),
                    source,
                    now
            ));
        }

        list.sort((a, b) -> Long.compare(b.tries(), a.tries()));
        return list.stream().limit(6).toList();
    }

    /* =========================================================================
     * 3. TÍNH TOÁN "THEO THÀNH PHỐ" (DÙNG CHO 5.4 SALON OWNER)
     * ========================================================================= */

    private List<TrendingStyleResponse> computeCityTrends(String city) {
        LocalDateTime now = LocalDateTime.now();
        Map<Long, HairstyleCatalog> catalogMap = loadCatalogMap();

        if (gaReportService.isConfigured()) {
            try {
                Map<String, Object> filter = Map.of(
                        "andGroup", Map.of("expressions", List.of(
                                Map.of("filter", Map.of("fieldName", "city", "stringFilter", Map.of("value", city, "matchType", "EXACT"))),
                                Map.of("filter", Map.of("fieldName", "eventName", "stringFilter", Map.of("value", "hair_swap", "matchType", "EXACT")))
                        ))
                );

                List<GaReportService.Row> rows = gaReportService.runReport(
                        "30daysAgo", "today",
                        List.of("customEvent:hairstyle_id"),
                        List.of("eventCount"),
                        50, "eventCount", filter);

                if (!rows.isEmpty()) {
                    Map<Long, Long> countMap = new HashMap<>();
                    for (GaReportService.Row row : rows) {
                        Long hid = parseLong(row.dims().get(0));
                        if (hid == null) continue;
                        Long baseId = resolveBaseStyleId(hid, catalogMap);
                        if (baseId == null) continue;
                        countMap.merge(baseId, Math.round(row.metrics().get(0)), Long::sum);
                    }

                    List<TrendingStyleResponse> list = new ArrayList<>();
                    for (Map.Entry<Long, Long> e : countMap.entrySet()) {
                        HairstyleCatalog cat = catalogMap.get(e.getKey());
                        if (cat == null || !cat.isActive()) continue;
                        list.add(new TrendingStyleResponse(
                                e.getKey(),
                                cat.getName(),
                                cat.getImageUrl(),
                                0.0,
                                e.getValue().doubleValue(),
                                "ga",
                                now
                        ));
                    }
                    list.sort((a, b) -> Double.compare(b.score(), a.score()));
                    return list.stream().limit(10).toList();
                }
            } catch (Exception e) {
                log.warn("Không lấy được xu hướng theo thành phố từ GA4: {}", e.getMessage());
            }
        }

        // Fallback DB: lấy top kiểu tóc thử nhiều nhất trong 30 ngày qua
        List<Object[]> topTried = usageHistoryRepository.topTriedSince(
                now.minusDays(30),
                org.springframework.data.domain.PageRequest.of(0, 30));

        Map<Long, Long> countMap = new HashMap<>();
        for (Object[] row : topTried) {
            Long hid = ((Number) row[0]).longValue();
            long count = ((Number) row[1]).longValue();
            Long baseId = resolveBaseStyleId(hid, catalogMap);
            if (baseId == null) continue;
            countMap.merge(baseId, count, Long::sum);
        }

        List<TrendingStyleResponse> list = new ArrayList<>();
        for (Map.Entry<Long, Long> e : countMap.entrySet()) {
            HairstyleCatalog cat = catalogMap.get(e.getKey());
            if (cat == null || !cat.isActive()) continue;
            list.add(new TrendingStyleResponse(
                    e.getKey(),
                    cat.getName(),
                    cat.getImageUrl(),
                    0.0,
                    e.getValue().doubleValue(),
                    "db",
                    now
            ));
        }
        list.sort((a, b) -> Double.compare(b.score(), a.score()));
        return list.stream().limit(10).toList();
    }

    /* =========================================================================
     * HELPER METHODS
     * ========================================================================= */

    private Map<Long, HairstyleCatalog> loadCatalogMap() {
        Map<Long, HairstyleCatalog> map = new HashMap<>();
        for (HairstyleCatalog h : hairstyleCatalogRepository.findAll()) {
            map.put(h.getId(), h);
        }
        return map;
    }

    private Long resolveBaseStyleId(Long hairstyleId, Map<Long, HairstyleCatalog> catalogMap) {
        HairstyleCatalog cat = catalogMap.get(hairstyleId);
        if (cat == null) return null;
        if (cat.getBaseStyleId() != null) {
            return cat.getBaseStyleId();
        }
        return cat.getId();
    }

    private boolean isMatchingShape(String targetShape, String userShape) {
        if (targetShape == null || userShape == null) return false;
        String t = targetShape.trim().toLowerCase();
        String u = userShape.trim().toLowerCase();
        if (t.equals(u)) return true;

        Set<String> synonyms = SHAPE_SYNONYMS.get(t);
        if (synonyms != null && synonyms.contains(u)) {
            return true;
        }

        // Thử tìm ngược lại nếu userShape là key
        Set<String> reverse = SHAPE_SYNONYMS.get(u);
        return reverse != null && reverse.contains(t);
    }

    private Long parseLong(String s) {
        if (s == null) return null;
        try {
            return Long.parseLong(s.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}

