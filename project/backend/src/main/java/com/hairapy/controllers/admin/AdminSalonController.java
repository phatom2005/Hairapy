package com.hairapy.controllers.admin;

import com.hairapy.dto.admin.AdminSalonResponse;
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
 * Trả về DTO AdminSalonResponse thay vì entity để tránh lazy load owner.
 */
@Slf4j
@RestController
@RequestMapping("/api/admin/salons")
@RequiredArgsConstructor
public class AdminSalonController {

    private final SalonRepository salonRepository;
    private final CloudinaryService cloudinaryService;
    private final com.hairapy.repositories.UserRepository userRepository;
    private final com.hairapy.repositories.SalonPartnerPaymentRepository salonPartnerPaymentRepository;

    /**
     * Lấy danh sách salon có phân trang cho admin.
     */
    @GetMapping
    public ResponseEntity<Page<AdminSalonResponse>> getSalons(Pageable pageable) {
        return ResponseEntity.ok(salonRepository.findAll(pageable).map(this::toAdminResponse));
    }

    /**
     * Thêm mới salon — nhận multipart form (ảnh file + metadata).
     */
    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<AdminSalonResponse> createSalon(
            @RequestParam("name") String name,
            @RequestParam("address") String address,
            @RequestParam("district") String district,
            @RequestParam(value = "serviceTypes", required = false) String serviceTypes,
            @RequestParam("priceFrom") Integer priceFrom,
            @RequestParam(value = "rating", required = false, defaultValue = "0") Double rating,
            @RequestParam(value = "verified", required = false, defaultValue = "false") boolean verified,
            @RequestParam(value = "phone", required = false) String phone,
            @RequestParam(value = "latitude", required = false) Double latitude,
            @RequestParam(value = "longitude", required = false) Double longitude,
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
                .latitude(latitude)
                .longitude(longitude)
                .active(true)
                .viewCount(0L)
                .build();

        Salon saved = salonRepository.save(salon);
        return new ResponseEntity<>(toAdminResponse(saved), HttpStatus.CREATED);
    }

    /**
     * Cập nhật salon — nhận multipart form (ảnh mới tùy chọn, giữ ảnh cũ nếu không gửi).
     */
    @PutMapping(value = "/{id}", consumes = "multipart/form-data")
    public ResponseEntity<AdminSalonResponse> updateSalon(
            @PathVariable Long id,
            @RequestParam(value = "name", required = false) String name,
            @RequestParam(value = "address", required = false) String address,
            @RequestParam(value = "district", required = false) String district,
            @RequestParam(value = "serviceTypes", required = false) String serviceTypes,
            @RequestParam(value = "priceFrom", required = false) Integer priceFrom,
            @RequestParam(value = "rating", required = false) Double rating,
            @RequestParam(value = "verified", required = false) Boolean verified,
            @RequestParam(value = "phone", required = false) String phone,
            @RequestParam(value = "latitude", required = false) Double latitude,
            @RequestParam(value = "longitude", required = false) Double longitude,
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
        if (latitude != null) salon.setLatitude(latitude);
        if (longitude != null) salon.setLongitude(longitude);

        if (image != null && !image.isEmpty()) {
            String newUrl = cloudinaryService.uploadFile(image, "salons");
            salon.setImageUrl(newUrl);
            log.info("Admin cập nhật ảnh salon: id={}, newUrl={}", id, newUrl);
        } else if (imageUrl != null && !imageUrl.isBlank()) {
            salon.setImageUrl(imageUrl);
        }

        Salon updated = salonRepository.save(salon);
        return ResponseEntity.ok(toAdminResponse(updated));
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

    /**
     * Ẩn / hiện salon.
     */
    @PatchMapping("/{id}/active")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<AdminSalonResponse> toggleActive(@PathVariable Long id) {
        Salon salon = salonRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy salon với ID: " + id));
        salon.setActive(!salon.isActive());
        salon = salonRepository.save(salon);
        return ResponseEntity.ok(toAdminResponse(salon));
    }

    /**
     * Gán chủ sở hữu cho salon (user trở thành SALON_OWNER, đảm bảo 1 user - 1 salon).
     */
    @PutMapping("/{id}/owner")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> assignOwner(
            @PathVariable Long id,
            @RequestBody com.hairapy.dto.admin.AssignSalonOwnerRequest request
    ) {
        Salon salon = salonRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy salon với ID: " + id));
        if (request.email() == null || request.email().isBlank()) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", "Email không được để trống."));
        }
        com.hairapy.models.User user = userRepository.findByEmail(request.email().trim().toLowerCase())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng với email: " + request.email()));

        // Ràng buộc 1 user - 1 salon check ở service/controller
        java.util.Optional<Salon> existing = salonRepository.findByOwnerId(user.getId());
        if (existing.isPresent() && !existing.get().getId().equals(id)) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", "Người dùng này đã là chủ của một salon khác."));
        }

        salon.setOwner(user);
        salonRepository.save(salon);

        user.setRole(com.hairapy.models.Role.SALON_OWNER);
        userRepository.save(user);

        return ResponseEntity.ok(toAdminResponse(salon));
    }

    /**
     * Ghi nhận thanh toán Gói Đối tác (MÔ PHỎNG — admin ghi nhận tay, cộng dồn partnerUntil).
     */
    @PostMapping("/{id}/partner-payments")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> recordPartnerPayment(
            @PathVariable Long id,
            @RequestBody com.hairapy.dto.admin.RecordSalonPartnerPaymentRequest request
    ) {
        Salon salon = salonRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy salon với ID: " + id));

        if (request.months() == null || request.months() < 1 || request.months() > 12) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", "Số tháng phải từ 1 đến 12."));
        }
        if (request.amount() == null || request.amount() < 0) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", "Số tiền không hợp lệ."));
        }

        String adminEmail = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();

        com.hairapy.models.SalonPartnerPayment payment = com.hairapy.models.SalonPartnerPayment.builder()
                .salon(salon)
                .months(request.months())
                .amount(request.amount())
                .note(request.note())
                .createdBy(adminEmail)
                .createdAt(java.time.LocalDateTime.now())
                .build();
        payment = salonPartnerPaymentRepository.save(payment);

        // Cộng dồn partnerUntil từ max(now, partnerUntil cũ)
        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        java.time.LocalDateTime base = (salon.getPartnerUntil() != null && salon.getPartnerUntil().isAfter(now))
                ? salon.getPartnerUntil() : now;
        salon.setPartnerUntil(base.plusDays((long) request.months() * 30));
        salonRepository.save(salon);

        com.hairapy.dto.admin.SalonPartnerPaymentResponse response = new com.hairapy.dto.admin.SalonPartnerPaymentResponse(
                payment.getId(),
                salon.getId(),
                payment.getMonths(),
                payment.getAmount(),
                payment.getNote(),
                payment.getCreatedBy(),
                payment.getCreatedAt()
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Lấy lịch sử thanh toán đối tác của salon.
     */
    @GetMapping("/{id}/partner-payments")
    public ResponseEntity<java.util.List<com.hairapy.dto.admin.SalonPartnerPaymentResponse>> getPartnerPayments(@PathVariable Long id) {
        java.util.List<com.hairapy.models.SalonPartnerPayment> list = salonPartnerPaymentRepository.findBySalonIdOrderByCreatedAtDesc(id);
        java.util.List<com.hairapy.dto.admin.SalonPartnerPaymentResponse> response = list.stream().map(p ->
                new com.hairapy.dto.admin.SalonPartnerPaymentResponse(
                        p.getId(),
                        p.getSalon().getId(),
                        p.getMonths(),
                        p.getAmount(),
                        p.getNote(),
                        p.getCreatedBy(),
                        p.getCreatedAt()
                )
        ).toList();
        return ResponseEntity.ok(response);
    }

    public AdminSalonResponse toAdminResponse(Salon s) {
        String ownerEmail = s.getOwner() != null ? s.getOwner().getEmail() : null;
        return new AdminSalonResponse(
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
                null,
                null,
                ownerEmail,
                s.getPartnerUntil(),
                s.isActive(),
                s.getViewCount()
        );
    }
}
