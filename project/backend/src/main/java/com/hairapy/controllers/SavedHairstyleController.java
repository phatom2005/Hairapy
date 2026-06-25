package com.hairapy.controllers;

import com.hairapy.models.HairstyleCatalog;
import com.hairapy.models.SavedHairstyle;
import com.hairapy.models.User;
import com.hairapy.repositories.HairstyleCatalogRepository;
import com.hairapy.repositories.SavedHairstyleRepository;
import com.hairapy.services.UsageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Controller xử lý các API liên quan đến kiểu tóc yêu thích của người dùng.
 */
@Slf4j
@RestController
@RequestMapping("/api/profile/saved-styles")
@RequiredArgsConstructor
public class SavedHairstyleController {

    private final SavedHairstyleRepository savedHairstyleRepository;
    private final HairstyleCatalogRepository hairstyleCatalogRepository;
    private final UsageService usageService;

    /**
     * Lấy danh sách kiểu tóc đã lưu của người dùng hiện tại.
     */
    @GetMapping
    public ResponseEntity<?> getSavedStyles() {
        User currentUser = usageService.getCurrentUser();
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Vui lòng đăng nhập."));
        }
        List<SavedHairstyle> savedList = savedHairstyleRepository.findByUserOrderByCreatedAtDesc(currentUser);
        List<HairstyleCatalog> hairstyles = savedList.stream()
                .map(SavedHairstyle::getHairstyle)
                .toList();
        return ResponseEntity.ok(hairstyles);
    }

    /**
     * Lưu một kiểu tóc vào danh mục yêu thích.
     */
    @PostMapping
    public ResponseEntity<?> saveStyle(@RequestParam("hairstyleId") Long hairstyleId) {
        User currentUser = usageService.getCurrentUser();
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Vui lòng đăng nhập."));
        }
        Optional<HairstyleCatalog> hairstyleOpt = hairstyleCatalogRepository.findById(hairstyleId);
        if (hairstyleOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Không tìm thấy kiểu tóc."));
        }
        HairstyleCatalog hairstyle = hairstyleOpt.get();

        if (savedHairstyleRepository.existsByUserAndHairstyle(currentUser, hairstyle)) {
            return ResponseEntity.ok(Map.of("message", "Kiểu tóc đã được lưu từ trước."));
        }

        SavedHairstyle saved = SavedHairstyle.builder()
                .user(currentUser)
                .hairstyle(hairstyle)
                .build();
        savedHairstyleRepository.save(saved);
        return ResponseEntity.ok(Map.of("message", "Đã lưu kiểu tóc thành công."));
    }

    /**
     * Xóa kiểu tóc ra khỏi danh mục yêu thích.
     */
    @DeleteMapping
    public ResponseEntity<?> unsaveStyle(@RequestParam("hairstyleId") Long hairstyleId) {
        User currentUser = usageService.getCurrentUser();
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Vui lòng đăng nhập."));
        }
        Optional<HairstyleCatalog> hairstyleOpt = hairstyleCatalogRepository.findById(hairstyleId);
        if (hairstyleOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Không tìm thấy kiểu tóc."));
        }
        Optional<SavedHairstyle> savedOpt = savedHairstyleRepository.findByUserAndHairstyle(currentUser, hairstyleOpt.get());
        if (savedOpt.isPresent()) {
            savedHairstyleRepository.delete(savedOpt.get());
            return ResponseEntity.ok(Map.of("message", "Đã bỏ lưu kiểu tóc thành công."));
        }
        return ResponseEntity.ok(Map.of("message", "Kiểu tóc chưa được lưu."));
    }
}
