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

    public record SwapHistoryItem(Long id, Long hairstyleId, String hairstyleName, String imageUrl, String createdAt) {
        static SwapHistoryItem from(SwapHistory s) {
            return new SwapHistoryItem(s.getId(), s.getHairstyleId(), s.getHairstyleName(), s.getImageUrl(),
                    s.getCreatedAt() != null ? s.getCreatedAt().toString() : null);
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
}
