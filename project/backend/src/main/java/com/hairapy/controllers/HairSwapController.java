package com.hairapy.controllers;

import com.hairapy.exceptions.AiTimeoutException;
import com.hairapy.exceptions.QuotaExceededException;
import com.hairapy.exceptions.PremiumRequiredException;
import com.hairapy.models.User;
import com.hairapy.services.HairSwapService;
import com.hairapy.services.UsageService;
import com.hairapy.services.SubscriptionService;
import com.hairapy.repositories.HairstyleCatalogRepository;
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
    private final SubscriptionService subscriptionService;
    private final HairstyleCatalogRepository hairstyleCatalogRepository;

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
            @RequestParam("hairStyle") String hairStyle,
            @RequestParam(value = "hairstyleId", required = false) Long hairstyleId) {

        log.info("Nhận yêu cầu thử kiểu tóc Pro: hairStyle={}, hairstyleId={}", hairStyle, hairstyleId);

        User currentUser = usageService.getCurrentUser();
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "error", "Yêu cầu không hợp lệ. Vui lòng đăng nhập."
            ));
        }

        boolean isPaidUser = subscriptionService.isPaidUser(currentUser.getId());
        com.hairapy.models.UsageHistory reservation = null;

        try {
            // 0. Chặn Free user thử style premiumOnly
            if (hairstyleId != null) {
                hairstyleCatalogRepository.findById(hairstyleId).ifPresent(style -> {
                    if (style.isPremiumOnly() && !isPaidUser) {
                        throw new PremiumRequiredException(
                                "Kiểu tóc này chỉ dành cho gói Premium. Nâng cấp để thử ngay!");
                    }
                });
            }

            // 1. Kiểm tra + ghi nhận lượt dùng ngay (atomic) — thay cho checkQuota() tách rời trước đây
            reservation = usageService.reserveUsage(currentUser, "HAIR_SWAP");

            // 2. Thực hiện đổi kiểu tóc thông qua AILab Pro API (async)
            String resultImage = hairSwapService.swapHairstyle(image, hairStyle, isPaidUser);

            return ResponseEntity.ok(Map.of("image", resultImage));
        } catch (PremiumRequiredException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "error", e.getMessage(),
                    "requiresPremium", true
            ));
        } catch (QuotaExceededException e) {
            log.warn("User {} vượt quá quota HAIR_SWAP: {}", currentUser.getEmail(), e.getMessage());
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of(
                    "error", "Bạn đã hết lượt thử kiểu tóc hôm nay.",
                    "remaining", 0,
                    "limit", e.getLimit()
            ));
        } catch (AiTimeoutException e) {
            usageService.releaseUsage(reservation); // đã reserve trước khi gọi AI — phải hoàn lượt tường minh
            log.warn("Yêu cầu AI timeout cho user {}: {}", currentUser.getEmail(), e.getMessage());
            return ResponseEntity.status(HttpStatus.GATEWAY_TIMEOUT).body(Map.of(
                    "error", "AI xử lý quá lâu. Lượt của bạn đã được hoàn lại, vui lòng thử lại.",
                    "refunded", true
            ));
        } catch (IllegalArgumentException e) {
            usageService.releaseUsage(reservation);
            log.warn("Yêu cầu không hợp lệ: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            usageService.releaseUsage(reservation);
            log.error("Lỗi hệ thống khi xử lý thử kiểu tóc:", e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "error", "Không thể xử lý ảnh bằng AI. Vui lòng thử lại sau."
            ));
        }
    }
}
