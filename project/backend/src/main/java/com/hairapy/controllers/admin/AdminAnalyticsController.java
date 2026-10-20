package com.hairapy.controllers.admin;

import com.hairapy.models.HairstyleCatalog;
import com.hairapy.models.SubscriptionPlan;
import com.hairapy.repositories.HairstyleCatalogRepository;
import com.hairapy.repositories.PaymentRepository;
import com.hairapy.repositories.SavedHairstyleRepository;
import com.hairapy.repositories.SubscriptionRepository;
import com.hairapy.repositories.UsageHistoryRepository;
import com.hairapy.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

/**
 * API phân tích cho admin: (1) cơ cấu người dùng, (2) kiểu tóc được ưa chuộng.
 * Chỉ ADMIN truy cập được (SecurityConfig: /api/admin/** yêu cầu role ADMIN).
 */
@RestController
@RequestMapping("/api/admin/analytics")
@RequiredArgsConstructor
public class AdminAnalyticsController {

    private final UserRepository userRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final PaymentRepository paymentRepository;
    private final SavedHairstyleRepository savedHairstyleRepository;
    private final UsageHistoryRepository usageHistoryRepository;
    private final HairstyleCatalogRepository hairstyleCatalogRepository;

    public record NamedCount(String name, long count) {}

    public record UserAnalytics(
            long totalUsers,
            long freeUsers,
            long proUsers,
            long premiumUsers,
            List<NamedCount> byProvider,
            long payingUsersEver,
            double conversionRatePercent,
            long churnedLast30Days
    ) {}

    public record HairstyleStat(Long id, String name, String imageUrl, String tag, String faceShape,
                                String gender, boolean premiumOnly, long count) {}

    public record HairstyleAnalytics(
            List<HairstyleStat> topSaved,
            List<HairstyleStat> topTried,
            String triedTrackingSince // ISO date-time hoặc null nếu chưa có dữ liệu
    ) {}

    /** Một kiểu tóc trong bảng xếp hạng của 1 dáng mặt: số lượt lưu yêu thích + số lượt thử AI. */
    public record FaceShapeHairstyle(Long id, String name, String imageUrl, boolean premiumOnly,
                                     long saved, long tried) {}

    public record FaceShapeRanking(String faceShape, List<FaceShapeHairstyle> items) {}

    @GetMapping("/users")
    public ResponseEntity<UserAnalytics> userAnalytics() {
        LocalDateTime now = LocalDateTime.now();
        long total = userRepository.count();

        long pro = 0;
        long premium = 0;
        for (Object[] row : subscriptionRepository.countActiveByPlan(now)) {
            SubscriptionPlan plan = (SubscriptionPlan) row[0];
            long c = ((Number) row[1]).longValue();
            if (plan == SubscriptionPlan.PRO) pro += c;
            else if (plan == SubscriptionPlan.PREMIUM) premium += c;
        }
        long free = Math.max(0, total - pro - premium);

        List<NamedCount> byProvider = new ArrayList<>();
        for (Object[] row : userRepository.countByProvider()) {
            byProvider.add(new NamedCount(String.valueOf(row[0]), ((Number) row[1]).longValue()));
        }

        long paying = paymentRepository.countPayingUsers();
        double conversion = total == 0 ? 0 : Math.round(paying * 1000.0 / total) / 10.0;

        long churned = subscriptionRepository.countChurnedBetween(now.minusDays(30), now);

        return ResponseEntity.ok(new UserAnalytics(total, free, pro, premium, byProvider, paying, conversion, churned));
    }

    @GetMapping("/hairstyles")
    public ResponseEntity<HairstyleAnalytics> hairstyleAnalytics(
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(defaultValue = "30") int days) {
        int top = Math.min(Math.max(limit, 1), 50);
        LocalDateTime since = LocalDate.now().minusDays(Math.max(days, 1)).atStartOfDay();

        List<Object[]> savedRaw = savedHairstyleRepository.topSaved(PageRequest.of(0, top));
        List<Object[]> triedRaw = usageHistoryRepository.topTriedSince(since, PageRequest.of(0, top));

        // Gom id để tra thông tin kiểu tóc 1 lần
        Set<Long> ids = new HashSet<>();
        savedRaw.forEach(r -> ids.add(((Number) r[0]).longValue()));
        triedRaw.forEach(r -> ids.add(((Number) r[0]).longValue()));
        Map<Long, HairstyleCatalog> byId = new HashMap<>();
        hairstyleCatalogRepository.findAllById(ids).forEach(h -> byId.put(h.getId(), h));

        LocalDateTime first = usageHistoryRepository.firstTrackedAt();
        return ResponseEntity.ok(new HairstyleAnalytics(
                toStats(savedRaw, byId),
                toStats(triedRaw, byId),
                first != null ? first.toString() : null
        ));
    }

    /**
     * Top kiểu tóc theo từng dáng mặt. Dáng mặt lấy từ catalog (cột face_shape, có thể nhiều giá trị
     * ngăn bằng dấu phẩy); điểm xếp hạng = lượt lưu yêu thích (toàn thời gian) + lượt thử AI trong N ngày.
     * Kiểu tóc chưa có lượt nào thì không đưa vào bảng.
     */
    @GetMapping("/hairstyles-by-face-shape")
    public ResponseEntity<List<FaceShapeRanking>> hairstylesByFaceShape(
            @RequestParam(defaultValue = "5") int limit,
            @RequestParam(defaultValue = "30") int days) {
        int top = Math.min(Math.max(limit, 1), 20);
        LocalDateTime since = LocalDate.now().minusDays(Math.max(days, 1)).atStartOfDay();

        // Lấy số lượt của toàn bộ kiểu tóc (catalog nhỏ) rồi nhóm theo dáng mặt ở bộ nhớ
        PageRequest all = PageRequest.of(0, 1000);
        Map<Long, Long> savedById = toCountMap(savedHairstyleRepository.topSaved(all));
        Map<Long, Long> triedById = toCountMap(usageHistoryRepository.topTriedSince(since, all));

        Set<Long> ids = new HashSet<>(savedById.keySet());
        ids.addAll(triedById.keySet());
        Map<String, List<FaceShapeHairstyle>> byShape = new TreeMap<>();
        for (HairstyleCatalog h : hairstyleCatalogRepository.findAllById(ids)) {
            if (h.getFaceShape() == null) continue;
            FaceShapeHairstyle item = new FaceShapeHairstyle(h.getId(), h.getName(), h.getImageUrl(),
                    h.isPremiumOnly(), savedById.getOrDefault(h.getId(), 0L), triedById.getOrDefault(h.getId(), 0L));
            for (String shape : h.getFaceShape().split(",")) {
                String key = shape.trim();
                if (!key.isEmpty()) byShape.computeIfAbsent(key, k -> new ArrayList<>()).add(item);
            }
        }

        List<FaceShapeRanking> result = new ArrayList<>();
        byShape.forEach((shape, items) -> {
            items.sort(Comparator.comparingLong((FaceShapeHairstyle i) -> i.saved() + i.tried()).reversed()
                    .thenComparing(FaceShapeHairstyle::name, Comparator.nullsLast(Comparator.naturalOrder())));
            result.add(new FaceShapeRanking(shape, items.size() > top ? new ArrayList<>(items.subList(0, top)) : items));
        });
        return ResponseEntity.ok(result);
    }

    private Map<Long, Long> toCountMap(List<Object[]> raw) {
        Map<Long, Long> out = new HashMap<>();
        for (Object[] r : raw) out.put(((Number) r[0]).longValue(), ((Number) r[1]).longValue());
        return out;
    }

    private List<HairstyleStat> toStats(List<Object[]> raw, Map<Long, HairstyleCatalog> byId) {
        List<HairstyleStat> out = new ArrayList<>();
        for (Object[] r : raw) {
            long id = ((Number) r[0]).longValue();
            long count = ((Number) r[1]).longValue();
            HairstyleCatalog h = byId.get(id);
            if (h == null) continue; // kiểu tóc đã bị xoá khỏi catalog
            out.add(new HairstyleStat(h.getId(), h.getName(), h.getImageUrl(), h.getTag(),
                    h.getFaceShape(), h.getGender(), h.isPremiumOnly(), count));
        }
        return out;
    }
}
