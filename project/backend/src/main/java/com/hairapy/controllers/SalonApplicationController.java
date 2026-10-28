package com.hairapy.controllers;

import com.hairapy.dto.salonapplication.CreateSalonApplicationRequest;
import com.hairapy.dto.salonapplication.SalonApplicationResponse;
import com.hairapy.models.ApplicationStatus;
import com.hairapy.models.Role;
import com.hairapy.models.SalonApplication;
import com.hairapy.models.User;
import com.hairapy.repositories.SalonApplicationRepository;
import com.hairapy.services.UsageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Controller cho người dùng gửi đơn đăng ký làm salon đối tác.
 */
@Slf4j
@RestController
@RequestMapping("/api/salon-applications")
@RequiredArgsConstructor
public class SalonApplicationController {

    private final SalonApplicationRepository salonApplicationRepository;
    private final UsageService usageService;

    /**
     * Nộp đơn đăng ký làm salon đối tác.
     */
    @PostMapping
    public ResponseEntity<?> submitApplication(@RequestBody CreateSalonApplicationRequest request) {
        User currentUser = usageService.getCurrentUser();
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        if (currentUser.getRole() == Role.SALON_OWNER) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "error", "Tài khoản của bạn đã là chủ salon đối tác."
            ));
        }

        // Tối đa 1 đơn PENDING
        if (salonApplicationRepository.findFirstByUserIdAndStatus(currentUser.getId(), ApplicationStatus.PENDING).isPresent()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "error", "Bạn đang có 1 đơn đăng ký đang chờ duyệt. Vui lòng đợi quản trị viên phản hồi."
            ));
        }

        if (request.salonName() == null || request.salonName().trim().length() < 2 || request.salonName().trim().length() > 150) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "error", "Tên salon phải từ 2 đến 150 ký tự."
            ));
        }

        if (request.address() == null || request.address().trim().length() < 2 || request.address().trim().length() > 300) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "error", "Địa chỉ phải từ 2 đến 300 ký tự."
            ));
        }

        if (request.district() == null || request.district().trim().isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "error", "Vui lòng chọn quận/huyện."
            ));
        }

        if (request.phone() == null || !request.phone().trim().matches("^(0|\\+84)\\d{9,10}$")) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "error", "Số điện thoại không hợp lệ (cần là số điện thoại Việt Nam 10-11 số)."
            ));
        }

        SalonApplication application = SalonApplication.builder()
                .user(currentUser)
                .salonName(request.salonName().trim())
                .address(request.address().trim())
                .district(request.district().trim())
                .phone(request.phone().trim())
                .message(request.message() != null ? request.message().trim() : null)
                .status(ApplicationStatus.PENDING)
                .createdAt(LocalDateTime.now())
                .build();

        application = salonApplicationRepository.save(application);

        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(application));
    }

    /**
     * Lấy danh sách đơn đăng ký của người dùng hiện tại.
     */
    @GetMapping("/my")
    public ResponseEntity<List<SalonApplicationResponse>> getMyApplications() {
        User currentUser = usageService.getCurrentUser();
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        List<SalonApplication> list = salonApplicationRepository.findByUserIdOrderByCreatedAtDesc(currentUser.getId());
        return ResponseEntity.ok(list.stream().map(this::toResponse).toList());
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
}
