package com.hairapy.controllers.admin;

import com.hairapy.dto.admin.AdminCatalogItemResponse;
import com.hairapy.exceptions.ResourceNotFoundException;
import com.hairapy.models.HairstyleCatalog;
import com.hairapy.repositories.HairstyleCatalogRepository;
import com.hairapy.repositories.SavedHairstyleRepository;
import com.hairapy.services.CloudinaryService;
import com.hairapy.services.HairSwapService;
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
import java.util.HashMap;
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
    private final HairSwapService hairSwapService;

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
     * Danh sách 51 mã kiểu tóc AILab kèm thông tin nhóm giới tính và kiểu tóc đang dùng.
     */
    @GetMapping("/ai-styles")
    public ResponseEntity<List<Map<String, Object>>> getAiStyles() {
        List<HairstyleCatalog> all = hairstyleCatalogRepository.findAll();
        Map<String, String> usedMap = new HashMap<>();
        for (HairstyleCatalog h : all) {
            if (h.getAilabProStyle() != null && !usedMap.containsKey(h.getAilabProStyle())) {
                usedMap.put(h.getAilabProStyle(), h.getName());
            }
        }
        List<Map<String, Object>> result = new ArrayList<>();
        for (String code : HairSwapService.SUPPORTED_STYLES) {
            String group = HairSwapService.MALE_STYLES.contains(code) ? "Nam" : "Nữ";
            Map<String, Object> item = new HashMap<>();
            item.put("code", code);
            item.put("group", group);
            item.put("usedBy", usedMap.get(code));
            result.add(item);
        }
        return ResponseEntity.ok(result);
    }

    /**
     * Thêm mới kiểu tóc — nhận multipart form (ảnh file + metadata).
     */
    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<?> createHairstyle(
            @RequestParam("name") String name,
            @RequestParam(value = "image", required = false) MultipartFile image,
            @RequestParam(value = "imageUrl", required = false) String imageUrl,
            @RequestParam(value = "tag", required = false) String tag,
            @RequestParam(value = "faceShape", required = false) String faceShape,
            @RequestParam(value = "hairLength", required = false) String hairLength,
            @RequestParam(value = "gender", required = false, defaultValue = "Unisex") String gender,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "premiumOnly", required = false, defaultValue = "false") boolean premiumOnly,
            @RequestParam(value = "ailabProStyle", required = false) String ailabProStyle,
            @RequestParam(value = "ailabColor", required = false) String ailabColor
    ) {
        if (ailabProStyle != null && !ailabProStyle.isBlank()) {
            if (!HairSwapService.SUPPORTED_STYLES.contains(ailabProStyle)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Mã kiểu AI không hợp lệ."));
            }
        }

        String colorToCheck = (ailabColor != null && !ailabColor.isBlank()) ? ailabColor.trim() : null;
        if (colorToCheck != null && !HairSwapService.SUPPORTED_COLORS.contains(colorToCheck)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Màu tóc không hợp lệ."));
        }

        if (ailabProStyle != null && !ailabProStyle.isBlank()) {
            var existing = hairstyleCatalogRepository.findByStyleAndColor(ailabProStyle, colorToCheck);
            if (existing.isPresent()) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                        "error", "Kiểu \"" + existing.get().getName() + "\" đã dùng đúng mã và màu này — mỗi mục phải khác mã hoặc khác màu."
                ));
            }
        }

        String finalImageUrl;
        if (image != null && !image.isEmpty()) {
            finalImageUrl = cloudinaryService.uploadFile(image, "catalog");
            log.info("Admin upload ảnh catalog lên Cloudinary: {}", finalImageUrl);
        } else if (imageUrl != null && !imageUrl.isBlank()) {
            finalImageUrl = imageUrl;
        } else {
            return ResponseEntity.badRequest().body(Map.of("error", "Vui lòng tải lên ảnh hoặc nhập link ảnh."));
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
                .ailabProStyle(ailabProStyle)
                .ailabColor(colorToCheck)
                .active(true)
                .sampleByAi(false)
                .build();

        HairstyleCatalog saved = hairstyleCatalogRepository.save(hairstyle);
        return new ResponseEntity<>(toAdminResponse(saved), HttpStatus.CREATED);
    }

    /**
     * Cập nhật kiểu tóc — nhận multipart form (ảnh mới tùy chọn).
     */
    @PutMapping(value = "/{id}", consumes = "multipart/form-data")
    public ResponseEntity<?> updateHairstyle(
            @PathVariable Long id,
            @RequestParam(value = "name", required = false) String name,
            @RequestParam(value = "image", required = false) MultipartFile image,
            @RequestParam(value = "imageUrl", required = false) String imageUrl,
            @RequestParam(value = "tag", required = false) String tag,
            @RequestParam(value = "faceShape", required = false) String faceShape,
            @RequestParam(value = "hairLength", required = false) String hairLength,
            @RequestParam(value = "gender", required = false) String gender,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "premiumOnly", required = false) Boolean premiumOnly,
            @RequestParam(value = "ailabProStyle", required = false) String ailabProStyle,
            @RequestParam(value = "ailabColor", required = false) String ailabColor
    ) {
        HairstyleCatalog hairstyle = hairstyleCatalogRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy kiểu tóc với ID: " + id));

        if (ailabProStyle != null && !ailabProStyle.isBlank()) {
            if (!HairSwapService.SUPPORTED_STYLES.contains(ailabProStyle)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Mã kiểu AI không hợp lệ."));
            }
        }

        String colorToCheck = (ailabColor != null && !ailabColor.isBlank()) ? ailabColor.trim() : null;
        if (ailabColor != null && !ailabColor.isBlank() && !HairSwapService.SUPPORTED_COLORS.contains(colorToCheck)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Màu tóc không hợp lệ."));
        }

        String targetStyle = ailabProStyle != null ? ailabProStyle : hairstyle.getAilabProStyle();
        String targetColor = ailabColor != null ? colorToCheck : hairstyle.getAilabColor();
        if (targetStyle != null) {
            var existing = hairstyleCatalogRepository.findByStyleAndColor(targetStyle, targetColor);
            if (existing.isPresent() && !existing.get().getId().equals(id)) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                        "error", "Kiểu \"" + existing.get().getName() + "\" đã dùng đúng mã và màu này — mỗi mục phải khác mã hoặc khác màu."
                ));
            }
        }

        boolean styleChanged = ailabProStyle != null && !ailabProStyle.equals(hairstyle.getAilabProStyle());
        boolean colorChanged = ailabColor != null && !java.util.Objects.equals(colorToCheck, hairstyle.getAilabColor());
        if (styleChanged || colorChanged) {
            hairstyle.setSampleByAi(false);
        }

        if (name != null) hairstyle.setName(name);
        if (tag != null) hairstyle.setTag(tag);
        if (faceShape != null) hairstyle.setFaceShape(faceShape);
        if (hairLength != null) hairstyle.setHairLength(hairLength);
        if (gender != null) hairstyle.setGender(gender);
        if (description != null) hairstyle.setDescription(description);
        if (premiumOnly != null) hairstyle.setPremiumOnly(premiumOnly);
        if (ailabProStyle != null) hairstyle.setAilabProStyle(ailabProStyle);
        if (ailabColor != null) hairstyle.setAilabColor(colorToCheck);

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
     * Tạo biến thể màu cho kiểu tóc gốc.
     */
    @PostMapping("/{id}/variants")
    public ResponseEntity<?> createVariants(
            @PathVariable Long id,
            @RequestBody Map<String, List<String>> body
    ) {
        HairstyleCatalog baseStyle = hairstyleCatalogRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy kiểu tóc với ID: " + id));

        if (baseStyle.getBaseStyleId() != null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Chỉ có thể tạo biến thể từ kiểu tóc gốc."));
        }

        List<String> colors = body != null ? body.get("colors") : null;
        if (colors == null || colors.isEmpty() || colors.size() > 6) {
            return ResponseEntity.badRequest().body(Map.of("error", "Danh sách màu không được trống và tối đa 6 màu mỗi lần."));
        }

        List<AdminCatalogItemResponse> created = new ArrayList<>();
        List<String> skipped = new ArrayList<>();

        for (String rawColor : colors) {
            if (rawColor == null || rawColor.isBlank()) continue;
            String color = rawColor.trim();
            if (!HairSwapService.SUPPORTED_COLORS.contains(color)) {
                skipped.add(color);
                continue;
            }
            if (hairstyleCatalogRepository.findByStyleAndColor(baseStyle.getAilabProStyle(), color).isPresent()) {
                skipped.add(color);
                continue;
            }

            String colorVi = HairSwapService.COLOR_LABELS_VI.getOrDefault(color, color);
            String desc = (baseStyle.getDescription() != null ? baseStyle.getDescription() : "")
                    + " Phiên bản màu " + colorVi + ".";

            HairstyleCatalog variant = HairstyleCatalog.builder()
                    .name(baseStyle.getName() + " · " + colorVi)
                    .tag(baseStyle.getTag())
                    .faceShape(baseStyle.getFaceShape())
                    .hairLength(baseStyle.getHairLength())
                    .gender(baseStyle.getGender())
                    .description(desc)
                    .imageUrl("https://placehold.co/600x800/png?text=Hairapy")
                    .premiumOnly(baseStyle.isPremiumOnly())
                    .ailabProStyle(baseStyle.getAilabProStyle())
                    .ailabHairType(baseStyle.getAilabHairType())
                    .ailabColor(color)
                    .baseStyleId(baseStyle.getId())
                    .active(false)
                    .sampleByAi(false)
                    .build();

            HairstyleCatalog saved = hairstyleCatalogRepository.save(variant);
            created.add(toAdminResponse(saved));
        }

        return ResponseEntity.ok(Map.of("created", created, "skipped", skipped));
    }

    /**
     * Tạo task thử ảnh mẫu AI cho catalog (không trừ quota, không lưu history).
     */
    @PostMapping(value = "/{id}/sample", consumes = "multipart/form-data")
    public ResponseEntity<?> createSample(
            @PathVariable Long id,
            @RequestParam("image") MultipartFile image,
            @RequestParam(value = "hairColor", required = false) String hairColor
    ) {
        HairstyleCatalog style = hairstyleCatalogRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy kiểu tóc với ID: " + id));

        if (image == null || image.isEmpty() || !com.hairapy.utils.ImageValidator.isSupportedImage(image)) {
            return ResponseEntity.badRequest().body(Map.of("error", com.hairapy.utils.ImageValidator.INVALID_MESSAGE));
        }

        String effectiveColor = (hairColor != null && !hairColor.isBlank()) ? hairColor.trim() : style.getAilabColor();
        if (effectiveColor != null && !HairSwapService.SUPPORTED_COLORS.contains(effectiveColor)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Màu tóc không hợp lệ."));
        }

        String taskId = hairSwapService.submitTask(image, style.getAilabProStyle(), effectiveColor);
        return ResponseEntity.ok(Map.of("taskId", taskId));
    }

    /**
     * Kiểm tra trạng thái task tạo ảnh mẫu AI. Khi DONE upload lên folder catalog-candidates.
     */
    @GetMapping("/{id}/sample/{taskId}")
    public ResponseEntity<?> checkSampleStatus(
            @PathVariable Long id,
            @PathVariable String taskId
    ) {
        com.hairapy.dto.HairSwapPollResult poll = hairSwapService.checkStatus(taskId);
        if (poll.status() == com.hairapy.dto.HairSwapPollResult.Status.PENDING) {
            return ResponseEntity.ok(Map.of("status", "PENDING"));
        }
        if (poll.status() == com.hairapy.dto.HairSwapPollResult.Status.ERROR) {
            return ResponseEntity.ok(Map.of("status", "ERROR", "error", poll.errorMessage() != null ? poll.errorMessage() : "Lỗi xử lý AI"));
        }
        if (poll.status() == com.hairapy.dto.HairSwapPollResult.Status.DONE) {
            String uploadedUrl = cloudinaryService.uploadFromUrl(poll.imageUrl(), "catalog-candidates", false);
            return ResponseEntity.ok(Map.of("status", "DONE", "imageUrl", uploadedUrl));
        }
        return ResponseEntity.ok(Map.of("status", "PENDING"));
    }

    /**
     * Duyệt áp dụng ảnh mẫu AI vào kiểu tóc.
     */
    @PutMapping("/{id}/sample")
    public ResponseEntity<?> applySample(
            @PathVariable Long id,
            @RequestBody Map<String, String> body
    ) {
        String imageUrl = body != null ? body.get("imageUrl") : null;
        if (imageUrl == null || !imageUrl.contains("catalog-candidates")) {
            return ResponseEntity.badRequest().body(Map.of("error", "Ảnh mẫu phải nằm trong thư mục catalog-candidates."));
        }

        HairstyleCatalog style = hairstyleCatalogRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy kiểu tóc với ID: " + id));

        String oldImageUrl = style.getImageUrl();
        style.setImageUrl(imageUrl);
        style.setSampleByAi(true);
        HairstyleCatalog saved = hairstyleCatalogRepository.save(style);

        if (oldImageUrl != null) {
            String oldPid = cloudinaryService.extractPublicId(oldImageUrl);
            if (oldPid != null && oldPid.contains("catalog")) {
                try {
                    cloudinaryService.delete(oldPid);
                } catch (Exception e) {
                    log.warn("Không thể xóa ảnh catalog cũ: {}", e.getMessage());
                }
            }
        }

        return ResponseEntity.ok(toAdminResponse(saved));
    }

    /**
     * Xóa kiểu tóc khỏi hệ thống. Chặn xoá nếu có khách lưu yêu thích (yêu cầu ẩn thay vì xoá).
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteHairstyle(@PathVariable Long id) {
        HairstyleCatalog hairstyle = hairstyleCatalogRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy kiểu tóc với ID: " + id));

        long savedCount = savedHairstyleRepository.countByHairstyleId(id);
        List<HairstyleCatalog> variants = hairstyleCatalogRepository.findByBaseStyleId(id);
        for (HairstyleCatalog v : variants) {
            savedCount += savedHairstyleRepository.countByHairstyleId(v.getId());
        }

        if (savedCount > 0) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                    "error", "Có " + savedCount + " người đang lưu kiểu này hoặc biến thể của nó. Hãy ẩn thay vì xoá.",
                    "savedCount", savedCount
            ));
        }

        if (!variants.isEmpty()) {
            hairstyleCatalogRepository.deleteAll(variants);
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
                h.isSampleByAi(),
                h.getAilabColor(),
                h.getBaseStyleId(),
                h.getCreatedAt()
        );
    }
}
