package com.hairapy.controllers.admin;

import com.hairapy.dto.admin.ApproveSalonApplicationRequest;
import com.hairapy.dto.admin.RejectSalonApplicationRequest;
import com.hairapy.dto.salonapplication.SalonApplicationResponse;
import com.hairapy.models.ApplicationStatus;
import com.hairapy.models.Role;
import com.hairapy.models.Salon;
import com.hairapy.models.SalonApplication;
import com.hairapy.models.User;
import com.hairapy.repositories.SalonApplicationRepository;
import com.hairapy.repositories.SalonRepository;
import com.hairapy.repositories.UserRepository;
import com.hairapy.services.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Controller dành cho Admin quản lý và duyệt các đơn đăng ký làm salon đối tác.
 */
@Slf4j
@RestController
@RequestMapping("/api/admin/salon-applications")
@RequiredArgsConstructor
public class AdminSalonApplicationController {

    private final SalonApplicationRepository salonApplicationRepository;
    private final SalonRepository salonRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    /**
     * Lấy danh sách đơn đăng ký làm đối tác, hỗ trợ lọc theo trạng thái.
     */
    @GetMapping
    public ResponseEntity<Page<SalonApplicationResponse>> getApplications(
            @RequestParam(required = false) ApplicationStatus status,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        Page<SalonApplication> page;
        if (status != null) {
            page = salonApplicationRepository.findByStatusOrderByCreatedAtDesc(status, pageable);
        } else {
            page = salonApplicationRepository.findAllByOrderByCreatedAtDesc(pageable);
        }
        return ResponseEntity.ok(page.map(this::toResponse));
    }

    /**
     * Duyệt đơn đăng ký: tạo salon mới hoặc gán vào salon có sẵn, nâng role thành SALON_OWNER,
     * tặng 30 ngày dùng thử Gói Đối tác.
     */
    @PostMapping("/{id}/approve")
    @Transactional
    public ResponseEntity<?> approveApplication(
            @PathVariable Long id,
            @RequestBody(required = false) ApproveSalonApplicationRequest request
    ) {
        SalonApplication app = salonApplicationRepository.findById(id).orElse(null);
        if (app == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Không tìm thấy đơn đăng ký."));
        }
        if (app.getStatus() != ApplicationStatus.PENDING) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "Đơn đăng ký này đã được xử lý trước đó."));
        }

        User applicant = app.getUser();
        // Không hạ quyền tài khoản quản trị/tester thành SALON_OWNER (mất quyền admin)
        if (applicant.getRole() == Role.ADMIN || applicant.getRole() == Role.TESTER) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "error", "Tài khoản Admin/Tester không thể làm chủ salon. Hãy dùng một tài khoản người dùng thường."));
        }
        // Ràng buộc 1 user - 1 salon: check ở service/controller
        if (salonRepository.existsByOwnerId(applicant.getId())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "Người dùng này đã là chủ của một salon khác."));
        }

        Salon salon;
        if (request != null && request.salonId() != null) {
            salon = salonRepository.findById(request.salonId()).orElse(null);
            if (salon == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Không tìm thấy salon được chỉ định."));
            }
            if (salon.getOwner() != null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "Salon được chỉ định đã có chủ sở hữu."));
            }
            salon.setOwner(applicant);
        } else {
            salon = Salon.builder()
                    .name(app.getSalonName())
                    .address(app.getAddress())
                    .district(app.getDistrict())
                    .phone(app.getPhone())
                    .serviceTypes("Cắt tóc,Tạo kiểu")
                    .priceFrom(0)
                    .rating(5.0)
                    .verified(true)
                    .imageUrl("https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&auto=format&fit=crop&q=80")
                    .owner(applicant)
                    .active(true)
                    .viewCount(0L)
                    .build();
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime base = (salon.getPartnerUntil() != null && salon.getPartnerUntil().isAfter(now))
                ? salon.getPartnerUntil() : now;
        salon.setPartnerUntil(base.plusDays(30)); // 30 ngày dùng thử
        salon = salonRepository.save(salon);

        applicant.setRole(Role.SALON_OWNER);
        userRepository.save(applicant);

        app.setStatus(ApplicationStatus.APPROVED);
        app = salonApplicationRepository.save(app);

        // Gửi email thông báo cho người đăng ký (best-effort)
        String subject = "Hairapy - Đơn đăng ký salon đối tác của bạn đã được duyệt!";
        String portalLink = frontendUrl + "/salon-portal";
        String html = "<div style=\"font-family:sans-serif;max-width:560px;margin:0 auto\">"
                + "<h2>Chúc mừng bạn đã trở thành Salon đối tác của Hairapy!</h2>"
                + "<p>Đơn đăng ký cho salon <strong>" + esc(salon.getName()) + "</strong> đã được duyệt.</p>"
                + "<p>Bạn được tặng <strong>30 ngày dùng thử Gói Đối tác</strong> miễn phí để nhận yêu cầu đặt lịch từ khách hàng.</p>"
                + "<p><a href=\"" + portalLink + "\" style=\"display:inline-block;padding:12px 24px;background:#ff4d94;color:#fff;border-radius:24px;text-decoration:none;font-weight:bold\">"
                + "Truy cập Cổng Quản lý Salon</a></p>"
                + "</div>";
        try {
            emailService.sendApplicationNotification(applicant.getEmail(), subject, html);
        } catch (Exception e) {
            log.warn("Không thể gửi email duyệt đơn tới {}: {}", applicant.getEmail(), e.getMessage());
        }

        return ResponseEntity.ok(toResponse(app));
    }

    /**
     * Từ chối đơn đăng ký.
     */
    @PostMapping("/{id}/reject")
    @Transactional
    public ResponseEntity<?> rejectApplication(
            @PathVariable Long id,
            @RequestBody RejectSalonApplicationRequest request
    ) {
        SalonApplication app = salonApplicationRepository.findById(id).orElse(null);
        if (app == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Không tìm thấy đơn đăng ký."));
        }
        if (app.getStatus() != ApplicationStatus.PENDING) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "Đơn đăng ký này đã được xử lý trước đó."));
        }

        if (request.adminNote() == null || request.adminNote().trim().isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "Vui lòng nhập lý do từ chối."));
        }

        app.setStatus(ApplicationStatus.REJECTED);
        app.setAdminNote(request.adminNote().trim());
        app = salonApplicationRepository.save(app);

        // Gửi email từ chối cho người nộp đơn (best-effort)
        String subject = "Hairapy - Cập nhật trạng thái đơn đăng ký salon đối tác";
        String html = "<div style=\"font-family:sans-serif;max-width:560px;margin:0 auto\">"
                + "<h2>Thông báo từ Hairapy</h2>"
                + "<p>Rất tiếc, đơn đăng ký làm salon đối tác cho <strong>" + esc(app.getSalonName()) + "</strong> chưa được phê duyệt vào thời điểm này.</p>"
                + "<p>Lý do từ ban quản trị: " + esc(app.getAdminNote()) + "</p>"
                + "<p>Bạn có thể liên hệ bộ phận hỗ trợ hoặc chỉnh sửa thông tin để nộp lại sau.</p>"
                + "</div>";
        try {
            emailService.sendApplicationNotification(app.getUser().getEmail(), subject, html);
        } catch (Exception e) {
            log.warn("Không thể gửi email từ chối đơn tới {}: {}", app.getUser().getEmail(), e.getMessage());
        }

        return ResponseEntity.ok(toResponse(app));
    }

    private SalonApplicationResponse toResponse(SalonApplication a) {
        return new SalonApplicationResponse(
                a.getId(),
                a.getUser().getId(),
                a.getUser().getEmail(),
                a.getSalonName(),
                a.getAddress(),
                a.getDistrict(),
                a.getPhone(),
                a.getMessage(),
                a.getStatus(),
                a.getAdminNote(),
                a.getCreatedAt()
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
