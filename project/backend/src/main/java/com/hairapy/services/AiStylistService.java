package com.hairapy.services;

import com.hairapy.config.LlmConfig;
import com.hairapy.exceptions.AiTimeoutException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.List;
import java.util.Map;

/**
 * Service gọi Google Gemini API để tư vấn kiểu tóc cá nhân hoá — tính năng
 * "AI Stylist", chỉ dành cho user Premium. Không tự train model — gọi API bên
 * thứ 3 (LLM API), giống pattern HairSwapService gọi AILabTools.
 *
 * Đây là 1 lần gọi HTTP đồng bộ (~2-5s, nhanh hơn nhiều so với xử lý ảnh AI),
 * nên KHÔNG cần thiết kế submit/poll async như HairSwapService — trả kết quả
 * ngay trong 1 request.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AiStylistService {

    private final LlmConfig llmConfig;
    private final RestTemplate llmRestTemplate;

    private static final String GEMINI_BASE_URL =
            "https://generativelanguage.googleapis.com/v1beta/models";

    // Giới hạn độ dài câu hỏi user — tránh prompt quá dài (tốn token/chi phí) và
    // hạn chế rủi ro prompt injection cơ bản qua input tự do.
    private static final int MAX_QUESTION_LENGTH = 500;

    /**
     * Gửi câu hỏi + ngữ cảnh (dáng mặt, chất tóc, kiểu tóc đang xem) tới Gemini,
     * trả về câu trả lời tư vấn dạng text thuần, giọng văn thân thiện tiếng Việt.
     */
    public String consult(String question, String faceShape, String hairType, String currentStyleName) {
        if (question == null || question.isBlank()) {
            throw new IllegalArgumentException("Vui lòng nhập câu hỏi.");
        }
        String trimmedQuestion = question.trim();
        if (trimmedQuestion.length() > MAX_QUESTION_LENGTH) {
            throw new IllegalArgumentException("Câu hỏi quá dài, vui lòng rút gọn (tối đa " + MAX_QUESTION_LENGTH + " ký tự).");
        }

        String prompt = buildPrompt(trimmedQuestion, faceShape, hairType, currentStyleName);

        String url = UriComponentsBuilder
                .fromHttpUrl(GEMINI_BASE_URL + "/" + llmConfig.getModel() + ":generateContent")
                .queryParam("key", llmConfig.getApiKey())
                .toUriString();

        Map<String, Object> requestBody = Map.of(
                "contents", List.of(
                        Map.of("parts", List.of(Map.of("text", prompt)))
                ),
                // Giữ câu trả lời ngắn gọn, đỡ tốn token — phù hợp hiển thị dạng card trên FE/mobile.
                "generationConfig", Map.of(
                        "maxOutputTokens", 400,
                        "temperature", 0.7
                )
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(requestBody, headers);

        ResponseEntity<Map> response;
        try {
            response = llmRestTemplate.postForEntity(url, requestEntity, Map.class);
        } catch (ResourceAccessException e) {
            log.warn("Gemini API timeout khi tư vấn AI Stylist");
            throw new AiTimeoutException("AI xử lý quá lâu, lượt của bạn đã được hoàn lại.");
        }

        if (response.getStatusCode() != HttpStatus.OK || response.getBody() == null) {
            log.error("Gemini API trả về lỗi: status={}", response.getStatusCode());
            throw new RuntimeException("Không thể kết nối đến dịch vụ AI Stylist.");
        }

        String answer = extractAnswer(response.getBody());
        if (answer == null || answer.isBlank()) {
            log.error("Gemini API trả về response rỗng/không đúng định dạng: {}", response.getBody());
            throw new RuntimeException("AI Stylist không thể trả lời câu hỏi này, vui lòng thử lại.");
        }
        return answer.trim();
    }

    /**
     * Prompt tiếng Việt — nhúng ngữ cảnh sẵn có (nếu có) để AI tư vấn sát hơn thay
     * vì trả lời chung chung. Ngữ cảnh optional vì user có thể hỏi tự do.
     */
    private String buildPrompt(String question, String faceShape, String hairType, String currentStyleName) {
        StringBuilder sb = new StringBuilder();
        sb.append("Bạn là chuyên gia tư vấn kiểu tóc thân thiện của Hairapy (app AI phân tích khuôn mặt và gợi ý kiểu tóc). ");
        sb.append("Trả lời NGẮN GỌN (tối đa 4-5 câu), bằng tiếng Việt, giọng văn gần gũi, dễ hiểu, đi thẳng vào lời khuyên thực tế.\n\n");

        boolean hasContext = (faceShape != null && !faceShape.isBlank())
                || (hairType != null && !hairType.isBlank())
                || (currentStyleName != null && !currentStyleName.isBlank());
        if (hasContext) {
            sb.append("Thông tin người dùng:\n");
            if (faceShape != null && !faceShape.isBlank()) sb.append("- Dáng mặt: ").append(faceShape).append("\n");
            if (hairType != null && !hairType.isBlank()) sb.append("- Chất tóc: ").append(hairType).append("\n");
            if (currentStyleName != null && !currentStyleName.isBlank())
                sb.append("- Đang xem/quan tâm kiểu tóc: ").append(currentStyleName).append("\n");
            sb.append("\n");
        }

        sb.append("Câu hỏi của người dùng: ").append(question);
        return sb.toString();
    }

    @SuppressWarnings("unchecked")
    private String extractAnswer(Map<String, Object> body) {
        try {
            List<Map<String, Object>> candidates = (List<Map<String, Object>>) body.get("candidates");
            if (candidates == null || candidates.isEmpty()) return null;
            Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
            if (content == null) return null;
            List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
            if (parts == null || parts.isEmpty()) return null;
            Object text = parts.get(0).get("text");
            return text != null ? text.toString() : null;
        } catch (ClassCastException e) {
            log.error("Không parse được response Gemini", e);
            return null;
        }
    }
}
