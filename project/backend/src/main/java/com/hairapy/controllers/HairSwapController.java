package com.hairapy.controllers;

import com.hairapy.exceptions.AiTimeoutException;
import com.hairapy.exceptions.QuotaExceededException;
import com.hairapy.exceptions.PremiumRequiredException;
import com.hairapy.services.HairSwapFinalizer;
import com.hairapy.models.User;
import com.hairapy.services.HairSwapService;
import com.hairapy.services.SwapHistoryService;
import com.hairapy.services.HairSwapTask;
import com.hairapy.services.HairSwapTaskStore;
import com.hairapy.services.UsageService;
import com.hairapy.services.SubscriptionService;
import com.hairapy.repositories.HairstyleCatalogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;

/**
 * Controller cung cấp các API đổi kiểu tóc (Hair Swap) sử dụng AI Pro API.
 * Pro API chỉ thay kiểu tóc, không thay đổi khuôn mặt.
 *
 * THIẾT KẾ ASYNC: thay vì 1 request POST /api/swap/try chặn thread tới 60s (bản cũ),
 * giờ tách làm 2 API — POST /submit (nhanh, trả taskId ngay) và GET /status/{taskId}
 * (FE tự gọi lặp lại mỗi ~3s cho tới khi DONE/ERROR). Không request nào chặn thread
 * quá thời gian 1 lần gọi AILab (~10s, xem AiLabConfig timeout).
 */
@Slf4j
@RestController
@RequestMapping("/api/swap")
@RequiredArgsConstructor
public class HairSwapController {

    private final HairSwapService hairSwapService;
    private final HairSwapTaskStore taskStore;
    private final UsageService usageService;
    private final SubscriptionService subscriptionService;
    private final HairstyleCatalogRepository hairstyleCatalogRepository;
    private final SwapHistoryService swapHistoryService;
    private final HairSwapFinalizer hairSwapFinalizer;

    // Trần thời gian chờ tối đa cho 1 task (tính từ lúc submit) — xấp xỉ ceiling cũ
    // (MAX_POLL_ATTEMPTS=12 * POLL_INTERVAL_MS=5000 = 60s ở bản blocking cũ), nới thêm
    // buffer vì giờ có thêm độ trễ round-trip giữa các lần FE gọi status.
    // Public để HairSwapTaskCleanupScheduler dùng chung (chốt sổ task bị bỏ dở).
    public static final Duration TASK_TIMEOUT = Duration.ofSeconds(75);

    /**
     * API bắt đầu 1 lượt ghép kiểu tóc mới (Pro API — hair-only). Trả về NGAY taskId,
     * không chờ AI xử lý xong.
     * Endpoint: POST /api/swap/submit
     */
    @PostMapping("/submit")
    public ResponseEntity<?> submit(
            @RequestParam("image") MultipartFile image,
            @RequestParam(value = "hairStyle", required = false) String clientHairStyle,
            @RequestParam(value = "hairstyleId", required = false) Long hairstyleId,
            @RequestParam(value = "hairColor", required = false) String hairColor) {

        log.info("Nhận yêu cầu submit thử kiểu tóc Pro: hairstyleId={}", hairstyleId);

        User currentUser = usageService.getCurrentUser();
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "error", "Yêu cầu không hợp lệ. Vui lòng đăng nhập."
            ));
        }

        // Kiểm tra magic bytes trước khi trừ lượt: file giả dạng ảnh không tốn quota
        if (!com.hairapy.utils.ImageValidator.isSupportedImage(image)) {
            return ResponseEntity.badRequest().body(Map.of("error", com.hairapy.utils.ImageValidator.INVALID_MESSAGE));
        }

        // Admin/Tester được coi như Premium (không giới hạn lượt, thử được kiểu premiumOnly, không watermark)
        boolean isPaidUser = currentUser.getRole() == com.hairapy.models.Role.ADMIN
                || currentUser.getRole() == com.hairapy.models.Role.TESTER
                || subscriptionService.isPaidUser(currentUser.getId());
        com.hairapy.models.UsageHistory reservation = null;

        // Bắt buộc có hairstyleId: kiểu tóc được tra ở SERVER, KHÔNG tin giá trị hairStyle
        // do client gửi (tránh Free user bỏ hairstyleId để lách kiểm tra premiumOnly).
        if (hairstyleId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Vui lòng chọn một kiểu tóc."));
        }
        com.hairapy.models.HairstyleCatalog style = hairstyleCatalogRepository.findById(hairstyleId).orElse(null);
        if (style == null || style.getAilabProStyle() == null || style.getAilabProStyle().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Kiểu tóc không tồn tại hoặc chưa hỗ trợ thử."));
        }
        if (!style.isActive()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Kiểu tóc này đã ngừng hỗ trợ."));
        }
        // Chặn Free user thử style premiumOnly (trước khi trừ lượt)
        if (style.isPremiumOnly() && !isPaidUser) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "error", "Kiểu tóc này chỉ dành cho gói Premium. Nâng cấp để thử ngay!",
                    "requiresPremium", true
            ));
        }
        final String hairStyle = style.getAilabProStyle(); // luôn dùng mã style từ DB
        // Màu tóc (tuỳ chọn): nếu client không gửi thì lấy mặc định từ kiểu tóc (nếu có), tôn trọng lựa chọn của client nếu gửi
        final String effectiveColor;
        if (hairColor != null && !hairColor.isBlank()) {
            effectiveColor = hairColor.trim();
        } else if (style.getAilabColor() != null && !style.getAilabColor().isBlank()) {
            effectiveColor = style.getAilabColor().trim();
        } else {
            effectiveColor = null;
        }
        if (effectiveColor != null && !HairSwapService.SUPPORTED_COLORS.contains(effectiveColor)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Màu tóc không được hỗ trợ."));
        }

        try {
            // 1. Kiểm tra + ghi nhận lượt dùng ngay (atomic)
            reservation = usageService.reserveUsage(currentUser, "HAIR_SWAP", style.getId());

            // 2. Submit task lên AILab Pro API — nhanh, không chờ xử lý xong
            String taskId = hairSwapService.submitTask(image, hairStyle, effectiveColor);

            // 3. Đăng ký task để FE poll status sau — lưu reservation để hoàn lượt nếu cần
            HairSwapTask task = new HairSwapTask(taskId, currentUser.getId(), reservation, isPaidUser,
                    style.getId(), style.getName());
            taskStore.register(task);

            return ResponseEntity.ok(Map.of("taskId", taskId));
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
            usageService.releaseUsage(reservation);
            log.warn("Yêu cầu AI timeout khi submit cho user {}: {}", currentUser.getEmail(), e.getMessage());
            return ResponseEntity.status(HttpStatus.GATEWAY_TIMEOUT).body(Map.of(
                    "error", "AI xử lý quá lâu. Lượt của bạn đã được hoàn lại, vui lòng thử lại.",
                    "refunded", true
            ));
        } catch (com.hairapy.exceptions.InvalidImageException e) {
            // Ảnh không đạt yêu cầu AI (vd không thấy mặt) — hoàn lượt, báo user chọn ảnh khác
            usageService.releaseUsage(reservation);
            log.warn("Ảnh không đạt yêu cầu AI cho user {}: {}", currentUser.getEmail(), e.getMessage());
            return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(Map.of(
                    "error", e.getMessage(),
                    "code", "INVALID_IMAGE",
                    "refunded", true
            ));
        } catch (IllegalArgumentException e) {
            usageService.releaseUsage(reservation);
            log.warn("Yêu cầu không hợp lệ: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            usageService.releaseUsage(reservation);
            log.error("Lỗi hệ thống khi submit thử kiểu tóc:", e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "error", "Không thể xử lý ảnh bằng AI. Vui lòng thử lại sau."
            ));
        }
    }

    /**
     * API kiểm tra trạng thái 1 task hair-swap — FE tự gọi lặp lại (khuyến nghị mỗi ~3s)
     * cho tới khi nhận status DONE hoặc ERROR. Mỗi lần gọi chỉ tốn tối đa ~10s (1 lần
     * gọi AILab), không chặn thread lâu như bản cũ.
     * Endpoint: GET /api/swap/status/{taskId}
     */
    @GetMapping("/status/{taskId}")
    public ResponseEntity<?> status(@PathVariable String taskId) {
        User currentUser = usageService.getCurrentUser();
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "error", "Yêu cầu không hợp lệ. Vui lòng đăng nhập."
            ));
        }

        HairSwapTask task = taskStore.get(taskId);
        // Không tiết lộ task có tồn tại hay không nếu không phải chủ sở hữu — trả 404 chung cho cả 2 trường hợp
        if (task == null || !task.getUserId().equals(currentUser.getId())) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                    "error", "Không tìm thấy tác vụ. Vui lòng thử lại."
            ));
        }

        // Task đã kết thúc từ lần poll trước — trả cache, không gọi lại AILab
        if (task.getStatus() == HairSwapTask.Status.DONE) {
            return ResponseEntity.ok(Map.of("status", "DONE", "image", task.getResultImageUrl()));
        }
        if (task.getStatus() == HairSwapTask.Status.ERROR) {
            return ResponseEntity.ok(Map.of("status", "ERROR", "error", task.getErrorMessage(), "refunded", true));
        }

        // Task vẫn PENDING — kiểm tra đã quá hạn timeout tổng thể chưa (trước khi tốn thêm 1 lần gọi AILab)
        if (Duration.between(task.getCreatedAt(), Instant.now()).compareTo(TASK_TIMEOUT) > 0) {
            hairSwapFinalizer.failAndRefund(task, "AI xử lý quá lâu, lượt của bạn đã được hoàn lại.");
            log.warn("Task hair-swap timeout: taskId={}, userId={}", taskId, currentUser.getEmail());
            return ResponseEntity.ok(Map.of("status", "ERROR", "error", task.getErrorMessage(), "refunded", true));
        }

        // Còn trong hạn — thực hiện ĐÚNG 1 lần check với AILab (logic DONE/ERROR/refund nằm trong HairSwapFinalizer)
        HairSwapTask.Status after = hairSwapFinalizer.pollOnce(task);
        return switch (after) {
            case DONE -> ResponseEntity.ok(Map.of("status", "DONE", "image", task.getResultImageUrl()));
            case ERROR -> ResponseEntity.ok(Map.of("status", "ERROR", "error", task.getErrorMessage(), "refunded", true));
            // PENDING (kể cả khi luồng khác đang upload): lần poll kế tiếp sẽ thấy DONE đã cache
            default -> ResponseEntity.ok(Map.of("status", "PENDING"));
        };
    }
}
