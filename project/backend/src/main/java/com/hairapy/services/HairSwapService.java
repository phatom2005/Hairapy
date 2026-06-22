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
import java.util.Map;

/**
 * Service kết nối và xử lý yêu cầu thay đổi kiểu tóc thông qua API của AILabTools.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class HairSwapService {

    private final AiLabConfig aiLabConfig;
    private final RestTemplate aiRestTemplate;

    private static final String AILAB_URL = "https://www.ailabapi.com/api/portrait/effects/hairstyle-editor";

    /**
     * Gọi API AILabTools để thực hiện đổi kiểu tóc cho bức ảnh.
     *
     * @param image file ảnh của người dùng.
     * @param hairType mã số kiểu tóc (ví dụ: 0, 1, 2, 901...).
     * @return chuỗi Base64 hoặc URL ảnh kết quả.
     */
    public String swapHairstyle(MultipartFile image, int hairType) {
        if (image.isEmpty()) {
            throw new IllegalArgumentException("Ảnh không được để trống.");
        }

        // Kiểm tra định dạng ảnh
        String contentType = image.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("Định dạng tệp không hợp lệ. Chỉ chấp nhận ảnh.");
        }

        // Chuẩn bị Headers
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        headers.set("ailabapi-api-key", aiLabConfig.getApiKey());

        // Chuẩn bị Body
        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        try {
            // Chuyển MultipartFile thành ByteArrayResource để RestTemplate có thể gửi đi dưới dạng file upload
            ByteArrayResource fileResource = new ByteArrayResource(image.getBytes()) {
                @Override
                public String getFilename() {
                    return image.getOriginalFilename() != null ? image.getOriginalFilename() : "image.jpg";
                }
            };
            body.add("image_target", fileResource);
        } catch (IOException e) {
            log.error("Không thể đọc dữ liệu từ tệp ảnh tải lên", e);
            throw new RuntimeException("Lỗi khi đọc file ảnh tải lên.");
        }
        body.add("hair_type", String.valueOf(hairType));

        HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

        try {
            log.info("Bắt đầu gửi yêu cầu Hair Swap tới AILab Tools API với hairType={}", hairType);
            
            // Log khóa API một cách an toàn (chỉ lấy 4 ký tự cuối hoặc ẩn hết)
            String keyStr = aiLabConfig.getApiKey();
            String maskedKey = (keyStr != null && keyStr.length() > 4) 
                ? "****" + keyStr.substring(keyStr.length() - 4) 
                : "Rỗng/Ngắn";
            log.info("Sử dụng API Key AILabTools: {}", maskedKey);

            ResponseEntity<Map> response;
            try {
                response = aiRestTemplate.postForEntity(AILAB_URL, requestEntity, Map.class);
            } catch (org.springframework.web.client.ResourceAccessException e) {
                log.warn("AILab API timeout sau {}ms", aiLabConfig.getTimeoutMs());
                throw new com.hairapy.exceptions.AiTimeoutException("AI xử lý quá lâu, lượt của bạn đã được hoàn lại.");
            }
            
            if (response.getStatusCode() != HttpStatus.OK || response.getBody() == null) {
                log.error("AILab Tools API trả về status code hoặc body không hợp lệ: {}", response.getStatusCode());
                throw new RuntimeException("Lỗi khi kết nối đến dịch vụ AI.");
            }

            Map<String, Object> responseBody = response.getBody();
            log.info("Nhận phản hồi thành công từ AILab API. error_code={}", responseBody != null ? responseBody.get("error_code") : "null");

            // Kiểm tra lỗi từ phía AILabTools
            Object errorCodeObj = responseBody.get("error_code");
            if (errorCodeObj != null) {
                int errorCode = Integer.parseInt(errorCodeObj.toString());
                if (errorCode != 0) {
                    Object errorMsg = responseBody.get("error_msg");
                    log.error("AILab Tools API báo lỗi: [Code: {}] {}", errorCode, errorMsg);
                    throw new RuntimeException("Dịch vụ AI báo lỗi: " + errorMsg);
                }
            }

            // Trích xuất dữ liệu ảnh từ response
            Map<String, Object> data = (Map<String, Object>) responseBody.get("data");
            if (data == null) {
                throw new RuntimeException("Không tìm thấy dữ liệu kết quả từ dịch vụ AI.");
            }

            // AILab Tools có thể trả về 'image' chứa base64
            String resultImage = (String) data.get("image");
            if (resultImage == null || resultImage.isEmpty()) {
                // Thử tìm theo 'image_url' hoặc 'url' dự phòng
                resultImage = (String) data.get("image_url");
                if (resultImage == null || resultImage.isEmpty()) {
                    resultImage = (String) data.get("url");
                }
            }

            if (resultImage == null || resultImage.isEmpty()) {
                throw new RuntimeException("Dữ liệu ảnh trả về từ dịch vụ AI bị rỗng.");
            }

            return resultImage;
        } catch (RuntimeException e) {
            // Ném lại RuntimeException đã throw ở trên mà không wrap thêm lần nữa
            throw e;
        } catch (Exception e) {
            log.error("Lỗi khi thực hiện Hair Swap:", e);
            throw new RuntimeException("Xử lý AI thất bại: " + e.getMessage());
        }
    }
}
