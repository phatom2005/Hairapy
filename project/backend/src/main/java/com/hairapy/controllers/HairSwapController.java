package com.hairapy.controllers;

import com.hairapy.exceptions.AiTimeoutException;
import com.hairapy.exceptions.QuotaExceededException;
import com.hairapy.models.User;
import com.hairapy.services.HairSwapService;
import com.hairapy.services.UsageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

/**
 * Controller cung cấp các API đổi kiểu tóc (Hair Swap) sử dụng AI Pro API.
 * Pro API chỉ thay kiểu tóc, không thay đổi khuôn mặt.
 */
@Slf4j
@RestController
@RequestMapping("/api/swap")
@RequiredArgsConstructor
public class HairSwapController {

    private final HairSwapService hairSwapService;
    private final UsageService usageService;

    /**
     * API thực hiện ghép kiểu tóc mới lên ảnh người dùng (Pro API — hair-only).
     * Endpoint: POST /api/swap/try
     *
     * @param image     file hình ảnh khuôn mặt người dùng.
     * @param hairStyle mã kiểu tóc Pro API (ví dụ: "BuzzCut", "LongCurly").
     * @return ResponseEntity chứa URL ảnh kết quả.
     */
    @PostMapping("/try")
    public ResponseEntity<?> tryHairstyle(
            @RequestParam("image") MultipartFile image,
            @RequestParam("hairStyle") String hairStyle) {

        log.info("Nhận yêu cầu thử kiểu tóc Pro: hairStyle={}", hairStyle);

        User currentUser = usageService.getCurrentUser();
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "error", "Yêu cầu không hợp lệ. Vui lòng đăng nhập."
            ));
        }

        try {
            // 1. Kiểm tra hạn mức sử dụng hôm nay trước khi gọi API
            usageService.checkQuota(currentUser, "HAIR_SWAP");

            // 2. Thực hiện đổi kiểu tóc thông qua AILab Pro API (async)
            String resultImage = hairSwapService.swapHairstyle(image, hairStyle);

            // 3. Ghi lại lịch sử sử dụng sau khi thành công
            usageService.recordUsage(currentUser, "HAIR_SWAP");

            return ResponseEntity.ok(Map.of("image", resultImage));
        } catch (QuotaExceededException e) {
            log.warn("User {} vượt quá quota HAIR_SWAP: {}", currentUser.getEmail(), e.getMessage());
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of(
                    "error", "Bạn đã hết lượt thử kiểu tóc hôm nay.",
                    "remaining", 0,
                    "limit", e.getLimit()
            ));
        } catch (AiTimeoutException e) {
            log.warn("Yêu cầu AI timeout cho user {}: {}", currentUser.getEmail(), e.getMessage());
            return ResponseEntity.status(HttpStatus.GATEWAY_TIMEOUT).body(Map.of(
                    "error", "AI xử lý quá lâu. Lượt của bạn đã được hoàn lại, vui lòng thử lại.",
                    "refunded", true
            ));
        } catch (IllegalArgumentException e) {
            log.warn("Yêu cầu không hợp lệ: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("Lỗi hệ thống khi xử lý thử kiểu tóc:", e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "error", "Không thể xử lý ảnh bằng AI. Vui lòng thử lại sau.",
                    "details", e.getMessage()
            ));
        }
    }
}
