package com.hairapy.controllers;

import com.hairapy.models.SwapHistory;
import com.hairapy.models.User;
import com.hairapy.repositories.SwapHistoryRepository;
import com.hairapy.services.SwapHistoryService;
import com.hairapy.services.UsageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * API lịch sử ảnh đã thử tóc của người dùng hiện tại.
 */
@RestController
@RequestMapping("/api/profile/swaps")
@RequiredArgsConstructor
public class SwapHistoryController {

    private final SwapHistoryRepository swapHistoryRepository;
    private final SwapHistoryService swapHistoryService;
    private final UsageService usageService;
    private final com.hairapy.services.SubscriptionService subscriptionService;

    // composited thêm ở CUỐI (Phase 7.2) — mobile cũ bỏ qua field lạ nên vẫn chạy
    public record SwapHistoryItem(Long id, Long hairstyleId, String hairstyleName, String imageUrl, String createdAt,
                                  boolean composited) {
        public static SwapHistoryItem from(SwapHistory s) {
            return new SwapHistoryItem(s.getId(), s.getHairstyleId(), s.getHairstyleName(), s.getImageUrl(),
                    s.getCreatedAt() != null ? s.getCreatedAt().toString() : null, s.isComposited());
        }
    }

    @GetMapping
    public ResponseEntity<?> list() {
        User user = usageService.getCurrentUser();
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Vui lòng đăng nhập."));
        }
        List<SwapHistoryItem> items = swapHistoryRepository.findByUserOrderByCreatedAtDesc(user)
                .stream().map(SwapHistoryItem::from).toList();
        return ResponseEntity.ok(Map.of("swaps", items, "maxItems", SwapHistoryService.MAX_PER_USER));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        User user = usageService.getCurrentUser();
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Vui lòng đăng nhập."));
        }
        if (!swapHistoryService.deleteOwned(id, user)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Không tìm thấy ảnh."));
        }
        return ResponseEntity.ok(Map.of("success", true));
    }

    /**
     * Phase 7.2: web gửi ảnh đã ghép (giữ mặt + trang phục gốc, chỉ lấy tóc từ AI) để thay ảnh trong lịch sử.
     * Free vẫn bị gắn watermark ở server (web ghép từ ảnh AI gốc chưa watermark).
     * Endpoint: PUT /api/profile/swaps/{id}/composite (multipart "image")
     */
    @PutMapping(value = "/{id}/composite", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadComposite(@PathVariable Long id,
                                             @RequestParam("image") org.springframework.web.multipart.MultipartFile image) {
        User user = usageService.getCurrentUser();
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Vui lòng đăng nhập."));
        }
        if (image == null || image.isEmpty() || image.getSize() > MAX_COMPOSITE_BYTES
                || !com.hairapy.utils.ImageValidator.isSupportedImage(image)) {
            return ResponseEntity.badRequest().body(Map.of("error", com.hairapy.utils.ImageValidator.INVALID_MESSAGE));
        }
        boolean paid = user.getRole() == com.hairapy.models.Role.ADMIN
                || user.getRole() == com.hairapy.models.Role.TESTER
                || subscriptionService.isPaidUser(user.getId());
        try {
            SwapHistory saved = swapHistoryService.replaceWithComposite(id, user, image.getBytes(), !paid);
            return ResponseEntity.ok(SwapHistoryItem.from(saved));
        } catch (java.util.NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Không tìm thấy ảnh."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (java.io.IOException e) {
            return ResponseEntity.badRequest().body(Map.of("error", com.hairapy.utils.ImageValidator.INVALID_MESSAGE));
        }
    }

    private static final long MAX_COMPOSITE_BYTES = 5L * 1024 * 1024;
}
