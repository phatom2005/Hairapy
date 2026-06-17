package com.hairapy.controllers.admin;

import com.hairapy.dto.admin.CreateHairstyleRequest;
import com.hairapy.dto.admin.UpdateHairstyleRequest;
import com.hairapy.exceptions.ResourceNotFoundException;
import com.hairapy.models.HairstyleCatalog;
import com.hairapy.repositories.HairstyleCatalogRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Controller quản trị thực hiện các nghiệp vụ CRUD cho danh mục kiểu tóc (Hairstyle Catalog).
 */
@RestController
@RequestMapping("/api/admin/catalog")
@RequiredArgsConstructor
public class AdminCatalogController {

    private final HairstyleCatalogRepository hairstyleCatalogRepository;

    /**
     * Lấy danh sách kiểu tóc có phân trang.
     */
    @GetMapping
    public ResponseEntity<Page<HairstyleCatalog>> getCatalog(Pageable pageable) {
        Page<HairstyleCatalog> page = hairstyleCatalogRepository.findAll(pageable);
        return ResponseEntity.ok(page);
    }

    /**
     * Thêm mới kiểu tóc vào danh mục.
     */
    @PostMapping
    public ResponseEntity<HairstyleCatalog> createHairstyle(@Valid @RequestBody CreateHairstyleRequest request) {
        HairstyleCatalog hairstyle = HairstyleCatalog.builder()
                .name(request.name())
                .tag(request.tag())
                .faceShape(request.faceShape())
                .hairLength(request.hairLength())
                .description(request.description())
                .imageUrl(request.imageUrl())
                .premiumOnly(request.premiumOnly())
                .build();

        HairstyleCatalog saved = hairstyleCatalogRepository.save(hairstyle);
        return new ResponseEntity<>(saved, HttpStatus.CREATED);
    }

    /**
     * Cập nhật thông tin kiểu tóc (hỗ trợ partial update).
     */
    @PutMapping("/{id}")
    public ResponseEntity<HairstyleCatalog> updateHairstyle(
            @PathVariable Long id,
            @RequestBody UpdateHairstyleRequest request
    ) {
        HairstyleCatalog hairstyle = hairstyleCatalogRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy kiểu tóc với ID: " + id));

        if (request.name() != null) {
            hairstyle.setName(request.name());
        }
        if (request.tag() != null) {
            hairstyle.setTag(request.tag());
        }
        if (request.faceShape() != null) {
            hairstyle.setFaceShape(request.faceShape());
        }
        if (request.hairLength() != null) {
            hairstyle.setHairLength(request.hairLength());
        }
        if (request.description() != null) {
            hairstyle.setDescription(request.description());
        }
        if (request.imageUrl() != null) {
            hairstyle.setImageUrl(request.imageUrl());
        }
        if (request.premiumOnly() != null) {
            hairstyle.setPremiumOnly(request.premiumOnly());
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
