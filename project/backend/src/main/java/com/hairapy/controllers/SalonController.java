package com.hairapy.controllers;

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
 * Controller cung cấp danh sách salon đối tác cho SalonsPage.
 * Không yêu cầu đăng nhập — salon là dữ liệu công khai (khác HairstyleCatalog).
 */
@RestController
@RequestMapping("/api/salons")
@RequiredArgsConstructor
public class SalonController {

    private final SalonRepository salonRepository;

    /**
     * Lấy danh sách salon với bộ lọc tùy chọn.
     *
     * @param district    lọc theo quận/huyện (tùy chọn, khớp chính xác không phân biệt hoa thường).
     * @param serviceType lọc theo loại dịch vụ (tùy chọn, salon có chứa dịch vụ này trong danh sách).
     * @param minPrice    giá khởi điểm tối thiểu (tùy chọn).
     * @param maxPrice    giá khởi điểm tối đa (tùy chọn).
     * @param search      tìm theo tên salon (tùy chọn).
     * @return danh sách salon phù hợp, verified lên trước, rating giảm dần.
     */
    @GetMapping
    public ResponseEntity<List<Salon>> getSalons(
            @RequestParam(required = false) String district,
            @RequestParam(required = false) String serviceType,
            @RequestParam(required = false) Integer minPrice,
            @RequestParam(required = false) Integer maxPrice,
            @RequestParam(required = false) String search
    ) {
        List<Salon> all = salonRepository.findAllByOrderByVerifiedDescRatingDesc();

        List<Salon> result = all.stream()
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
                .toList();

        return ResponseEntity.ok(result);
    }
}
