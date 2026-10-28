package com.hairapy.controllers.salonowner;

import com.hairapy.dto.salonowner.*;
import com.hairapy.models.*;
import com.hairapy.repositories.BookingRequestRepository;
import com.hairapy.repositories.HairstyleCatalogRepository;
import com.hairapy.repositories.SalonHairstyleRepository;
import com.hairapy.repositories.SalonRepository;
import com.hairapy.services.CloudinaryService;
import com.hairapy.services.EmailService;
import com.hairapy.services.UsageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;

/**
 * Controller dành riêng cho chủ salon đối tác (/api/salon-owner/**).
 * Yêu cầu quyền SALON_OWNER (được kiểm soát bởi SecurityConfig).
 */
@Slf4j
@RestController
@RequestMapping("/api/salon-owner")
@RequiredArgsConstructor
public class SalonOwnerController {

    private final SalonRepository salonRepository;
    private final SalonHairstyleRepository salonHairstyleRepository;
    private final HairstyleCatalogRepository hairstyleCatalogRepository;
    private final BookingRequestRepository bookingRequestRepository;
    private final UsageService usageService;
    private final CloudinaryService cloudinaryService;
    private final EmailService emailService;

    private Salon getOwnedSalon() {
        User currentUser = usageService.getCurrentUser();
        if (currentUser == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Vui lòng đăng nhập.");
        }
        return salonRepository.findByOwnerId(currentUser.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tài khoản chưa được liên kết với salon nào."));
    }

    /**
     * Lấy thông tin salon của chính chủ đang đăng nhập.
     */
    @GetMapping("/salon")
    public ResponseEntity<SalonOwnerProfileResponse> getMySalon() {
        Salon s = getOwnedSalon();
        return ResponseEntity.ok(toProfileResponse(s));
    }

    /**
     * Cập nhật thông tin salon (chỉ cho phép sửa các trường được duyệt).
     */
    @PutMapping(value = "/salon", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<SalonOwnerProfileResponse> updateMySalon(
            @RequestParam(required = false) String description,
            @RequestParam(required = false) String phone,
            @RequestParam(required = false) Integer priceFrom,
            @RequestParam(required = false) String serviceTypes,
            @RequestParam(required = false) String address,
            @RequestParam(required = false) Double latitude,
            @RequestParam(required = false) Double longitude,
            @RequestParam(required = false) MultipartFile image
    ) {
        Salon s = getOwnedSalon();

        if (description != null) s.setDescription(description.trim());
        if (phone != null && !phone.isBlank()) s.setPhone(phone.trim());
        if (priceFrom != null && priceFrom >= 0) s.setPriceFrom(priceFrom);
        if (serviceTypes != null) s.setServiceTypes(serviceTypes.trim());
        if (address != null && !address.isBlank()) s.setAddress(address.trim());
        if (latitude != null) s.setLatitude(latitude);
        if (longitude != null) s.setLongitude(longitude);

        if (image != null && !image.isEmpty()) {
            String uploadedUrl = cloudinaryService.uploadFile(image, "salons");
            s.setImageUrl(uploadedUrl);
        }

        s = salonRepository.save(s);
        return ResponseEntity.ok(toProfileResponse(s));
    }

    /**
     * Lấy toàn bộ danh sách kiểu tóc active kèm cờ offered và giá riêng của salon.
     */
    @GetMapping("/hairstyles")
    public ResponseEntity<List<SalonOwnerHairstyleResponse>> getSalonHairstyles() {
        Salon s = getOwnedSalon();
        List<HairstyleCatalog> allStyles = hairstyleCatalogRepository.findAll().stream()
                .filter(HairstyleCatalog::isActive)
                .sorted(Comparator.comparing(HairstyleCatalog::getName, String.CASE_INSENSITIVE_ORDER))
                .toList();

        List<SalonHairstyle> currentOfferings = salonHairstyleRepository.findBySalonId(s.getId());
        Map<Long, SalonHairstyle> map = new HashMap<>();
        for (SalonHairstyle sh : currentOfferings) {
            map.put(sh.getHairstyle().getId(), sh);
        }

        List<SalonOwnerHairstyleResponse> result = allStyles.stream().map(h -> {
            SalonHairstyle sh = map.get(h.getId());
            boolean offered = sh != null;
            Integer price = sh != null ? sh.getPrice() : null;
            return new SalonOwnerHairstyleResponse(
                    h.getId(),
                    h.getName(),
                    h.getImageUrl(),
                    h.getGender(),
                    h.getHairLength(),
                    offered,
                    price
            );
        }).toList();

        return ResponseEntity.ok(result);
    }

    /**
     * Cập nhật toàn bộ kiểu tóc salon nhận làm trong 1 transaction.
     */
    @PutMapping("/hairstyles")
    @Transactional
    public ResponseEntity<?> updateSalonHairstyles(@RequestBody List<UpdateSalonHairstylesRequest> requests) {
        Salon s = getOwnedSalon();

        salonHairstyleRepository.deleteBySalonId(s.getId());

        if (requests != null && !requests.isEmpty()) {
            List<SalonHairstyle> toSave = new ArrayList<>();
            for (UpdateSalonHairstylesRequest r : requests) {
                if (r.hairstyleId() == null) continue;
                HairstyleCatalog h = hairstyleCatalogRepository.findById(r.hairstyleId()).orElse(null);
                if (h != null && h.isActive()) {
                    toSave.add(SalonHairstyle.builder()
                            .salon(s)
                            .hairstyle(h)
                            .price(r.price())
                            .build());
                }
            }
            if (!toSave.isEmpty()) {
                salonHairstyleRepository.saveAll(toSave);
            }
        }

        return ResponseEntity.ok(Map.of("message", "Đã cập nhật danh sách kiểu tóc nhận làm."));
    }

    /**
     * Lấy danh sách booking gửi tới salon này.
     */
    @GetMapping("/bookings")
    public ResponseEntity<Page<SalonOwnerBookingResponse>> getBookings(
            @RequestParam(required = false) BookingStatus status,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        Salon s = getOwnedSalon();
        Page<BookingRequest> page;
        if (status != null) {
            page = bookingRequestRepository.findBySalonIdAndStatusOrderByCreatedAtDesc(s.getId(), status, pageable);
        } else {
            page = bookingRequestRepository.findBySalonIdOrderByCreatedAtDesc(s.getId(), pageable);
        }

        return ResponseEntity.ok(page.map(this::toBookingResponse));
    }

    /**
     * Cập nhật trạng thái booking (xác nhận, từ chối, hoàn thành, không đến).
     */
    @PutMapping("/bookings/{id}/status")
    @Transactional
    public ResponseEntity<?> updateBookingStatus(
            @PathVariable Long id,
            @RequestBody UpdateBookingStatusRequest request
    ) {
        Salon s = getOwnedSalon();
        BookingRequest booking = bookingRequestRepository.findById(id).orElse(null);
        if (booking == null || !booking.getSalon().getId().equals(s.getId())) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                    "error", "Không tìm thấy yêu cầu đặt lịch."
            ));
        }

        BookingStatus current = booking.getStatus();
        BookingStatus target = request.status();

        boolean valid = false;
        if (current == BookingStatus.PENDING) {
            valid = (target == BookingStatus.CONFIRMED || target == BookingStatus.REJECTED);
        } else if (current == BookingStatus.CONFIRMED) {
            valid = (target == BookingStatus.COMPLETED || target == BookingStatus.NO_SHOW || target == BookingStatus.REJECTED);
        }

        if (!valid) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "error", "Chuyển trạng thái từ " + current + " sang " + target + " không hợp lệ."
            ));
        }

        booking.setStatus(target);
        if (request.salonNote() != null) {
            booking.setSalonNote(request.salonNote().trim());
        }
        booking.setUpdatedAt(LocalDateTime.now());
        bookingRequestRepository.save(booking);

        // Gửi email cho khách khi CONFIRMED hoặc REJECTED (best-effort)
        if (target == BookingStatus.CONFIRMED || target == BookingStatus.REJECTED) {
            if (booking.getUser() != null && booking.getUser().getEmail() != null) {
                String toEmail = booking.getUser().getEmail();
                String statusText = target == BookingStatus.CONFIRMED ? "ĐÃ XÁC NHẬN" : "TỪ CHỐI";
                String subject = "Hairapy - Lịch hẹn tại " + s.getName() + " " + statusText;
                String html = "<div style=\"font-family:sans-serif;max-width:560px;margin:0 auto\">"
                        + "<h2>Cập nhật lịch hẹn Hairapy</h2>"
                        + "<p>Salon <strong>" + esc(s.getName()) + "</strong> đã <strong>" + statusText.toLowerCase() + "</strong> yêu cầu đặt lịch của bạn.</p>"
                        + "<p>Thời gian hẹn: <strong>" + fmtTime(booking.getPreferredTime()) + "</strong></p>"
                        + (request.salonNote() != null && !request.salonNote().isBlank() ? "<p>Lời nhắn từ salon: " + esc(request.salonNote()) + "</p>" : "")
                        + "<p>Địa chỉ salon: " + esc(s.getAddress()) + "</p>"
                        + "<p>Số điện thoại salon: " + esc(s.getPhone()) + "</p>"
                        + "</div>";
                try {
                    emailService.sendBookingStatusNotification(toEmail, subject, html);
                } catch (Exception e) {
                    log.warn("Không thể gửi email thông báo trạng thái đặt lịch tới {}: {}", toEmail, e.getMessage());
                }
            }
        }

        return ResponseEntity.ok(toBookingResponse(booking));
    }

    /**
     * Thống kê tổng quan cho salon trong 30 ngày qua.
     */
    @GetMapping("/stats")
    public ResponseEntity<SalonOwnerStatsResponse> getStats(
            @RequestParam(required = false, defaultValue = "30") Integer days
    ) {
        Salon s = getOwnedSalon();

        Map<String, Long> byStatus = new HashMap<>();
        long completed = 0;
        long finished = 0;
        for (BookingStatus st : BookingStatus.values()) {
            long count = bookingRequestRepository.countBySalonIdAndStatus(s.getId(), st);
            byStatus.put(st.name(), count);
            if (st == BookingStatus.COMPLETED) completed += count;
            if (st == BookingStatus.COMPLETED || st == BookingStatus.NO_SHOW || st == BookingStatus.REJECTED) {
                finished += count;
            }
        }

        double completionRate = finished > 0 ? Math.round(((double) completed / finished * 100.0) * 10.0) / 10.0 : 0.0;

        List<Object[]> topRows = bookingRequestRepository.findTopRequestedHairstylesBySalonId(s.getId(), PageRequest.of(0, 5));
        List<TopRequestedHairstyle> topList = topRows.stream()
                .map(row -> new TopRequestedHairstyle((String) row[0], ((Number) row[1]).longValue()))
                .toList();

        boolean partnerExpired = s.getPartnerUntil() == null || s.getPartnerUntil().isBefore(LocalDateTime.now());
        long daysLeft = partnerExpired ? 0 : ChronoUnit.DAYS.between(LocalDateTime.now(), s.getPartnerUntil());

        SalonOwnerStatsResponse stats = new SalonOwnerStatsResponse(
                s.getViewCount(),
                byStatus,
                completionRate,
                topList,
                s.getPartnerUntil(),
                daysLeft,
                partnerExpired
        );

        return ResponseEntity.ok(stats);
    }

    private SalonOwnerProfileResponse toProfileResponse(Salon s) {
        boolean partnerExpired = s.getPartnerUntil() == null || s.getPartnerUntil().isBefore(LocalDateTime.now());
        long daysLeft = partnerExpired ? 0 : ChronoUnit.DAYS.between(LocalDateTime.now(), s.getPartnerUntil());

        return new SalonOwnerProfileResponse(
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
                s.isActive(),
                s.getViewCount(),
                s.getPartnerUntil(),
                daysLeft,
                partnerExpired
        );
    }

    private SalonOwnerBookingResponse toBookingResponse(BookingRequest b) {
        return new SalonOwnerBookingResponse(
                b.getId(),
                b.getCustomerName(),
                b.getCustomerPhone(),
                b.getHairstyleId(),
                b.getHairstyleName(),
                b.getTryOnImageUrl(),
                b.getFaceShape(),
                b.getPreferredTime(),
                b.getNote(),
                b.getStatus(),
                b.getSalonNote(),
                b.getCreatedAt(),
                b.getUpdatedAt()
        );
    }

    /** Escape HTML cho dữ liệu người dùng nhập trước khi chèn vào email (chống chèn link/HTML giả mạo). */
    private static String esc(Object value) {
        return value == null ? "" : org.springframework.web.util.HtmlUtils.htmlEscape(String.valueOf(value));
    }

    /** Hiển thị giờ hẹn dạng "15:00 ngày 29/10/2026" thay vì "2026-10-29T15:00". */
    private static String fmtTime(java.time.LocalDateTime t) {
        return t == null ? "" : t.format(java.time.format.DateTimeFormatter.ofPattern("HH:mm 'ngày' dd/MM/yyyy"));
    }
}
