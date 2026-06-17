package com.hairapy.controllers;

import com.hairapy.services.HairSwapService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

/**
 * Controller cung cấp các API đổi kiểu tóc (Hair Swap) sử dụng AI.
 */
@Slf4j
@RestController
@RequestMapping("/api/swap")
@RequiredArgsConstructor
public class HairSwapController {

    private final HairSwapService hairSwapService;

    /**
     * API thực hiện ghép kiểu tóc mới lên khuôn mặt của ảnh tải lên.
     * Endpoint: POST /api/swap/try
     *
     * @param image file hình ảnh khuôn mặt người dùng.
     * @param hairType mã số kiểu tóc muốn thử nghiệm.
     * @return ResponseEntity chứa kết quả ảnh base64 hoặc URL ảnh đã ghép.
     */
    @PostMapping("/try")
    public ResponseEntity<?> tryHairstyle(
            @RequestParam("image") MultipartFile image,
            @RequestParam("hairType") int hairType) {
        
        log.info("Nhận yêu cầu thử kiểu tóc mới: hairType={}", hairType);
        
        try {
            String resultImage = hairSwapService.swapHairstyle(image, hairType);
            return ResponseEntity.ok(Map.of("image", resultImage));
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
