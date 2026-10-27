package com.hairapy.controllers;

import com.hairapy.dto.salon.SalonPublicResponse;
import com.hairapy.models.Salon;
import com.hairapy.repositories.SalonRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

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
            @RequestParam(required = false) String search
    ) {
        List<Salon> all = salonRepository.findAllByOrderByVerifiedDescRatingDesc();

        List<SalonPublicResponse> result = all.stream()
                .filter(s -> s.isActive())
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
                .map(s -> toPublicResponse(s, null, null))
                .toList();

        return ResponseEntity.ok(result);
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
}
