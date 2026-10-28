package com.hairapy.schedulers;

import com.hairapy.models.BookingRequest;
import com.hairapy.models.BookingStatus;
import com.hairapy.repositories.BookingRequestRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Scheduler quét mỗi giờ (theo giờ Việt Nam) để tự động huỷ các yêu cầu đặt lịch
 * ở trạng thái PENDING nhưng đã qua thời gian hẹn mà salon chưa phản hồi.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class BookingExpiryScheduler {

    private final BookingRequestRepository bookingRequestRepository;

    @Scheduled(cron = "0 0 * * * *", zone = "Asia/Ho_Chi_Minh")
    @Transactional
    public void expirePendingBookings() {
        LocalDateTime now = LocalDateTime.now();
        // preferredTime lưu theo giờ VN (người dùng chọn trên trình duyệt) → so với giờ VN, không phải giờ server
        List<BookingRequest> expired = bookingRequestRepository.findByStatusAndPreferredTimeBefore(
                BookingStatus.PENDING, com.hairapy.utils.VnTime.nowVn());
        if (expired.isEmpty()) {
            return;
        }

        for (BookingRequest b : expired) {
            b.setStatus(BookingStatus.CANCELLED);
            b.setSalonNote("Salon chưa phản hồi trước giờ hẹn.");
            b.setUpdatedAt(now);
        }

        bookingRequestRepository.saveAll(expired);
        log.info("Đã tự động huỷ {} yêu cầu đặt lịch PENDING quá hạn giờ hẹn", expired.size());
    }
}
