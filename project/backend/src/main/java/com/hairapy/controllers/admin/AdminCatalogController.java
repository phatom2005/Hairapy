package com.hairapy.controllers.admin;

import com.hairapy.dto.admin.AdminCatalogItemResponse;
import com.hairapy.exceptions.ResourceNotFoundException;
import com.hairapy.models.HairstyleCatalog;
import com.hairapy.repositories.HairstyleCatalogRepository;
import com.hairapy.repositories.SavedHairstyleRepository;
import com.hairapy.services.CloudinaryService;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Controller quản trị CRUD cho danh mục kiểu tóc.
 * Hỗ trợ upload ảnh trực tiếp lên Cloudinary (không cần paste URL), ẩn kiểu tóc, đếm lượt lưu.
 */
@Slf4j
@RestController
@RequestMapping("/api/admin/catalog")
@RequiredArgsConstructor
public class AdminCatalogController {

    private final HairstyleCatalogRepository hairstyleCatalogRepository;
    private final SavedHairstyleRepository savedHairstyleRepository;
    private final CloudinaryService cloudinaryService;

    /**
     * Lấy danh sách kiểu tóc có phân trang + bộ lọc (tất cả tham số lọc đều tùy chọn).
     * Trả về kèm số lượng người dùng đã lưu (savedCount) và trạng thái active.
     */
    @GetMapping
    public ResponseEntity<Page<AdminCatalogItemResponse>> getCatalog(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String faceShape,
            @RequestParam(required = false) String hairLength,
            @RequestParam(required = false) String gender,
            @RequestParam(required = false) Boolean premiumOnly,
            Pageable pageable
    ) {
        Specification<HairstyleCatalog> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (keyword != null && !keyword.isBlank()) {
                String like = "%" + keyword.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("name")), like),
                        cb.like(cb.lower(cb.coalesce(root.<String>get("tag"), "")), like)
                ));
            }
            if (faceShape != null && !faceShape.isBlank()) {
                predicates.add(cb.like(root.get("faceShape"), "%" + faceShape.trim() + "%"));
            }
            if (hairLength != null && !hairLength.isBlank()) {
                predicates.add(cb.equal(root.get("hairLength"), hairLength.trim()));
            }
            if (gender != null && !gender.isBlank()) {
                predicates.add(cb.equal(root.get("gender"), gender.trim()));
            }
            if (premiumOnly != null) {
                predicates.add(cb.equal(root.get("premiumOnly"), premiumOnly));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        Page<HairstyleCatalog> page = hairstyleCatalogRepository.findAll(spec, pageable);
        return ResponseEntity.ok(page.map(this::toAdminResponse));
    }

    /**
     * Bật/tắt trạng thái hiển thị của kiểu tóc trong catalog (ẩn thay vì xoá).
     */
    @PatchMapping("/{id}/active")
    public ResponseEntity<AdminCatalogItemResponse> updateActive(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body
    ) {
        HairstyleCatalog hairstyle = hairstyleCatalogRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy kiểu tóc với ID: " + id));

        if (body.containsKey("active")) {
            boolean active = Boolean.parseBoolean(String.valueOf(body.get("active")));
            hairstyle.setActive(active);
            hairstyle = hairstyleCatalogRepository.save(hairstyle);
            log.info("Admin cập nhật trạng thái active cho kiểu tóc id={}: active={}", id, active);
        }

        return ResponseEntity.ok(toAdminResponse(hairstyle));
    }

    /**
     * Thêm mới kiểu tóc — nhận multipart form (ảnh file + metadata).
     */
    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<AdminCatalogItemResponse> createHairstyle(
            @RequestParam("name") String name,
            @RequestParam(value = "image", required = false) MultipartFile image,
            @RequestParam(value = "imageUrl", required = false) String imageUrl,
            @RequestParam(value = "tag", required = false) String tag,
            @RequestParam(value = "faceShape", required = false) String faceShape,
            @RequestParam(value = "hairLength", required = false) String hairLength,
            @RequestParam(value = "gender", required = false, defaultValue = "Unisex") String gender,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "premiumOnly", required = false, defaultValue = "false") boolean premiumOnly
    ) {
        String finalImageUrl;
        if (image != null && !image.isEmpty()) {
            finalImageUrl = cloudinaryService.uploadFile(image, "catalog");
            log.info("Admin upload ảnh catalog lên Cloudinary: {}", finalImageUrl);
        } else if (imageUrl != null && !imageUrl.isBlank()) {
            finalImageUrl = imageUrl;
        } else {
            return ResponseEntity.badRequest().build();
        }

        HairstyleCatalog hairstyle = HairstyleCatalog.builder()
                .name(name)
                .tag(tag)
                .faceShape(faceShape)
                .hairLength(hairLength)
                .gender(gender)
                .description(description)
                .imageUrl(finalImageUrl)
                .premiumOnly(premiumOnly)
                .active(true)
                .build();

        HairstyleCatalog saved = hairstyleCatalogRepository.save(hairstyle);
        return new ResponseEntity<>(toAdminResponse(saved), HttpStatus.CREATED);
    }

    /**
     * Cập nhật kiểu tóc — nhận multipart form (ảnh mới tùy chọn).
     */
    @PutMapping(value = "/{id}", consumes = "multipart/form-data")
    public ResponseEntity<AdminCatalogItemResponse> updateHairstyle(
            @PathVariable Long id,
            @RequestParam(value = "name", required = false) String name,
            @RequestParam(value = "image", required = false) MultipartFile image,
            @RequestParam(value = "imageUrl", required = false) String imageUrl,
            @RequestParam(value = "tag", required = false) String tag,
            @RequestParam(value = "faceShape", required = false) String faceShape,
            @RequestParam(value = "hairLength", required = false) String hairLength,
            @RequestParam(value = "gender", required = false) String gender,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "premiumOnly", required = false) Boolean premiumOnly
    ) {
        HairstyleCatalog hairstyle = hairstyleCatalogRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy kiểu tóc với ID: " + id));

        if (name != null) hairstyle.setName(name);
        if (tag != null) hairstyle.setTag(tag);
        if (faceShape != null) hairstyle.setFaceShape(faceShape);
        if (hairLength != null) hairstyle.setHairLength(hairLength);
        if (gender != null) hairstyle.setGender(gender);
        if (description != null) hairstyle.setDescription(description);
        if (premiumOnly != null) hairstyle.setPremiumOnly(premiumOnly);

        String oldImageUrl = hairstyle.getImageUrl();
        String newUrl = null;
        if (image != null && !image.isEmpty()) {
            newUrl = cloudinaryService.uploadFile(image, "catalog");
            hairstyle.setImageUrl(newUrl);
            log.info("Admin cập nhật ảnh catalog: id={}, newUrl={}", id, newUrl);
        } else if (imageUrl != null && !imageUrl.isBlank()) {
            newUrl = imageUrl;
            hairstyle.setImageUrl(imageUrl);
        }

        // Xoá ảnh cũ nếu đổi ảnh và ảnh cũ thuộc folder catalog
        if (newUrl != null && !newUrl.equals(oldImageUrl)) {
            String oldPublicId = cloudinaryService.extractPublicId(oldImageUrl);
            if (oldPublicId != null && oldPublicId.contains("catalog")) {
                try {
                    cloudinaryService.delete(oldPublicId);
                } catch (Exception e) {
                    log.warn("Không thể xoá ảnh catalog cũ trên Cloudinary: {}", e.getMessage());
                }
            }
        }

        HairstyleCatalog updated = hairstyleCatalogRepository.save(hairstyle);
        return ResponseEntity.ok(toAdminResponse(updated));
    }

    /**
     * Xóa kiểu tóc khỏi hệ thống. Chặn xoá nếu có khách lưu yêu thích (yêu cầu ẩn thay vì xoá).
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteHairstyle(@PathVariable Long id) {
        HairstyleCatalog hairstyle = hairstyleCatalogRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy kiểu tóc với ID: " + id));

        long savedCount = savedHairstyleRepository.countByHairstyleId(id);
        if (savedCount > 0) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                    "error", "Có " + savedCount + " người đang lưu kiểu này. Hãy ẩn thay vì xoá.",
                    "savedCount", savedCount
            ));
        }

        String oldImageUrl = hairstyle.getImageUrl();
        hairstyleCatalogRepository.delete(hairstyle);

        String publicId = cloudinaryService.extractPublicId(oldImageUrl);
        if (publicId != null && publicId.contains("catalog")) {
            try {
                cloudinaryService.delete(publicId);
            } catch (Exception e) {
                log.warn("Không thể xóa ảnh catalog trên Cloudinary: {}", e.getMessage());
            }
        }

        return ResponseEntity.noContent().build();
    }

    private AdminCatalogItemResponse toAdminResponse(HairstyleCatalog h) {
        long savedCount = savedHairstyleRepository.countByHairstyleId(h.getId());
        return new AdminCatalogItemResponse(
                h.getId(),
                h.getName(),
                h.getTag(),
                h.getFaceShape(),
                h.getHairLength(),
                h.getDescription(),
                h.getImageUrl(),
                h.isPremiumOnly(),
                h.getGender(),
                h.getAilabHairType(),
                h.getAilabProStyle(),
                h.isActive(),
                savedCount,
                h.getCreatedAt()
        );
    }
}
