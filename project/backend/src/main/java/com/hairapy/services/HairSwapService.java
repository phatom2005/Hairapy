package com.hairapy.services;

import com.hairapy.config.AiLabConfig;
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
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class HairSwapService {

    private final AiLabConfig aiLabConfig;
    private final RestTemplate aiRestTemplate;

    // Pro API endpoint — async, chỉ thay tóc (không thay mặt)
    private static final String AILAB_PRO_URL = "https://www.ailabapi.com/api/portrait/effects/hairstyle-editor-pro";
    // Endpoint poll kết quả async task
    private static final String AILAB_ASYNC_RESULT_URL = "https://www.ailabapi.com/api/common/query-async-task-result";

    // Polling config: tối đa 60 giây, mỗi 5 giây poll 1 lần
    private static final int MAX_POLL_ATTEMPTS = 12;
    private static final int POLL_INTERVAL_MS = 5000;

    /**
     * Gọi Pro API để đổi kiểu tóc — chỉ thay tóc, giữ nguyên khuôn mặt.
     *
     * @param image    file ảnh của người dùng.
     * @param hairStyle mã kiểu tóc Pro API (ví dụ: "BuzzCut", "LongCurly", "BobCut").
     * @return URL ảnh kết quả (temporary, hết hạn sau 24h).
     */
    public String swapHairstyle(MultipartFile image, String hairStyle) {
        if (image.isEmpty()) {
            throw new IllegalArgumentException("Ảnh không được để trống.");
        }

        String contentType = image.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("Định dạng tệp không hợp lệ. Chỉ chấp nhận ảnh.");
        }

        // === BƯỚC 1: Submit async task lên Pro API ===
        String taskId = submitProTask(image, hairStyle);

        // === BƯỚC 2: Poll kết quả cho đến khi hoàn thành hoặc timeout ===
        return pollForResult(taskId);
    }

    /**
     * Gửi request tạo task async lên Pro API.
     * Trả về task_id để poll kết quả sau.
     */
    private String submitProTask(MultipartFile image, String hairStyle) {
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
        log.info("Gửi Pro Hair Swap request: hairStyle={}, apiKey={}", hairStyle, maskedKey);

        ResponseEntity<Map> response;
        try {
            response = aiRestTemplate.postForEntity(AILAB_PRO_URL, requestEntity, Map.class);
        } catch (org.springframework.web.client.ResourceAccessException e) {
            log.warn("AILab Pro API timeout khi submit task");
            throw new com.hairapy.exceptions.AiTimeoutException("AI xử lý quá lâu, lượt của bạn đã được hoàn lại.");
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
     * Poll kết quả async task cho đến khi hoàn thành (task_status=2) hoặc timeout.
     * Trả về URL ảnh kết quả.
     */
    private String pollForResult(String taskId) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("ailabapi-api-key", aiLabConfig.getApiKey());

        for (int attempt = 1; attempt <= MAX_POLL_ATTEMPTS; attempt++) {
            // Chờ trước khi poll (lần đầu cũng chờ vì task vừa submit)
            try {
                Thread.sleep(POLL_INTERVAL_MS);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new RuntimeException("Polling bị gián đoạn.");
            }

            String url = AILAB_ASYNC_RESULT_URL + "?task_id=" + taskId;
            HttpEntity<Void> requestEntity = new HttpEntity<>(headers);

            ResponseEntity<Map> response;
            try {
                response = aiRestTemplate.exchange(url, HttpMethod.GET, requestEntity, Map.class);
            } catch (Exception e) {
                log.warn("Lỗi khi poll kết quả (lần {}): {}", attempt, e.getMessage());
                continue; // Thử lại lần tiếp
            }

            if (response.getStatusCode() != HttpStatus.OK || response.getBody() == null) {
                log.warn("Poll lần {} trả về status không hợp lệ: {}", attempt, response.getStatusCode());
                continue;
            }

            Map<String, Object> body = response.getBody();

            // Kiểm tra error
            Object errorCodeObj = body.get("error_code");
            if (errorCodeObj != null && Integer.parseInt(errorCodeObj.toString()) != 0) {
                Object errorMsg = body.get("error_msg");
                log.error("Poll lỗi: [Code: {}] {}", errorCodeObj, errorMsg);
                throw new RuntimeException("Dịch vụ AI báo lỗi: " + errorMsg);
            }

            // Kiểm tra task_status: 0=queued, 1=processing, 2=success
            Object taskStatusObj = body.get("task_status");
            int taskStatus = taskStatusObj != null ? Integer.parseInt(taskStatusObj.toString()) : 0;

            log.info("Poll lần {}/{}: taskId={}, status={}", attempt, MAX_POLL_ATTEMPTS, taskId, taskStatus);

            if (taskStatus == 2) {
                // Thành công — lấy ảnh từ data.images[]
                Map<String, Object> data = (Map<String, Object>) body.get("data");
                if (data == null) {
                    throw new RuntimeException("Không tìm thấy dữ liệu kết quả từ dịch vụ AI.");
                }

                List<String> images = (List<String>) data.get("images");
                if (images == null || images.isEmpty()) {
                    throw new RuntimeException("Dữ liệu ảnh trả về từ dịch vụ AI bị rỗng.");
                }

                String resultUrl = images.get(0);
                log.info("Pro API hoàn tất: taskId={}, resultUrl={}...", taskId, resultUrl.substring(0, Math.min(60, resultUrl.length())));
                return resultUrl;
            }

            // task_status 0 hoặc 1 → tiếp tục poll
        }

        // Hết số lần poll → timeout
        log.warn("Pro API timeout sau {} lần poll ({}s): taskId={}", MAX_POLL_ATTEMPTS, MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS / 1000, taskId);
        throw new com.hairapy.exceptions.AiTimeoutException("AI xử lý quá lâu, lượt của bạn đã được hoàn lại.");
    }

    /**
     * Ẩn API key khi log (chỉ hiện 4 ký tự cuối).
     */
    private String maskApiKey(String key) {
        if (key == null || key.length() <= 4) return "Rỗng/Ngắn";
        return "****" + key.substring(key.length() - 4);
    }
}
