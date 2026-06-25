package com.hairapy.services;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

/**
 * Service xử lý tải ảnh lên Cloudinary.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CloudinaryService {

    private final Cloudinary cloudinary;

    /**
     * Upload file ảnh từ MultipartFile lên Cloudinary.
     * Trả về URL bảo mật.
     */
    public String upload(MultipartFile file) {
        try {
            if (file.isEmpty()) {
                throw new IllegalArgumentException("File ảnh không được để trống.");
            }
            Map uploadResult = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.asMap(
                    "folder", "hairapy/scans"
            ));
            return (String) uploadResult.get("secure_url");
        } catch (IOException e) {
            log.error("Lỗi khi upload ảnh lên Cloudinary", e);
            throw new RuntimeException("Không thể lưu trữ hình ảnh.");
        }
    }

    /**
     * Tải ảnh từ URL bên ngoài (như AILab CDN) và upload lên Cloudinary.
     * Trả về URL bảo mật.
     */
    public String uploadFromUrl(String imageUrl) {
        try {
            if (imageUrl == null || imageUrl.isBlank()) {
                throw new IllegalArgumentException("URL ảnh không được để trống.");
            }
            Map uploadResult = cloudinary.uploader().upload(imageUrl, ObjectUtils.asMap(
                    "folder", "hairapy/results"
            ));
            return (String) uploadResult.get("secure_url");
        } catch (IOException e) {
            log.error("Lỗi khi upload ảnh từ URL lên Cloudinary: {}", imageUrl, e);
            throw new RuntimeException("Không thể lưu trữ hình ảnh kết quả.");
        }
    }
}
