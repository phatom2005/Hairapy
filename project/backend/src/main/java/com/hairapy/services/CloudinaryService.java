package com.hairapy.services;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Service upload/xóa ảnh trên Cloudinary.
 * Dùng cho: ảnh user upload (selfie), kết quả AI swap, ảnh catalog kiểu tóc.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CloudinaryService {

    // Watermark chữ "Hairapy" cho ảnh kết quả của user Free (xem uploadFromUrl)
    static final String WATERMARK_TRANSFORMATION =
            "l_text:Arial_60_bold:Hairapy,co_white,o_65/fl_layer_apply,g_south_east,x_30,y_30";

    private final Cloudinary cloudinary;
    private final AlertService alertService;

    /**
     * Upload file ảnh (MultipartFile) lên Cloudinary.
     *
     * @param file   file ảnh từ request.
     * @param folder thư mục trên Cloudinary (ví dụ: "user-uploads", "ai-results", "catalog").
     * @return URL ảnh đã upload (HTTPS).
     */
    public String uploadFile(MultipartFile file, String folder) {
        // Chặn file giả dạng ảnh (kiểm tra magic bytes) trước khi đẩy lên cloud
        if (!com.hairapy.utils.ImageValidator.isSupportedImage(file)) {
            throw new IllegalArgumentException(com.hairapy.utils.ImageValidator.INVALID_MESSAGE);
        }
        try {
            Map result = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.asMap(
                    "folder", "hairapy/" + folder,
                    "resource_type", "image"
            ));
            String url = (String) result.get("secure_url");
            log.info("Upload ảnh thành công lên Cloudinary: folder={}, url={}...", folder, url.substring(0, Math.min(60, url.length())));
            return url;
        } catch (IOException e) {
            log.error("Lỗi upload ảnh lên Cloudinary: {}", e.getMessage());
            alertService.alert("CLOUDINARY_UPLOAD", "Upload ảnh lên Cloudinary thất bại", String.valueOf(e.getMessage()));
            throw new RuntimeException("Không thể upload ảnh lên cloud storage.");
        } catch (RuntimeException e) {
            // SDK Cloudinary ném RuntimeException khi sai key / hết quota / bị từ chối
            alertService.alert("CLOUDINARY_UPLOAD", "Upload ảnh lên Cloudinary thất bại", String.valueOf(e.getMessage()));
            throw e;
        }
    }

    /**
     * Upload ảnh từ URL (ví dụ: URL kết quả từ AI Pro API) lên Cloudinary.
     *
     * @param imageUrl URL ảnh nguồn (temporary URL từ AILab).
     * @param folder   thư mục trên Cloudinary.
     * @return URL ảnh permanent trên Cloudinary.
     */
    public String uploadFromUrl(String imageUrl, String folder) {
        return uploadFromUrl(imageUrl, folder, false);
    }

    /**
     * Upload ảnh từ URL, có thể gắn watermark text "Hairapy" (dùng cho user Free).
     *
     * @param watermark true → gắn watermark góc dưới phải, dùng cho tier Free.
     */
    public String uploadFromUrl(String imageUrl, String folder, boolean watermark) {
        try {
            Map<String, Object> options = new java.util.HashMap<>(ObjectUtils.asMap(
                    "folder", "hairapy/" + folder,
                    "resource_type", "image"
            ));

            if (watermark) {
                // PHẢI truyền dạng CHUỖI transformation (hoặc đối tượng Transformation của SDK).
                // Truyền List<Map> thì SDK chuyển thành chuỗi "[{x=30, ...}]" → Cloudinary báo
                // "Invalid transformation component". Cú pháp: component layer (chữ, màu, độ mờ)
                // "/" rồi fl_layer_apply kèm vị trí (góc dưới phải, cách mép 30px).
                options.put("transformation", WATERMARK_TRANSFORMATION);
            }

            Map result = cloudinary.uploader().upload(imageUrl, options);
            String url = (String) result.get("secure_url");
            log.info("Upload ảnh từ URL lên Cloudinary thành công: folder={}, watermark={}", folder, watermark);
            return url;
        } catch (IOException e) {
            log.error("Lỗi upload ảnh từ URL lên Cloudinary: {}", e.getMessage());
            alertService.alert("CLOUDINARY_UPLOAD", "Upload ảnh lên Cloudinary thất bại", String.valueOf(e.getMessage()));
            throw new RuntimeException("Không thể lưu ảnh kết quả AI lên cloud storage.");
        } catch (RuntimeException e) {
            alertService.alert("CLOUDINARY_UPLOAD", "Upload ảnh lên Cloudinary thất bại", String.valueOf(e.getMessage()));
            throw e;
        }
    }

    /**
     * Xóa ảnh trên Cloudinary theo public_id.
     *
     * @param publicId public_id của ảnh (ví dụ: "hairapy/user-uploads/abc123").
     */
    public void delete(String publicId) {
        try {
            cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
            log.info("Đã xóa ảnh trên Cloudinary: {}", publicId);
        } catch (IOException e) {
            log.warn("Không thể xóa ảnh trên Cloudinary: {} — {}", publicId, e.getMessage());
        }
    }

    /**
     * Trích xuất public_id từ URL Cloudinary.
     * Ví dụ:
     * "https://res.cloudinary.com/cloud/image/upload/v1234567/hairapy/scans/sample.jpg" -> "hairapy/scans/sample"
     * "https://res.cloudinary.com/cloud/image/upload/hairapy/scans/sample.png" -> "hairapy/scans/sample"
     *
     * @param url URL ảnh Cloudinary đầy đủ.
     * @return public_id của ảnh, hoặc null nếu URL không hợp lệ.
     */
    public String extractPublicId(String url) {
        if (url == null || url.isBlank()) {
            return null;
        }
        int uploadIdx = url.indexOf("/upload/");
        if (uploadIdx == -1) {
            return null;
        }
        String path = url.substring(uploadIdx + "/upload/".length());
        int queryIdx = path.indexOf('?');
        if (queryIdx != -1) {
            path = path.substring(0, queryIdx);
        }

        // Ưu tiên nhận diện cấu trúc folder hairapy/ của dự án
        int hairapyIdx = path.indexOf("hairapy/");
        if (hairapyIdx != -1) {
            path = path.substring(hairapyIdx);
        } else {
            // Trường hợp không có prefix hairapy/, lược bỏ version v12345/ và transformation nếu có
            path = path.replaceFirst("^(?:[a-zA-Z0-9_,]+(?:/[a-zA-Z0-9_,]+)*/)?(?:v\\d+/)?", "");
        }

        int dotIdx = path.lastIndexOf('.');
        if (dotIdx != -1) {
            path = path.substring(0, dotIdx);
        }
        return path.isEmpty() ? null : path;
    }

    /**
     * Lọc ra danh sách public_id của ảnh đã hết hạn (created_at trước cutoff).
     * Tách riêng thành pure function để unit test không cần mock Cloudinary SDK.
     *
     * @param resources danh sách resource từ Cloudinary Admin API — mỗi phần tử là Map
     *                   có ít nhất 2 key: "public_id" (String), "created_at" (String, ISO-8601 UTC).
     * @param cutoff     mốc thời gian — ảnh có created_at TRƯỚC mốc này bị coi là hết hạn.
     */
    public List<String> filterExpiredPublicIds(List<Map<String, Object>> resources, Instant cutoff) {
        List<String> expired = new ArrayList<>();
        for (Map<String, Object> resource : resources) {
            Object publicIdObj = resource.get("public_id");
            Object createdAtObj = resource.get("created_at");
            if (publicIdObj == null || createdAtObj == null) {
                continue;
            }
            try {
                Instant createdAt = Instant.parse(createdAtObj.toString());
                if (createdAt.isBefore(cutoff)) {
                    expired.add(publicIdObj.toString());
                }
            } catch (Exception e) {
                log.warn("Không parse được created_at của ảnh {}: {}", publicIdObj, createdAtObj);
            }
        }
        return expired;
    }

    /**
     * Xoá toàn bộ ảnh trong 1 folder Cloudinary đã tồn tại quá `maxAge`.
     * Dùng Cloudinary Admin API để liệt kê (có phân trang qua next_cursor) vì folder
     * này KHÔNG có bảng DB nào theo dõi thời điểm upload.
     *
     * @param folderPrefix ví dụ "hairapy/ai-results/" — PHẢI có dấu "/" cuối để prefix chính xác.
     * @param maxAge       ví dụ Duration.ofHours(24).
     * @return số lượng ảnh đã xoá.
     */
    public int deleteExpiredResources(String folderPrefix, Duration maxAge) {
        Instant cutoff = Instant.now().minus(maxAge);
        int totalDeleted = 0;
        String nextCursor = null;

        do {
            Map<String, Object> options = new HashMap<>();
            options.put("type", "upload");
            options.put("prefix", folderPrefix);
            options.put("max_results", 500);
            if (nextCursor != null) {
                options.put("next_cursor", nextCursor);
            }

            try {
                com.cloudinary.api.ApiResponse response = cloudinary.api().resources(options);
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> resources = (List<Map<String, Object>>) response.get("resources");
                if (resources == null || resources.isEmpty()) {
                    break;
                }

                List<String> expiredIds = filterExpiredPublicIds(resources, cutoff);
                if (!expiredIds.isEmpty()) {
                    cloudinary.api().deleteResources(expiredIds, ObjectUtils.emptyMap());
                    totalDeleted += expiredIds.size();
                    log.info("Đã xoá {} ảnh hết hạn trong folder {}", expiredIds.size(), folderPrefix);
                }

                Object cursorObj = response.get("next_cursor");
                nextCursor = cursorObj != null ? cursorObj.toString() : null;
            } catch (Exception e) {
                log.error("Lỗi khi dọn ảnh hết hạn trong folder {}: {}", folderPrefix, e.getMessage());
                break; // tránh vòng lặp vô hạn nếu Cloudinary API lỗi giữa chừng
            }
        } while (nextCursor != null);

        return totalDeleted;
    }
}
