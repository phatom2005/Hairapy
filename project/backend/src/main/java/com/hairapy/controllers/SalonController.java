package com.hairapy.controllers;

import com.hairapy.dto.salon.SalonDetailResponse;
import com.hairapy.dto.salon.SalonHairstyleItem;
import com.hairapy.dto.salon.SalonPublicResponse;
import com.hairapy.models.HairstyleCatalog;
import com.hairapy.models.Salon;
import com.hairapy.models.SalonHairstyle;
import com.hairapy.repositories.HairstyleCatalogRepository;
import com.hairapy.repositories.SalonHairstyleRepository;
import com.hairapy.repositories.SalonRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * Controller cung cấp danh sách salon đối tác cho SalonsPage và mobile app.
 * Không yêu cầu đăng nhập — salon là dữ liệu công khai.
 * Trả về DTO SalonPublicResponse thay vì entity để tránh lazy load owner.
 */
@RestController
@RequestMapping("/api/salons")
@RequiredArgsConstructor
public class SalonController {

    private final SalonRepository salonRepository;
    private final SalonHairstyleRepository salonHairstyleRepository;
    private final HairstyleCatalogRepository hairstyleCatalogRepository;

    /**
     * Lấy danh sách salon với bộ lọc tùy chọn.
     * Response là List<SalonPublicResponse> (mảng JSON) giữ tương thích mobile app.
     */
    @GetMapping
    public ResponseEntity<List<SalonPublicResponse>> getSalons(
            @RequestParam(required = false) String district,
            @RequestParam(required = false) String serviceType,
            @RequestParam(required = false) Integer minPrice,
            @RequestParam(required = false) Integer maxPrice,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long hairstyleId,
            @RequestParam(required = false, defaultValue = "false") Boolean partnerOnly,
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lng
    ) {
        List<Salon> all = salonRepository.findAll();

        // Nếu có lọc theo hairstyleId: lấy danh sách salon_hairstyles tương ứng
        Map<Long, Integer> stylePriceMap = new HashMap<>();
        if (hairstyleId != null) {
            List<SalonHairstyle> mappings = salonHairstyleRepository.findByHairstyleId(hairstyleId);
            for (SalonHairstyle sh : mappings) {
                stylePriceMap.put(sh.getSalon().getId(), sh.getPrice());
            }
        }

        List<SalonPublicResponse> filtered = all.stream()
                .filter(Salon::isActive)
                .filter(s -> !Boolean.TRUE.equals(partnerOnly) || s.isPartnerActive())
                .filter(s -> hairstyleId == null || stylePriceMap.containsKey(s.getId()))
                .filter(s -> district == null || district.isBlank()
                        || district.trim().equalsIgnoreCase(s.getDistrict()))
                .filter(s -> {
                    if (serviceType == null || serviceType.isBlank()) return true;
                    String stored = s.getServiceTypes();
                    if (stored == null || stored.isBlank()) return false;
                    for (String part : stored.split(",")) {
                        if (part.trim().equalsIgnoreCase(serviceType.trim())) return true;
                    }
                    return false;
                })
                .filter(s -> minPrice == null || s.getPriceFrom() >= minPrice)
                .filter(s -> maxPrice == null || s.getPriceFrom() <= maxPrice)
                .filter(s -> search == null || search.isBlank()
                        || s.getName().toLowerCase().contains(search.toLowerCase()))
                .map(s -> {
                    Integer sp = null;
                    if (hairstyleId != null) {
                        sp = stylePriceMap.get(s.getId());
                        if (sp == null) {
                            sp = s.getPriceFrom();
                        }
                    }
                    Double dist = calculateHaversineKm(lat, lng, s.getLatitude(), s.getLongitude());
                    return toPublicResponse(s, sp, dist);
                })
                .sorted((a, b) -> {
                    // Nếu có toạ độ người dùng -> ưu tiên khoảng cách gần nhất
                    if (lat != null && lng != null) {
                        if (a.distanceKm() == null && b.distanceKm() == null) return 0;
                        if (a.distanceKm() == null) return 1;
                        if (b.distanceKm() == null) return -1;
                        return Double.compare(a.distanceKm(), b.distanceKm());
                    }
                    // Sort mặc định: đối tác còn hạn -> verified -> rating desc -> id
                    if (a.partner() != b.partner()) {
                        return a.partner() ? -1 : 1;
                    }
                    if (a.verified() != b.verified()) {
                        return a.verified() ? -1 : 1;
                    }
                    int ratingCompare = Double.compare(b.rating() != null ? b.rating() : 0.0,
                            a.rating() != null ? a.rating() : 0.0);
                    if (ratingCompare != 0) return ratingCompare;
                    return Long.compare(a.id(), b.id());
                })
                .toList();

        return ResponseEntity.ok(filtered);
    }

    /**
     * Lấy chi tiết salon và danh sách kiểu tóc salon nhận làm. Tự động tăng view_count.
     */
    @GetMapping("/{id}")
    @Transactional
    public ResponseEntity<?> getSalonDetail(@PathVariable Long id) {
        salonRepository.incrementViewCount(id);

        Optional<Salon> salonOpt = salonRepository.findById(id);
        if (salonOpt.isEmpty() || !salonOpt.get().isActive()) {
            return ResponseEntity.notFound().build();
        }

        Salon s = salonOpt.get();
        List<SalonHairstyle> salonHairstyles = salonHairstyleRepository.findBySalonId(id);

        List<SalonHairstyleItem> hairstyleItems = salonHairstyles.stream()
                .map(sh -> {
                    HairstyleCatalog h = sh.getHairstyle();
                    int price = sh.getPrice() != null ? sh.getPrice() : (s.getPriceFrom() != null ? s.getPriceFrom() : 0);
                    return new SalonHairstyleItem(h.getId(), h.getName(), h.getImageUrl(), price);
                })
                .toList();

        SalonDetailResponse response = new SalonDetailResponse(
                s.getId(),
                s.getName(),
                s.getAddress(),
                s.getDistrict(),
                s.getServiceTypes(),
                s.getPriceFrom(),
                s.getRating(),
                s.isVerified(),
                s.getImageUrl(),
                s.getPhone(),
                s.getLatitude(),
                s.getLongitude(),
                s.getDescription(),
                s.isPartnerActive(),
                s.getViewCount() + 1, // phản ánh lượt xem vừa tăng
                hairstyleItems
        );

        return ResponseEntity.ok(response);
    }

    public static SalonPublicResponse toPublicResponse(Salon s, Integer stylePrice, Double distanceKm) {
        return new SalonPublicResponse(
                s.getId(),
                s.getName(),
                s.getAddress(),
                s.getDistrict(),
                s.getServiceTypes(),
                s.getPriceFrom(),
                s.getRating(),
                s.isVerified(),
                s.getImageUrl(),
                s.getPhone(),
                s.getLatitude(),
                s.getLongitude(),
                s.getDescription(),
                s.isPartnerActive(),
                stylePrice,
                distanceKm
        );
    }

    public static Double calculateHaversineKm(Double lat1, Double lon1, Double lat2, Double lon2) {
        if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
            return null;
        }
        final int R = 6371; // Bán kính trái đất (km)
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        double distance = R * c;
        return Math.round(distance * 10.0) / 10.0;
    }
}
