package com.hairapy.controllers.admin;

import com.hairapy.dto.admin.AdminBookingResponse;
import com.hairapy.models.BookingRequest;
import com.hairapy.models.BookingStatus;
import com.hairapy.repositories.BookingRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Controller cho Admin theo dõi danh sách lịch hẹn toàn hệ thống (chỉ đọc).
 */
@RestController
@RequestMapping("/api/admin/bookings")
@RequiredArgsConstructor
public class AdminBookingController {

    private final BookingRequestRepository bookingRequestRepository;

    @GetMapping
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public ResponseEntity<Page<AdminBookingResponse>> getBookings(
            @RequestParam(required = false) BookingStatus status,
            @RequestParam(required = false) Long salonId,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        Page<BookingRequest> page;
        if (salonId != null && status != null) {
            page = bookingRequestRepository.findBySalonIdAndStatusOrderByCreatedAtDesc(salonId, status, pageable);
        } else if (salonId != null) {
            page = bookingRequestRepository.findBySalonIdOrderByCreatedAtDesc(salonId, pageable);
        } else if (status != null) {
            page = bookingRequestRepository.findByStatusOrderByCreatedAtDesc(status, pageable);
        } else {
            page = bookingRequestRepository.findAllByOrderByCreatedAtDesc(pageable);
        }

        return ResponseEntity.ok(page.map(this::toResponse));
    }

    private AdminBookingResponse toResponse(BookingRequest b) {
        return new AdminBookingResponse(
                b.getId(),
                b.getUser().getId(),
                b.getUser().getEmail(),
                b.getSalon().getId(),
                b.getSalon().getName(),
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
                b.getCreatedAt(),
                b.getUpdatedAt()
        );
    }
}
