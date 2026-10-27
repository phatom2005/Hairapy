package com.hairapy.controllers;

import com.hairapy.dto.booking.CreateBookingRequest;
import com.hairapy.dto.booking.MyBookingResponse;
import com.hairapy.models.*;
import com.hairapy.repositories.BookingRequestRepository;
import com.hairapy.repositories.HairstyleCatalogRepository;
import com.hairapy.repositories.SalonRepository;
import com.hairapy.repositories.SwapHistoryRepository;
import com.hairapy.services.EmailService;
import com.hairapy.services.UsageService;
import com.hairapy.utils.VnTime;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Controller cho khách đặt lịch làm tóc tại salon đối tác.
 * Mọi endpoint đều yêu cầu đăng nhập (được bảo vệ bởi Spring Security).
 */
@Slf4j
@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingRequestRepository bookingRequestRepository;
    private final SalonRepository salonRepository;
    private final HairstyleCatalogRepository hairstyleCatalogRepository;
    private final SwapHistoryRepository swapHistoryRepository;
    private final UsageService usageService;
    private final EmailService emailService;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    /**
     * Gửi yêu cầu đặt lịch tới salon đối tác.
     */
    @PostMapping
    public ResponseEntity<?> createBooking(@RequestBody CreateBookingRequest request) {
        User currentUser = usageService.getCurrentUser();
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "error", "Vui lòng đăng nhập để gửi yêu cầu đặt lịch."
            ));
        }

        // 1. Kiểm tra sự đồng ý chia sẻ thông tin
        if (!Boolean.TRUE.equals(request.consent())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "error", "Bạn cần đồng ý chia sẻ ảnh thử tóc, dáng mặt và số điện thoại với salon để được tư vấn."
            ));
        }

        // 2. Kiểm tra salon
        if (request.salonId() == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "error", "Vui lòng chọn salon."
            ));
        }
        Salon salon = salonRepository.findById(request.salonId()).orElse(null);
        if (salon == null || !salon.isActive()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                    "error", "Không tìm thấy salon yêu cầu."
            ));
        }
        if (!salon.isPartnerActive()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "error", "Salon này chưa nhận đặt lịch online, vui lòng gọi điện trực tiếp."
            ));
        }

        // 3. Kiểm tra preferredTime [now + 1h, now + 30d]
        LocalDateTime now = LocalDateTime.now();
        if (request.preferredTime() == null
                || request.preferredTime().isBefore(now.plusHours(1))
                || request.preferredTime().isAfter(now.plusDays(30))) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "error", "Thời gian hẹn phải từ 1 giờ đến tối đa 30 ngày kể từ hiện tại."
            ));
        }

        // 4. Kiểm tra SĐT và tên khách
        if (request.customerPhone() == null || !request.customerPhone().trim().matches("^(0|\\+84)\\d{9,10}$")) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "error", "Số điện thoại không hợp lệ (cần là số điện thoại Việt Nam 10-11 số)."
            ));
        }
        if (request.customerName() == null || request.customerName().trim().length() < 2 || request.customerName().trim().length() > 100) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "error", "Họ tên phải từ 2 đến 100 ký tự."
            ));
        }

        // 5. Kiểm tra quota: tối đa 3 PENDING cùng lúc, tối đa 5 booking/ngày (giờ VN)
        long pendingCount = bookingRequestRepository.countByUserIdAndStatus(currentUser.getId(), BookingStatus.PENDING);
        if (pendingCount >= 3) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of(
                    "error", "Bạn đang có 3 yêu cầu đặt lịch chờ xử lý. Vui lòng đợi salon phản hồi trước khi đặt thêm."
            ));
        }
        long todayCount = bookingRequestRepository.countByUserIdAndCreatedAtAfter(currentUser.getId(), VnTime.startOfTodayVn());
        if (todayCount >= 5) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of(
                    "error", "Bạn đã đạt giới hạn 5 yêu cầu đặt lịch trong ngày hôm nay."
            ));
        }

        // 6. Kiểm tra tryOnImageUrl: chỉ nhận nếu thuộc swap_history của chính user
        String validTryOnImageUrl = null;
        if (request.tryOnImageUrl() != null && !request.tryOnImageUrl().isBlank()) {
            boolean belongsToUser = swapHistoryRepository.existsByUserIdAndImageUrl(currentUser.getId(), request.tryOnImageUrl().trim());
            if (belongsToUser) {
                validTryOnImageUrl = request.tryOnImageUrl().trim();
            } else {
                log.warn("Ảnh tryOnImageUrl không thuộc lịch sử của user ID {}, bỏ qua.", currentUser.getId());
            }
        }

        // 7. Lấy kiểu tóc từ DB nếu có
        HairstyleCatalog hairstyle = null;
        String hairstyleName = null;
        if (request.hairstyleId() != null) {
            hairstyle = hairstyleCatalogRepository.findById(request.hairstyleId()).orElse(null);
            if (hairstyle != null) {
                hairstyleName = hairstyle.getName();
            }
        }

        // 8. Tạo và lưu booking
        BookingRequest booking = BookingRequest.builder()
                .user(currentUser)
                .salon(salon)
                .hairstyleId(request.hairstyleId())
                .hairstyleName(hairstyleName)
                .tryOnImageUrl(validTryOnImageUrl)
                .faceShape(request.faceShape())
                .preferredTime(request.preferredTime())
                .customerName(request.customerName().trim())
                .customerPhone(request.customerPhone().trim())
                .note(request.note())
                .status(BookingStatus.PENDING)
                .createdAt(now)
                .updatedAt(now)
                .build();

        booking = bookingRequestRepository.save(booking);

        // 9. Gửi email thông báo cho chủ salon (best-effort, không gửi SĐT trong email)
        if (salon.getOwner() != null && salon.getOwner().getEmail() != null) {
            String ownerEmail = salon.getOwner().getEmail();
            String subject = "Hairapy - Yêu cầu đặt lịch mới từ " + booking.getCustomerName();
            String portalLink = frontendUrl + "/salon-portal/bookings";
            String html = "<div style=\"font-family:sans-serif;max-width:560px;margin:0 auto\">"
                    + "<h2>Yêu cầu đặt lịch mới từ Hairapy</h2>"
                    + "<p>Khách hàng: <strong>" + booking.getCustomerName() + "</strong></p>"
                    + (hairstyleName != null ? "<p>Kiểu tóc mong muốn: <strong>" + hairstyleName + "</strong></p>" : "")
                    + "<p>Thời gian mong muốn: <strong>" + booking.getPreferredTime() + "</strong></p>"
                    + (booking.getNote() != null && !booking.getNote().isBlank() ? "<p>Ghi chú của khách: " + booking.getNote() + "</p>" : "")
                    + "<p><a href=\"" + portalLink + "\" style=\"display:inline-block;padding:10px 20px;background:#ff4d94;color:#fff;border-radius:20px;text-decoration:none;font-weight:bold\">"
                    + "Xem và xác nhận trong Salon Portal</a></p>"
                    + "<p style=\"color:#666;font-size:13px\">Để bảo vệ quyền riêng tư, số điện thoại khách hàng chỉ hiển thị trong cổng Salon Portal.</p>"
                    + "</div>";
            try {
                emailService.sendBookingNotification(ownerEmail, subject, html);
            } catch (Exception e) {
                log.warn("Không thể gửi email thông báo đặt lịch tới chủ salon {}: {}", ownerEmail, e.getMessage());
            }
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(booking));
    }

    /**
     * Lấy danh sách lịch hẹn của tôi.
     */
    @GetMapping("/my")
    public ResponseEntity<Page<MyBookingResponse>> getMyBookings(
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        User currentUser = usageService.getCurrentUser();
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Page<BookingRequest> page = bookingRequestRepository.findByUserIdOrderByCreatedAtDesc(currentUser.getId(), pageable);
        return ResponseEntity.ok(page.map(this::toResponse));
    }

    /**
     * Huỷ yêu cầu đặt lịch (chỉ khi PENDING hoặc CONFIRMED và chưa qua preferredTime).
     */
    @PutMapping("/{id}/cancel")
    public ResponseEntity<?> cancelBooking(@PathVariable Long id) {
        User currentUser = usageService.getCurrentUser();
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        BookingRequest booking = bookingRequestRepository.findById(id).orElse(null);
        if (booking == null || !booking.getUser().getId().equals(currentUser.getId())) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                    "error", "Không tìm thấy yêu cầu đặt lịch."
            ));
        }

        boolean canCancel = (booking.getStatus() == BookingStatus.PENDING || booking.getStatus() == BookingStatus.CONFIRMED)
                && booking.getPreferredTime().isAfter(LocalDateTime.now());

        if (!canCancel) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "error", "Chỉ có thể huỷ lịch hẹn ở trạng thái chờ/đã xác nhận và chưa đến giờ hẹn."
            ));
        }

        booking.setStatus(BookingStatus.CANCELLED);
        booking.setUpdatedAt(LocalDateTime.now());
        bookingRequestRepository.save(booking);

        return ResponseEntity.ok(toResponse(booking));
    }

    private MyBookingResponse toResponse(BookingRequest b) {
        Salon s = b.getSalon();
        return new MyBookingResponse(
                b.getId(),
                s.getId(),
                s.getName(),
                s.getAddress(),
                s.getPhone(),
                b.getHairstyleId(),
                b.getHairstyleName(),
                b.getTryOnImageUrl(),
                b.getFaceShape(),
                b.getPreferredTime(),
                b.getCustomerName(),
                b.getCustomerPhone(),
                b.getNote(),
                b.getStatus(),
                b.getSalonNote(),
                b.getCreatedAt()
        );
    }
}
