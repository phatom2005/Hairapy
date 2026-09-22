package com.hairapy.controllers.admin;

import com.hairapy.exceptions.ResourceNotFoundException;
import com.hairapy.models.Salon;
import com.hairapy.repositories.SalonRepository;
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
 * Controller quản trị CRUD cho danh sách salon đối tác.
 * Cùng pattern với AdminCatalogController: hỗ trợ upload ảnh trực tiếp lên Cloudinary
 * (không cần paste URL tay), form nhận dạng multipart/form-data.
 */
@Slf4j
@RestController
@RequestMapping("/api/admin/salons")
@RequiredArgsConstructor
public class AdminSalonController {

    private final SalonRepository salonRepository;
    private final CloudinaryService cloudinaryService;

    /**
     * Lấy danh sách salon có phân trang (khác /api/salons — endpoint đó không phân trang,
     * chỉ trả toàn bộ list cho trang công khai vì dataset nhỏ).
     */
    @GetMapping
    public ResponseEntity<Page<Salon>> getSalons(Pageable pageable) {
        return ResponseEntity.ok(salonRepository.findAll(pageable));
    }

    /**
     * Thêm mới salon — nhận multipart form (ảnh file + metadata).
     */
    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<Salon> createSalon(
            @RequestParam("name") String name,
            @RequestParam("address") String address,
            @RequestParam("district") String district,
            @RequestParam(value = "serviceTypes", required = false) String serviceTypes,
            @RequestParam("priceFrom") Integer priceFrom,
            @RequestParam(value = "rating", required = false, defaultValue = "0") Double rating,
            @RequestParam(value = "verified", required = false, defaultValue = "false") boolean verified,
            @RequestParam(value = "phone", required = false) String phone,
            @RequestParam(value = "image", required = false) MultipartFile image,
            @RequestParam(value = "imageUrl", required = false) String imageUrl
    ) {
        String finalImageUrl;
        if (image != null && !image.isEmpty()) {
            finalImageUrl = cloudinaryService.uploadFile(image, "salons");
            log.info("Admin upload ảnh salon lên Cloudinary: {}", finalImageUrl);
        } else if (imageUrl != null && !imageUrl.isBlank()) {
            finalImageUrl = imageUrl;
        } else {
            return ResponseEntity.badRequest().build();
        }

        Salon salon = Salon.builder()
                .name(name)
                .address(address)
                .district(district)
                .serviceTypes(serviceTypes)
                .priceFrom(priceFrom)
                .rating(rating)
                .verified(verified)
                .imageUrl(finalImageUrl)
                .phone(phone)
                .build();

        Salon saved = salonRepository.save(salon);
        return new ResponseEntity<>(saved, HttpStatus.CREATED);
    }

    /**
     * Cập nhật salon — nhận multipart form (ảnh mới tùy chọn, giữ ảnh cũ nếu không gửi).
     */
    @PutMapping(value = "/{id}", consumes = "multipart/form-data")
    public ResponseEntity<Salon> updateSalon(
            @PathVariable Long id,
            @RequestParam(value = "name", required = false) String name,
            @RequestParam(value = "address", required = false) String address,
            @RequestParam(value = "district", required = false) String district,
            @RequestParam(value = "serviceTypes", required = false) String serviceTypes,
            @RequestParam(value = "priceFrom", required = false) Integer priceFrom,
            @RequestParam(value = "rating", required = false) Double rating,
            @RequestParam(value = "verified", required = false) Boolean verified,
            @RequestParam(value = "phone", required = false) String phone,
            @RequestParam(value = "image", required = false) MultipartFile image,
            @RequestParam(value = "imageUrl", required = false) String imageUrl
    ) {
        Salon salon = salonRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy salon với ID: " + id));

        if (name != null) salon.setName(name);
        if (address != null) salon.setAddress(address);
        if (district != null) salon.setDistrict(district);
        if (serviceTypes != null) salon.setServiceTypes(serviceTypes);
        if (priceFrom != null) salon.setPriceFrom(priceFrom);
        if (rating != null) salon.setRating(rating);
        if (verified != null) salon.setVerified(verified);
        if (phone != null) salon.setPhone(phone);

        if (image != null && !image.isEmpty()) {
            String newUrl = cloudinaryService.uploadFile(image, "salons");
            salon.setImageUrl(newUrl);
            log.info("Admin cập nhật ảnh salon: id={}, newUrl={}", id, newUrl);
        } else if (imageUrl != null && !imageUrl.isBlank()) {
            salon.setImageUrl(imageUrl);
        }

        Salon updated = salonRepository.save(salon);
        return ResponseEntity.ok(updated);
    }

    /**
     * Xóa salon khỏi hệ thống.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSalon(@PathVariable Long id) {
        Salon salon = salonRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy salon với ID: " + id));

        salonRepository.delete(salon);
        return ResponseEntity.noContent().build();
    }
}
