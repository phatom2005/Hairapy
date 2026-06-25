package com.hairapy.controllers.admin;

import com.hairapy.dto.admin.UpdateHairstyleRequest;
import com.hairapy.exceptions.ResourceNotFoundException;
import com.hairapy.models.HairstyleCatalog;
import com.hairapy.repositories.HairstyleCatalogRepository;
import com.hairapy.services.CloudinaryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

/**
 * Controller quản trị CRUD cho danh mục kiểu tóc.
 * Hỗ trợ upload ảnh trực tiếp lên Cloudinary (không cần paste URL).
 */
@Slf4j
@RestController
@RequestMapping("/api/admin/catalog")
@RequiredArgsConstructor
public class AdminCatalogController {

    private final HairstyleCatalogRepository hairstyleCatalogRepository;
    private final CloudinaryService cloudinaryService;

    /**
     * Lấy danh sách kiểu tóc có phân trang.
     */
    @GetMapping
    public ResponseEntity<Page<HairstyleCatalog>> getCatalog(Pageable pageable) {
        Page<HairstyleCatalog> page = hairstyleCatalogRepository.findAll(pageable);
        return ResponseEntity.ok(page);
    }

    /**
     * Thêm mới kiểu tóc — nhận multipart form (ảnh file + metadata).
     */
    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<HairstyleCatalog> createHairstyle(
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
        // Upload ảnh lên Cloudinary nếu có file, nếu không dùng URL truyền vào
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
                .build();

        HairstyleCatalog saved = hairstyleCatalogRepository.save(hairstyle);
        return new ResponseEntity<>(saved, HttpStatus.CREATED);
    }

    /**
     * Cập nhật kiểu tóc — nhận multipart form (ảnh mới tùy chọn).
     */
    @PutMapping(value = "/{id}", consumes = "multipart/form-data")
    public ResponseEntity<HairstyleCatalog> updateHairstyle(
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

        // Nếu có ảnh mới → upload Cloudinary, không thì giữ ảnh cũ
        if (image != null && !image.isEmpty()) {
            String newUrl = cloudinaryService.uploadFile(image, "catalog");
            hairstyle.setImageUrl(newUrl);
            log.info("Admin cập nhật ảnh catalog: id={}, newUrl={}", id, newUrl);
        } else if (imageUrl != null && !imageUrl.isBlank()) {
            hairstyle.setImageUrl(imageUrl);
        }

        HairstyleCatalog updated = hairstyleCatalogRepository.save(hairstyle);
        return ResponseEntity.ok(updated);
    }

    /**
     * Xóa kiểu tóc khỏi hệ thống.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteHairstyle(@PathVariable Long id) {
        HairstyleCatalog hairstyle = hairstyleCatalogRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy kiểu tóc với ID: " + id));

        hairstyleCatalogRepository.delete(hairstyle);
        return ResponseEntity.noContent().build();
    }
}
