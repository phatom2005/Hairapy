package com.hairapy.services;

import com.hairapy.config.AiLabConfig;
import com.hairapy.dto.HairSwapPollResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

/**
 * Service kết nối AILabTools Hairstyle Changer Pro API (async).
 * Pro API dùng Stable Diffusion — chỉ thay kiểu tóc, KHÔNG thay đổi khuôn mặt.
 *
 * THIẾT KẾ ASYNC (submit-rồi-poll-từ-client): service này KHÔNG còn tự poll và
 * Thread.sleep chờ AILab nữa (khác bản cũ) — mỗi phương thức ở đây chỉ thực hiện
 * ĐÚNG 1 lần gọi HTTP rồi trả về ngay, không chặn thread. Việc "chờ" (đợi vài giây
 * giữa các lần kiểm tra) do HairSwapController + HairSwapTaskStore điều phối theo
 * từng lần request GET /api/swap/status/{taskId} riêng biệt từ trình duyệt.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class HairSwapService {

    private final AiLabConfig aiLabConfig;
    private final RestTemplate aiRestTemplate;
    private final CloudinaryService cloudinaryService;
    private final AlertService alertService;

    // Pro API endpoint — async, chỉ thay tóc (không thay mặt)
    private static final String AILAB_PRO_URL = "https://www.ailabapi.com/api/portrait/effects/hairstyle-editor-pro";
    // Endpoint poll kết quả async task
    private static final String AILAB_ASYNC_RESULT_URL = "https://www.ailabapi.com/api/common/query-async-task-result";

    /**
     * Gửi request tạo task async lên Pro API — chỉ thay tóc, giữ nguyên khuôn mặt.
     * Trả về NGAY task_id (không chờ AI xử lý xong) — nhanh, không chặn thread lâu.
     *
     * @param image     file ảnh của người dùng.
     * @param hairStyle mã kiểu tóc Pro API (ví dụ: "BuzzCut", "LongCurly", "BobCut").
     * @return task_id để poll kết quả sau qua checkStatus().
     */
    public String submitTask(MultipartFile image, String hairStyle) {
        if (image.isEmpty()) {
            throw new IllegalArgumentException("Ảnh không được để trống.");
        }

        String contentType = image.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("Định dạng tệp không hợp lệ. Chỉ chấp nhận ảnh.");
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        headers.set("ailabapi-api-key", aiLabConfig.getApiKey());

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();

        // File ảnh — Pro API dùng field "image" (không phải "image_target" như API cũ)
        try {
            ByteArrayResource fileResource = new ByteArrayResource(image.getBytes()) {
                @Override
                public String getFilename() {
                    return image.getOriginalFilename() != null ? image.getOriginalFilename() : "image.jpg";
                }
            };
            body.add("image", fileResource);
        } catch (IOException e) {
            log.error("Không thể đọc dữ liệu từ tệp ảnh tải lên", e);
            throw new RuntimeException("Lỗi khi đọc file ảnh tải lên.");
        }

        // Các field bắt buộc của Pro API
        body.add("task_type", "async");
        body.add("auto", "1");
        body.add("hair_style", hairStyle);
        body.add("image_size", "1"); // Chỉ trả 1 ảnh để tiết kiệm credit

        HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

        // Log an toàn
        String maskedKey = maskApiKey(aiLabConfig.getApiKey());
        log.info("Gửi Pro Hair Swap request (submit): hairStyle={}, apiKey={}", hairStyle, maskedKey);

        ResponseEntity<Map> response;
        try {
            response = aiRestTemplate.postForEntity(AILAB_PRO_URL, requestEntity, Map.class);
        } catch (org.springframework.web.client.ResourceAccessException e) {
            log.warn("AILab Pro API timeout khi submit task");
            throw new com.hairapy.exceptions.AiTimeoutException("AI xử lý quá lâu, lượt của bạn đã được hoàn lại.");
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            // RestTemplate mặc định ném exception với mọi 4xx. AILab trả 422 (FILE_CONTENT_NON_COMPLIANCE)
            // khi ảnh không đạt yêu cầu → đây là lỗi do ẢNH của user, không phải lỗi hệ thống.
            String errBody = e.getResponseBodyAsString();
            log.warn("AILab Pro API từ chối ảnh: status={}, body={}", e.getStatusCode(), errBody);
            if (e.getStatusCode().value() == 422 || (errBody != null && errBody.contains("FILE_CONTENT_NON_COMPLIANCE"))) {
                if (errBody != null && errBody.contains("NO_FACE")) {
                    throw new com.hairapy.exceptions.InvalidImageException(
                            "AI không nhận ra khuôn mặt trong ảnh này. Hãy dùng ảnh chụp thẳng mặt, đủ sáng, "
                                    + "khuôn mặt chiếm phần lớn khung hình và không bị che. Lượt của bạn đã được hoàn lại.");
                }
                throw new com.hairapy.exceptions.InvalidImageException(
                        "Ảnh chưa đạt yêu cầu của AI (mặt quá nhỏ, quá nghiêng hoặc ảnh quá nhỏ/lớn). "
                                + "Vui lòng chọn ảnh khác. Lượt của bạn đã được hoàn lại.");
            }
            // 401/402/403/429... (sai khóa, hết credit, bị giới hạn) → lỗi hệ thống, báo admin ngay
            int httpCode = e.getStatusCode().value();
            if (httpCode == 401 || httpCode == 402 || httpCode == 403) {
                alertService.alert("AILAB_AUTH",
                        "AILab từ chối API key / hết credit (HTTP " + httpCode + ") — swap kiểu tóc đang không dùng được",
                        "HTTP " + httpCode + " — " + truncate(errBody, 500));
            } else if (httpCode == 429) {
                alertService.alert("AILAB_RATE_LIMIT", "AILab giới hạn tốc độ (HTTP 429)",
                        truncate(errBody, 500));
            } else {
                alertService.alert("AILAB_4XX", "AILab trả lỗi 4xx bất thường (HTTP " + httpCode + ")",
                        truncate(errBody, 500));
            }
            throw new RuntimeException("Dịch vụ AI từ chối yêu cầu: HTTP " + httpCode);
        } catch (org.springframework.web.client.HttpServerErrorException e) {
            alertService.alert("AILAB_5XX", "AILab gặp lỗi máy chủ (HTTP " + e.getStatusCode().value() + ")",
                    truncate(e.getResponseBodyAsString(), 500));
            throw new RuntimeException("Dịch vụ AI đang gặp sự cố, vui lòng thử lại sau.");
        }

        if (response.getStatusCode() != HttpStatus.OK || response.getBody() == null) {
            log.error("AILab Pro API trả về lỗi: status={}", response.getStatusCode());
            throw new RuntimeException("Lỗi khi kết nối đến dịch vụ AI.");
        }

        Map<String, Object> responseBody = response.getBody();

        // Kiểm tra error_code
        Object errorCodeObj = responseBody.get("error_code");
        if (errorCodeObj != null) {
            int errorCode = Integer.parseInt(errorCodeObj.toString());
            if (errorCode != 0) {
                Object errorMsg = responseBody.get("error_msg");
                log.error("AILab Pro API báo lỗi: [Code: {}] {}", errorCode, errorMsg);
                alertService.alert("AILAB_ERROR", "AILab báo lỗi khi submit (code " + errorCode + ")",
                        truncate(String.valueOf(errorMsg), 500));
                throw new RuntimeException("Dịch vụ AI báo lỗi: " + errorMsg);
            }
        }

        // Lấy task_id
        String taskId = (String) responseBody.get("task_id");
        if (taskId == null || taskId.isBlank()) {
            throw new RuntimeException("Không nhận được task_id từ dịch vụ AI.");
        }

        log.info("Pro API task submitted thành công: taskId={}", taskId);
        return taskId;
    }

    /**
     * Kiểm tra trạng thái task — ĐÚNG 1 LẦN gọi HTTP, KHÔNG lặp, KHÔNG Thread.sleep.
     * Gọi lại nhiều lần (từ controller, mỗi lần ứng với 1 request GET status/{taskId}
     * riêng từ FE) để mô phỏng polling mà không chặn thread nào trong lúc "chờ".
     */
    public HairSwapPollResult checkStatus(String taskId) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("ailabapi-api-key", aiLabConfig.getApiKey());

        String url = AILAB_ASYNC_RESULT_URL + "?task_id=" + taskId;
        HttpEntity<Void> requestEntity = new HttpEntity<>(headers);

        ResponseEntity<Map> response;
        try {
            response = aiRestTemplate.exchange(url, HttpMethod.GET, requestEntity, Map.class);
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            // AILab trả 422 (FILE_CONTENT_NON_COMPLIANCE) khi ảnh KHÔNG đạt yêu cầu (vd không thấy mặt):
            // đây là lỗi vĩnh viễn, poll lại vô ích → báo lỗi ngay để hoàn lượt, không bắt user chờ hết timeout.
            int code = e.getStatusCode().value();
            if (code == 422 || code == 400) {
                String body = String.valueOf(e.getResponseBodyAsString());
                log.warn("Ảnh không đạt yêu cầu AI, taskId={}, http={}: {}", taskId, code, truncate(body, 300));
                String msg = body.contains("NO_FACE")
                        ? "Không nhận diện được khuôn mặt trong ảnh. Hãy chụp lại: nhìn thẳng, đủ sáng, rõ nét và không bị che mặt."
                        : "Ảnh chưa đạt yêu cầu của AI. Hãy thử ảnh khác rõ mặt, đủ sáng và nhìn thẳng.";
                return HairSwapPollResult.error(msg);
            }
            log.warn("Lỗi khi check status taskId={}: {}", taskId, e.getMessage());
            return HairSwapPollResult.pending();
        } catch (Exception e) {
            // Lỗi mạng thoáng qua khi check status — coi như PENDING, để lần poll sau thử lại
            // (khác timeout thật sự, được HairSwapController quyết định dựa trên tổng thời gian trôi qua).
            log.warn("Lỗi khi check status taskId={}: {}", taskId, e.getMessage());
            return HairSwapPollResult.pending();
        }

        if (response.getStatusCode() != HttpStatus.OK || response.getBody() == null) {
            log.warn("Check status trả về status không hợp lệ: {}", response.getStatusCode());
            return HairSwapPollResult.pending();
        }

        Map<String, Object> body = response.getBody();

        // Kiểm tra error
        Object errorCodeObj = body.get("error_code");
        if (errorCodeObj != null && Integer.parseInt(errorCodeObj.toString()) != 0) {
            Object errorMsg = body.get("error_msg");
            log.error("Check status lỗi: [Code: {}] {}", errorCodeObj, errorMsg);
            alertService.alert("AILAB_ERROR", "AILab báo lỗi khi check status (code " + errorCodeObj + ")",
                    truncate(String.valueOf(errorMsg), 500));
            return HairSwapPollResult.error("Dịch vụ AI báo lỗi: " + errorMsg);
        }

        // Kiểm tra task_status: 0=queued, 1=processing, 2=success
        Object taskStatusObj = body.get("task_status");
        int taskStatus = taskStatusObj != null ? Integer.parseInt(taskStatusObj.toString()) : 0;

        if (taskStatus == 2) {
            // Thành công — lấy ảnh từ data.images[]
            Map<String, Object> data = (Map<String, Object>) body.get("data");
            if (data == null) {
                return HairSwapPollResult.error("Không tìm thấy dữ liệu kết quả từ dịch vụ AI.");
            }

            List<String> images = (List<String>) data.get("images");
            if (images == null || images.isEmpty()) {
                return HairSwapPollResult.error("Dữ liệu ảnh trả về từ dịch vụ AI bị rỗng.");
            }

            String resultUrl = images.get(0);
            log.info("Pro API hoàn tất: taskId={}, resultUrl={}...", taskId, resultUrl.substring(0, Math.min(60, resultUrl.length())));
            return HairSwapPollResult.done(resultUrl);
        }

        // task_status 0 hoặc 1 → vẫn đang xử lý
        return HairSwapPollResult.pending();
    }

    /**
     * Upload ảnh kết quả (URL tạm của AILab) lên Cloudinary — Free user bị gắn
     * watermark, Premium thì không. Gọi ĐÚNG 1 LẦN khi checkStatus() lần đầu phát
     * hiện DONE (controller đảm bảo not-double-call qua HairSwapTask.tryMarkUploaded()).
     */
    public String uploadResult(String tempUrl, boolean isPaidUser) {
        try {
            return cloudinaryService.uploadFromUrl(tempUrl, "swap-history", !isPaidUser);
        } catch (Exception e) {
            log.error("Không thể upload ảnh kết quả lên Cloudinary, sử dụng URL tạm thời của AILab: {}", tempUrl, e);
            return tempUrl;
        }
    }

    /** Cắt chuỗi dài (body lỗi) để mail/log gọn. */
    private static String truncate(String s, int max) {
        if (s == null) return "";
        return s.length() <= max ? s : s.substring(0, max) + "...";
    }

    /**
     * Ẩn API key khi log (chỉ hiện 4 ký tự cuối).
     */
    private String maskApiKey(String key) {
        if (key == null || key.length() <= 4) return "Rỗng/Ngắn";
        return "****" + key.substring(key.length() - 4);
    }
}
