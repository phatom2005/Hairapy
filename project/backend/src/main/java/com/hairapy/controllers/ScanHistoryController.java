package com.hairapy.controllers;

import com.hairapy.dto.ScanHistoryResponse;
import com.hairapy.exceptions.QuotaExceededException;
import com.hairapy.models.ScanHistory;
import com.hairapy.models.User;
import com.hairapy.repositories.ScanHistoryRepository;
import com.hairapy.services.CloudinaryService;
import com.hairapy.services.UsageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

/**
 * Controller xử lý các API liên quan đến lịch sử quét khuôn mặt bằng AI.
 */
@Slf4j
@RestController
@RequestMapping("/api/profile/scans")
@RequiredArgsConstructor
public class ScanHistoryController {

    private final ScanHistoryRepository scanHistoryRepository;
    private final CloudinaryService cloudinaryService;
    private final UsageService usageService;

    /**
     * Lấy lịch sử quét và tổng số lượt quét của người dùng hiện tại.
     */
    @GetMapping
    public ResponseEntity<?> getScanHistory() {
        User currentUser = usageService.getCurrentUser();
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Vui lòng đăng nhập."));
        }
        List<ScanHistoryResponse> history = scanHistoryRepository.findByUserOrderByCreatedAtDesc(currentUser)
                .stream().map(ScanHistoryResponse::from).toList();
        long count = scanHistoryRepository.countByUser(currentUser);
        return ResponseEntity.ok(Map.of(
                "scans", history,
                "totalScans", count
        ));
    }

    /**
     * Lưu một lượt quét khuôn mặt mới, tải ảnh gốc lên Cloudinary.
     */
    @PostMapping
    public ResponseEntity<?> recordScan(
            @RequestParam("faceShape") String faceShape,
            @RequestParam(value = "hairType", required = false) String hairType,
            @RequestParam("image") MultipartFile image) {

        User currentUser = usageService.getCurrentUser();
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Vui lòng đăng nhập."));
        }

        com.hairapy.models.UsageHistory reservation = null;
        try {
            reservation = usageService.reserveUsage(currentUser, "FACE_SCAN");

            log.info("Lưu lịch sử quét khuôn mặt cho user: {}, faceShape: {}", currentUser.getEmail(), faceShape);

            String cloudinaryUrl = cloudinaryService.uploadFile(image, "scans");

            ScanHistory history = ScanHistory.builder()
                    .user(currentUser)
                    .faceShape(faceShape)
                    .hairType(hairType != null ? hairType : "Bình thường")
                    .imageUrl(cloudinaryUrl)
                    .build();

            scanHistoryRepository.save(history);

            return ResponseEntity.ok(ScanHistoryResponse.from(history));
        } catch (QuotaExceededException e) {
            log.warn("User {} vượt quá quota FACE_SCAN: {}", currentUser.getEmail(), e.getMessage());
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of(
                    "error", "Bạn đã hết lượt quét khuôn mặt hôm nay.",
                    "remaining", 0,
                    "limit", e.getLimit()
            ));
        } catch (Exception e) {
            usageService.releaseUsage(reservation); // upload/save thất bại sau khi đã reserve — hoàn lượt
            log.error("Lỗi khi lưu lịch sử quét khuôn mặt:", e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "error", "Không thể lưu lịch sử quét khuôn mặt."
            ));
        }
    }
}
