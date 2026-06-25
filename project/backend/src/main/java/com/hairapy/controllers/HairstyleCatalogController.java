package com.hairapy.controllers;

import com.hairapy.models.HairstyleCatalog;
import com.hairapy.models.User;
import com.hairapy.repositories.HairstyleCatalogRepository;
import com.hairapy.services.SubscriptionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Controller cung cấp danh sách kiểu tóc cho người dùng đã đăng nhập.
 * Áp dụng bộ lọc premiumOnly theo gói dịch vụ của người dùng.
 */
@RestController
@RequestMapping("/api/hairstyles")
@RequiredArgsConstructor
public class HairstyleCatalogController {

    private final HairstyleCatalogRepository hairstyleCatalogRepository;
    private final SubscriptionService subscriptionService;

    /**
     * Lấy danh sách kiểu tóc với bộ lọc tùy chọn.
     * - Người dùng Free: chỉ thấy kiểu tóc có premiumOnly=false.
     * - Người dùng Premium/Admin: thấy toàn bộ danh mục.
     *
     * @param faceShape  lọc theo hình dạng khuôn mặt (tùy chọn).
     * @param hairLength lọc theo độ dài tóc (tùy chọn).
     * @param tag        lọc theo tag (tùy chọn).
     * @param search     tìm kiếm theo tên (tùy chọn).
     * @param gender     lọc theo giới tính: "Nam", "Nữ" (tùy chọn, bao gồm cả Unisex).
     * @param userDetails thông tin người dùng đang đăng nhập từ JWT.
     * @return danh sách kiểu tóc phù hợp.
     */
    @GetMapping
    public ResponseEntity<List<HairstyleCatalog>> getHairstyles(
            @RequestParam(required = false) String faceShape,
            @RequestParam(required = false) String hairLength,
            @RequestParam(required = false) String tag,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String gender,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        // ADMIN/TESTER: xem toàn bộ catalog (bao gồm premiumOnly)
        // Người dùng Premium: xem toàn bộ, Free: chỉ xem premiumOnly=false
        final boolean showAll;
        if (userDetails instanceof User user) {
            showAll = user.getRole() == com.hairapy.models.Role.ADMIN
                    || user.getRole() == com.hairapy.models.Role.TESTER
                    || subscriptionService.isPaidUser(user.getId());
        } else {
            showAll = false;
        }

        // Lấy toàn bộ catalog (có thể mở rộng thêm Specification sau này nếu cần lọc phức tạp)
        List<HairstyleCatalog> all = hairstyleCatalogRepository.findAll();

        // Lọc theo quyền hạn và các tiêu chí tìm kiếm
        List<HairstyleCatalog> result = all.stream()
                .filter(h -> showAll || !h.isPremiumOnly())
                .filter(h -> faceShape == null || faceShape.isBlank() || faceShape.equalsIgnoreCase(h.getFaceShape()))
                .filter(h -> hairLength == null || hairLength.isBlank() || hairLength.equalsIgnoreCase(h.getHairLength()))
                .filter(h -> tag == null || tag.isBlank() || tag.equalsIgnoreCase(h.getTag()))
                .filter(h -> search == null || search.isBlank()
                        || h.getName().toLowerCase().contains(search.toLowerCase()))
                // Lọc theo giới tính: hiển thị kiểu tóc đúng giới tính + Unisex
                .filter(h -> gender == null || gender.isBlank()
                        || "Unisex".equalsIgnoreCase(h.getGender())
                        || gender.equalsIgnoreCase(h.getGender()))
                .toList();

        return ResponseEntity.ok(result);
    }
}
