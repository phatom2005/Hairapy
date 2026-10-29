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
    private final com.hairapy.services.GaMeasurementService gaMeasurementService;
    private final com.hairapy.services.TrendService trendService;
    private final com.hairapy.services.GaReportService gaReportService;
    private final com.hairapy.repositories.UsageHistoryRepository usageHistoryRepository;

    private static final String DEFAULT_CITY = "Ho Chi Minh City";

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

        // Bắn sự kiện cập nhật trạng thái đặt lịch lên GA4 Measurement Protocol
        if (gaMeasurementService != null) {
            long leadTimeHours = 0;
            if (booking.getPreferredTime() != null && booking.getCreatedAt() != null) {
                leadTimeHours = java.time.Duration.between(booking.getCreatedAt(), booking.getPreferredTime()).toHours();
            }

            String eventName = switch (target) {
                case CONFIRMED -> "booking_confirmed";
                case COMPLETED -> "booking_completed";
                case REJECTED -> "booking_rejected";
                case NO_SHOW -> "booking_no_show";
                default -> null;
            };

            if (eventName != null) {
                Map<String, Object> gaParams = new HashMap<>();
                gaParams.put("salon_id", s.getId());
                if (booking.getHairstyleId() != null) {
                    gaParams.put("hairstyle_id", booking.getHairstyleId());
                }
                gaParams.put("lead_time_hours", leadTimeHours);
                gaMeasurementService.send(booking.getGaClientId(),
                        booking.getUser() != null ? booking.getUser().getId() : null,
                        eventName, gaParams);
            }
        }

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

    /**
     * Báo cáo xu hướng khu vực cho Salon đối tác (yêu cầu gói đối tác còn hiệu lực).
     */
    @GetMapping("/insights")
    public ResponseEntity<?> getSalonInsights() {
        Salon s = getOwnedSalon();
        if (!s.isPartnerActive()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of(
                            "error", "Gói đối tác đã hết hạn hoặc chưa kích hoạt.",
                            "partnerExpired", true
                    ));
        }

        // 1. Top 10 kiểu được thử ở thành phố (kèm growthPct)
        List<com.hairapy.dto.insight.TrendingStyleResponse> topTriedInCity = trendService.getTopStylesByCity(DEFAULT_CITY, 10);

        // 2. Top kiểu khách gửi yêu cầu đặt lịch cùng quận trong 30 ngày qua
        LocalDateTime since30d = LocalDateTime.now().minusDays(30);
        List<SalonOwnerInsightsResponse.DistrictRequestedHairstyle> topRequestedInDistrict = new ArrayList<>();
        if (s.getDistrict() != null && !s.getDistrict().isBlank()) {
            List<Object[]> districtRows = bookingRequestRepository.findTopRequestedInDistrict(
                    s.getDistrict().trim(), since30d, PageRequest.of(0, 10));
            for (Object[] r : districtRows) {
                String name = (String) r[0];
                long count = ((Number) r[1]).longValue();
                topRequestedInDistrict.add(new SalonOwnerInsightsResponse.DistrictRequestedHairstyle(name, count));
            }
        }

        // 3. Kiểu nằm trong topTriedInCity mà salon chưa nhận làm
        Set<Long> salonHairstyleIds = new HashSet<>();
        for (SalonHairstyle sh : salonHairstyleRepository.findBySalonId(s.getId())) {
            if (sh.getHairstyle() != null && sh.getHairstyle().getId() != null) {
                salonHairstyleIds.add(sh.getHairstyle().getId());
                if (sh.getHairstyle().getBaseStyleId() != null) {
                    salonHairstyleIds.add(sh.getHairstyle().getBaseStyleId());
                }
            }
        }
        List<com.hairapy.dto.insight.TrendingStyleResponse> missingHotStyles = topTriedInCity.stream()
                .filter(t -> !salonHairstyleIds.contains(t.hairstyleId()))
                .toList();

        // 4. Phân bố lượt thử tóc theo giờ trong ngày (30 ngày)
        List<SalonOwnerInsightsResponse.HourCount> peakHours = computePeakHours(since30d);

        // 5. Phễu 5 bước của riêng salon
        SalonOwnerInsightsResponse.SalonFunnel funnel = computeSalonFunnel(s);

        return ResponseEntity.ok(new SalonOwnerInsightsResponse(
                DEFAULT_CITY,
                s.getDistrict(),
                topTriedInCity,
                topRequestedInDistrict,
                missingHotStyles,
                peakHours,
                funnel
        ));
    }

    private List<SalonOwnerInsightsResponse.HourCount> computePeakHours(LocalDateTime since30d) {
        long[] hourCounts = new long[24];
        if (gaReportService.isConfigured()) {
            try {
                Map<String, Object> filter = Map.of(
                        "filter", Map.of("fieldName", "eventName", "stringFilter", Map.of("value", "hair_swap", "matchType", "EXACT"))
                );
                List<com.hairapy.services.GaReportService.Row> rows = gaReportService.runReport(
                        "30daysAgo", "today",
                        List.of("hour"),
                        List.of("eventCount"),
                        24, null, filter);
                for (com.hairapy.services.GaReportService.Row r : rows) {
                    try {
                        int h = Integer.parseInt(r.dims().get(0));
                        if (h >= 0 && h < 24) {
                            hourCounts[h] = Math.round(r.metrics().get(0));
                        }
                    } catch (NumberFormatException ignored) {}
                }
                List<SalonOwnerInsightsResponse.HourCount> list = new ArrayList<>();
                for (int h = 0; h < 24; h++) {
                    list.add(new SalonOwnerInsightsResponse.HourCount(h, hourCounts[h]));
                }
                return list;
            } catch (Exception e) {
                log.warn("Lỗi khi lấy peakHours từ GA4: {}", e.getMessage());
            }
        }

        // Fallback DB
        List<LocalDateTime> times = usageHistoryRepository.findSwapTimesSince(since30d);
        java.time.ZoneId serverZone = java.time.ZoneId.systemDefault();
        java.time.ZoneId vnZone = java.time.ZoneId.of("Asia/Ho_Chi_Minh");
        for (LocalDateTime t : times) {
            // usedAt lưu theo giờ server (UTC trên Railway) -> quy về giờ VN, nếu không biểu đồ lệch 7 tiếng
            int h = t.atZone(serverZone).withZoneSameInstant(vnZone).getHour();
            hourCounts[h]++;
        }
        List<SalonOwnerInsightsResponse.HourCount> list = new ArrayList<>();
        for (int h = 0; h < 24; h++) {
            list.add(new SalonOwnerInsightsResponse.HourCount(h, hourCounts[h]));
        }
        return list;
    }

    private SalonOwnerInsightsResponse.SalonFunnel computeSalonFunnel(Salon s) {
        if (gaReportService.isConfigured()) {
            try {
                Map<String, Object> filter = Map.of(
                        "andGroup", Map.of("expressions", List.of(
                                Map.of("filter", Map.of("fieldName", "customEvent:salon_id", "stringFilter", Map.of("value", String.valueOf(s.getId()), "matchType", "EXACT"))),
                                Map.of("filter", Map.of("fieldName", "eventName", "inListFilter", Map.of("values", List.of(
                                        "salon_impression", "salon_click", "booking_submit", "booking_confirmed", "booking_completed"
                                ))))
                        ))
                );
                List<com.hairapy.services.GaReportService.Row> rows = gaReportService.runReport(
                        "30daysAgo", "today",
                        List.of("eventName"),
                        List.of("eventCount"),
                        10, null, filter);
                Map<String, Long> counts = new HashMap<>();
                for (com.hairapy.services.GaReportService.Row r : rows) {
                    counts.put(r.dims().get(0), Math.round(r.metrics().get(0)));
                }
                return new SalonOwnerInsightsResponse.SalonFunnel(
                        counts.getOrDefault("salon_impression", 0L),
                        counts.getOrDefault("salon_click", 0L),
                        counts.getOrDefault("booking_submit", 0L),
                        counts.getOrDefault("booking_confirmed", 0L),
                        counts.getOrDefault("booking_completed", 0L)
                );
            } catch (Exception e) {
                log.warn("Lỗi khi lấy funnel từ GA4: {}", e.getMessage());
            }
        }

        // Fallback DB
        long bookingSubmit = bookingRequestRepository.countBySalonId(s.getId());
        long confirmed = bookingRequestRepository.countBySalonIdAndStatus(s.getId(), BookingStatus.CONFIRMED)
                + bookingRequestRepository.countBySalonIdAndStatus(s.getId(), BookingStatus.COMPLETED);
        long completed = bookingRequestRepository.countBySalonIdAndStatus(s.getId(), BookingStatus.COMPLETED);
        long click = s.getViewCount();
        // Không có GA thì không biết lượt hiển thị thật -> trả null (FE hiện "—"), KHÔNG ước lượng/bịa số
        return new SalonOwnerInsightsResponse.SalonFunnel(null, click, bookingSubmit, confirmed, completed);
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
