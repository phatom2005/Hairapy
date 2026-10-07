package com.hairapy.exceptions;

import com.hairapy.services.AlertService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Xử lý exception tập trung và PHÂN LOẠI sẵn để dễ đọc log trên Railway:
 *
 *  - "[CLIENT_ERROR]" (log WARN)  = lỗi do request/người dùng (4xx). Không gửi cảnh báo mail.
 *  - "[SERVER_ERROR]" (log ERROR) = lỗi của hệ thống (5xx). Có kèm cảnh báo mail qua AlertService.
 *
 * Kế thừa ResponseEntityExceptionHandler để các lỗi Spring MVC (sai method, thiếu param, JSON sai,
 * path không tồn tại, file quá lớn...) trả đúng mã 4xx thay vì bị gom hết thành 500.
 * Body luôn theo 1 dạng: {timestamp, status, error, message, path}.
 */
@Slf4j
@ControllerAdvice
@RequiredArgsConstructor
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    private final AlertService alertService;

    // ===================== LỖI NGHIỆP VỤ CỦA HAIRAPY (client error) =====================

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Object> handleResourceNotFoundException(ResourceNotFoundException ex, WebRequest request) {
        log.warn("[CLIENT_ERROR] 404 Resource not found: {}", ex.getMessage());
        return buildResponse(HttpStatus.NOT_FOUND, "Not Found", ex.getMessage(), request);
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<Object> handleBadCredentialsException(BadCredentialsException ex, WebRequest request) {
        log.warn("[CLIENT_ERROR] 401 Xác thực thất bại: {}", ex.getMessage());
        return buildResponse(HttpStatus.UNAUTHORIZED, "Unauthorized", "Email hoặc mật khẩu không đúng", request);
    }

    @ExceptionHandler(EmailNotVerifiedException.class)
    public ResponseEntity<Object> handleEmailNotVerified(EmailNotVerifiedException ex, WebRequest request) {
        log.warn("[CLIENT_ERROR] 403 Đăng nhập khi chưa xác minh email");
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", LocalDateTime.now());
        body.put("status", HttpStatus.FORBIDDEN.value());
        body.put("error", "Forbidden");
        body.put("code", "EMAIL_NOT_VERIFIED");
        body.put("message", ex.getMessage());
        body.put("path", extractPath(request));
        return new ResponseEntity<>(body, HttpStatus.FORBIDDEN);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Object> handleIllegalArgumentException(IllegalArgumentException ex, WebRequest request) {
        log.warn("[CLIENT_ERROR] 400 Tham số không hợp lệ: {}", ex.getMessage());
        return buildResponse(HttpStatus.BAD_REQUEST, "Bad Request", ex.getMessage(), request);
    }

    // Lưới an toàn: các controller hiện đã tự catch 4 exception dưới đây; nếu nơi nào quên catch
    // thì trả đúng mã thay vì 500 (và không gây cảnh báo mail giả).

    @ExceptionHandler(QuotaExceededException.class)
    public ResponseEntity<Object> handleQuotaExceeded(QuotaExceededException ex, WebRequest request) {
        log.warn("[CLIENT_ERROR] 429 Hết lượt sử dụng: {}", ex.getMessage());
        Map<String, Object> extras = new LinkedHashMap<>();
        extras.put("remaining", 0);
        extras.put("limit", ex.getLimit());
        return buildDomainResponse(HttpStatus.TOO_MANY_REQUESTS, ex.getMessage(), request, extras);
    }

    @ExceptionHandler(PremiumRequiredException.class)
    public ResponseEntity<Object> handlePremiumRequired(PremiumRequiredException ex, WebRequest request) {
        log.warn("[CLIENT_ERROR] 403 Cần Premium: {}", ex.getMessage());
        Map<String, Object> extras = new LinkedHashMap<>();
        extras.put("requiresPremium", true);
        return buildDomainResponse(HttpStatus.FORBIDDEN, ex.getMessage(), request, extras);
    }

    @ExceptionHandler(InvalidImageException.class)
    public ResponseEntity<Object> handleInvalidImage(InvalidImageException ex, WebRequest request) {
        log.warn("[CLIENT_ERROR] 422 Ảnh không đạt yêu cầu AI: {}", ex.getMessage());
        Map<String, Object> extras = new LinkedHashMap<>();
        extras.put("code", "INVALID_IMAGE");
        extras.put("refunded", true);
        return buildDomainResponse(HttpStatus.UNPROCESSABLE_ENTITY, ex.getMessage(), request, extras);
    }

    // Dịch vụ AI chậm: lỗi phía upstream, thỉnh thoảng xảy ra là bình thường → chỉ log, KHÔNG gửi mail
    @ExceptionHandler(AiTimeoutException.class)
    public ResponseEntity<Object> handleAiTimeout(AiTimeoutException ex, WebRequest request) {
        log.warn("[UPSTREAM_TIMEOUT] 504 AI timeout: {}", ex.getMessage());
        Map<String, Object> extras = new LinkedHashMap<>();
        extras.put("refunded", true);
        return buildDomainResponse(HttpStatus.GATEWAY_TIMEOUT, ex.getMessage(), request, extras);
    }

    // ===================== LỖI REQUEST CỦA SPRING MVC (override từ ResponseEntityExceptionHandler) =====================

    /** Validation @Valid thất bại → 400 (giữ nguyên dạng body cũ: error = message đầu tiên, errors = từng field). */
    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(
            MethodArgumentNotValidException ex, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        Map<String, String> fieldErrors = ex.getBindingResult().getFieldErrors().stream()
                .collect(Collectors.toMap(FieldError::getField, FieldError::getDefaultMessage, (a, b) -> a));
        log.warn("[CLIENT_ERROR] 400 Validation failed: {}", fieldErrors);

        String firstMessage = ex.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(FieldError::getDefaultMessage)
                .orElse("Validation Failed");

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", LocalDateTime.now());
        body.put("status", HttpStatus.BAD_REQUEST.value());
        body.put("error", firstMessage);
        body.put("errors", fieldErrors);
        body.put("path", extractPath(request));
        return new ResponseEntity<>(body, headers, HttpStatus.BAD_REQUEST);
    }

    /**
     * Điểm chung của MỌI lỗi Spring MVC còn lại: sai method (405), path lạ (404), thiếu param /
     * JSON sai / sai kiểu (400), file quá lớn (413), media type sai (415)... → trả đúng mã 4xx.
     * Chỉ khi mã là 5xx (hiếm, ví dụ không ghi được response) mới ghi ERROR và gửi cảnh báo.
     */
    @Override
    protected ResponseEntity<Object> handleExceptionInternal(
            Exception ex, Object body, HttpHeaders headers, HttpStatusCode statusCode, WebRequest request) {
        int code = statusCode.value();
        String path = extractPath(request);
        String exName = ex.getClass().getSimpleName();

        if (code >= 500) {
            log.error("[SERVER_ERROR] {} {} at {}: {}", code, exName, path, ex.getMessage(), ex);
            alertService.alert("UNHANDLED_" + exName, "Lỗi " + code + " chưa xử lý: " + exName,
                    "Path: " + path + "\nMessage: " + ex.getMessage());
        } else {
            log.warn("[CLIENT_ERROR] {} {} at {}: {}", code, exName, path, ex.getMessage());
        }

        HttpStatus resolved = HttpStatus.resolve(code);
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("timestamp", LocalDateTime.now());
        res.put("status", code);
        res.put("error", resolved != null ? resolved.getReasonPhrase() : "Error");
        res.put("message", friendlyMessage(code)); // không lộ chi tiết nội bộ của exception cho client
        res.put("path", path);
        return new ResponseEntity<>(res, headers, statusCode);
    }

    // ===================== LỖI HỆ THỐNG (server error) =====================

    /** Lưới cuối: mọi exception chưa được phân loại ở trên đều là LỖI SERVER → log ERROR + gửi cảnh báo mail. */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Object> handleGlobalException(Exception ex, WebRequest request) {
        String path = extractPath(request);
        String exName = ex.getClass().getSimpleName();
        log.error("[SERVER_ERROR] 500 Unexpected error at {}: {}", path, ex.getMessage(), ex);
        alertService.alert("UNHANDLED_" + exName, "Lỗi 500 chưa xử lý: " + exName,
                "Path: " + path + "\nMessage: " + ex.getMessage());
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, "Internal Server Error", "An unexpected error occurred", request);
    }

    // ===================== HELPER =====================

    private String friendlyMessage(int code) {
        return switch (code) {
            case 400 -> "Yêu cầu không hợp lệ.";
            case 401 -> "Bạn cần đăng nhập để thực hiện thao tác này.";
            case 403 -> "Bạn không có quyền thực hiện thao tác này.";
            case 404 -> "Không tìm thấy tài nguyên được yêu cầu.";
            case 405 -> "Phương thức không được hỗ trợ cho đường dẫn này.";
            case 406, 415 -> "Định dạng nội dung không được hỗ trợ.";
            case 413 -> "Tệp tải lên quá lớn.";
            case 429 -> "Bạn thao tác quá nhanh, vui lòng thử lại sau.";
            default -> code >= 500 ? "Hệ thống đang gặp sự cố, vui lòng thử lại sau." : "Yêu cầu không hợp lệ.";
        };
    }

    private ResponseEntity<Object> buildResponse(HttpStatus status, String error, String message, WebRequest request) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", LocalDateTime.now());
        body.put("status", status.value());
        body.put("error", error);
        body.put("message", message);
        body.put("path", extractPath(request));
        return new ResponseEntity<>(body, status);
    }

    /** Body cho exception nghiệp vụ: "error" = thông điệp hiển thị cho user (khớp dạng các controller tự trả). */
    private ResponseEntity<Object> buildDomainResponse(HttpStatus status, String message, WebRequest request,
                                                       Map<String, Object> extras) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", LocalDateTime.now());
        body.put("status", status.value());
        body.put("error", message);
        body.put("message", message);
        body.putAll(extras);
        body.put("path", extractPath(request));
        return new ResponseEntity<>(body, status);
    }

    private String extractPath(WebRequest request) {
        return request.getDescription(false).replace("uri=", "");
    }
}
