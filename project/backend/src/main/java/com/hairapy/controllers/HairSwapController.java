package com.hairapy.controllers;

import com.hairapy.exceptions.AiTimeoutException;
import com.hairapy.exceptions.QuotaExceededException;
import com.hairapy.exceptions.PremiumRequiredException;
import com.hairapy.dto.HairSwapPollResult;
import com.hairapy.models.User;
import com.hairapy.services.HairSwapService;
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

    // Trần thời gian chờ tối đa cho 1 task (tính từ lúc submit) — xấp xỉ ceiling cũ
    // (MAX_POLL_ATTEMPTS=12 * POLL_INTERVAL_MS=5000 = 60s ở bản blocking cũ), nới thêm
    // buffer vì giờ có thêm độ trễ round-trip giữa các lần FE gọi status.
    private static final Duration TASK_TIMEOUT = Duration.ofSeconds(75);

    /**
     * API bắt đầu 1 lượt ghép kiểu tóc mới (Pro API — hair-only). Trả về NGAY taskId,
     * không chờ AI xử lý xong.
     * Endpoint: POST /api/swap/submit
     */
    @PostMapping("/submit")
    public ResponseEntity<?> submit(
            @RequestParam("image") MultipartFile image,
            @RequestParam("hairStyle") String hairStyle,
            @RequestParam(value = "hairstyleId", required = false) Long hairstyleId) {

        log.info("Nhận yêu cầu submit thử kiểu tóc Pro: hairStyle={}, hairstyleId={}", hairStyle, hairstyleId);

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

            // 1. Kiểm tra + ghi nhận lượt dùng ngay (atomic)
            reservation = usageService.reserveUsage(currentUser, "HAIR_SWAP");

            // 2. Submit task lên AILab Pro API — nhanh, không chờ xử lý xong
            String taskId = hairSwapService.submitTask(image, hairStyle);

            // 3. Đăng ký task để FE poll status sau — lưu reservation để hoàn lượt nếu cần
            HairSwapTask task = new HairSwapTask(taskId, currentUser.getId(), reservation, isPaidUser);
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
            task.markError("AI xử lý quá lâu, lượt của bạn đã được hoàn lại.");
            refundIfNeeded(task);
            log.warn("Task hair-swap timeout: taskId={}, userId={}", taskId, currentUser.getEmail());
            return ResponseEntity.ok(Map.of("status", "ERROR", "error", task.getErrorMessage(), "refunded", true));
        }

        // Còn trong hạn — thực hiện ĐÚNG 1 lần check với AILab
        HairSwapPollResult result = hairSwapService.checkStatus(taskId);

        switch (result.status()) {
            case DONE -> {
                // Chống double-upload Cloudinary nếu 2 request poll trùng thời điểm (vd 2 tab)
                if (task.tryMarkUploaded()) {
                    String cloudinaryUrl = hairSwapService.uploadResult(result.imageUrl(), task.isPaidUser());
                    task.markDone(cloudinaryUrl);
                    return ResponseEntity.ok(Map.of("status", "DONE", "image", cloudinaryUrl));
                } else {
                    // Một request khác đang/đã upload — trả PENDING, lần poll kế tiếp sẽ thấy DONE đã cache
                    return ResponseEntity.ok(Map.of("status", "PENDING"));
                }
            }
            case ERROR -> {
                task.markError(result.errorMessage());
                refundIfNeeded(task);
                return ResponseEntity.ok(Map.of("status", "ERROR", "error", result.errorMessage(), "refunded", true));
            }
            default -> {
                return ResponseEntity.ok(Map.of("status", "PENDING"));
            }
        }
    }

    /**
     * Hoàn lượt đúng 1 lần cho task (dùng AtomicBoolean guard trong HairSwapTask để
     * chống hoàn lượt 2 lần nếu 2 request poll trùng thời điểm cùng phát hiện lỗi/timeout).
     */
    private void refundIfNeeded(HairSwapTask task) {
        if (task.tryMarkRefunded()) {
            usageService.releaseUsage(task.getReservation());
        }
    }
}
