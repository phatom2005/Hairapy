package com.hairapy.controllers;

import com.hairapy.dto.stylist.StylistConsultRequest;
import com.hairapy.dto.stylist.StylistConsultResponse;
import com.hairapy.exceptions.AiTimeoutException;
import com.hairapy.exceptions.PremiumRequiredException;
import com.hairapy.exceptions.QuotaExceededException;
import com.hairapy.models.HairstyleCatalog;
import com.hairapy.models.User;
import com.hairapy.repositories.HairstyleCatalogRepository;
import com.hairapy.services.AiStylistService;
import com.hairapy.services.SubscriptionService;
import com.hairapy.services.UsageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Controller cho tính năng "AI Stylist" — tư vấn kiểu tóc cá nhân hoá bằng LLM,
 * CHỈ dành cho user Premium (khớp bảng tier trong CLAUDE.md).
 *
 * Khác với Hair Swap (xử lý ảnh, cần submit/poll async), gọi LLM chỉ mất
 * vài giây nên xử lý ĐỒNG BỘ trong 1 request — không cần task store.
 *
 * Endpoint hoàn toàn mới (POST /api/stylist/consult), không đụng tới bất kỳ
 * controller/route nào khác — an toàn để test độc lập.
 */
@Slf4j
@RestController
@RequestMapping("/api/stylist")
@RequiredArgsConstructor
public class AiStylistController {

    private final AiStylistService aiStylistService;
    private final UsageService usageService;
    private final SubscriptionService subscriptionService;
    private final HairstyleCatalogRepository hairstyleCatalogRepository;

    @PostMapping("/consult")
    public ResponseEntity<?> consult(@RequestBody StylistConsultRequest request) {
        User currentUser = usageService.getCurrentUser();
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "error", "Yêu cầu không hợp lệ. Vui lòng đăng nhập."
            ));
        }

        com.hairapy.models.UsageHistory reservation = null;
        try {
            // 0. Chan Free/Guest ngay tu dau -- AI Stylist la quyen loi rieng cua
            // Premium, khong phai chi la "gioi han thap hon" nhu Face Scan/Hair Swap.
            boolean isPaidUser = subscriptionService.isPaidUser(currentUser.getId());
            if (!isPaidUser) {
                throw new PremiumRequiredException(
                        "AI Stylist là tính năng dành riêng cho gói Premium. Nâng cấp để được tư vấn 1:1 cùng AI!");
            }

            // 1. Kiem tra + ghi nhan luot dung ngay (atomic) -- tai su dung dung
            // pattern reserveUsage()/releaseUsage() da co, tranh trung lap logic quota.
            reservation = usageService.reserveUsage(currentUser, "AI_STYLIST");

            // 2. Lay ngu canh optional (kieu toc dang xem) neu FE co truyen hairstyleId
            String currentStyleName = null;
            if (request.hairstyleId() != null) {
                currentStyleName = hairstyleCatalogRepository.findById(request.hairstyleId())
                        .map(HairstyleCatalog::getName)
                        .orElse(null);
            }

            // 3. Goi LLM
            String answer = aiStylistService.consult(
                    request.question(), request.faceShape(), request.hairType(), currentStyleName);

            return ResponseEntity.ok(new StylistConsultResponse(answer));
        } catch (PremiumRequiredException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "error", e.getMessage(),
                    "requiresPremium", true
            ));
        } catch (QuotaExceededException e) {
            log.warn("User {} vượt quá quota AI_STYLIST: {}", currentUser.getEmail(), e.getMessage());
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of(
                    "error", "Bạn đã hết lượt tư vấn AI Stylist hôm nay.",
                    "remaining", 0,
                    "limit", e.getLimit()
            ));
        } catch (AiTimeoutException e) {
            usageService.releaseUsage(reservation);
            log.warn("AI Stylist timeout cho user {}: {}", currentUser.getEmail(), e.getMessage());
            return ResponseEntity.status(HttpStatus.GATEWAY_TIMEOUT).body(Map.of(
                    "error", "AI xử lý quá lâu. Lượt của bạn đã được hoàn lại, vui lòng thử lại.",
                    "refunded", true
            ));
        } catch (IllegalArgumentException e) {
            usageService.releaseUsage(reservation);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            usageService.releaseUsage(reservation);
            log.error("Lỗi hệ thống khi tư vấn AI Stylist:", e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "error", "AI Stylist đang gặp sự cố. Vui lòng thử lại sau."
            ));
        }
    }
}
