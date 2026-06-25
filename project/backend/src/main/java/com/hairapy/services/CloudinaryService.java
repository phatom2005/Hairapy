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
import java.util.Map;

/**
 * Service upload/xóa ảnh trên Cloudinary.
 * Dùng cho: ảnh user upload (selfie), kết quả AI swap, ảnh catalog kiểu tóc.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CloudinaryService {

    private final Cloudinary cloudinary;

    /**
     * Upload file ảnh (MultipartFile) lên Cloudinary.
     *
     * @param file   file ảnh từ request.
     * @param folder thư mục trên Cloudinary (ví dụ: "user-uploads", "ai-results", "catalog").
     * @return URL ảnh đã upload (HTTPS).
     */
    public String uploadFile(MultipartFile file, String folder) {
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
            throw new RuntimeException("Không thể upload ảnh lên cloud storage.");
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
        try {
            Map result = cloudinary.uploader().upload(imageUrl, ObjectUtils.asMap(
                    "folder", "hairapy/" + folder,
                    "resource_type", "image"
            ));
            String url = (String) result.get("secure_url");
            log.info("Upload ảnh từ URL lên Cloudinary thành công: folder={}", folder);
            return url;
        } catch (IOException e) {
            log.error("Lỗi upload ảnh từ URL lên Cloudinary: {}", e.getMessage());
            throw new RuntimeException("Không thể lưu ảnh kết quả AI lên cloud storage.");
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
}
