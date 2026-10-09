package com.hairapy.utils;

import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;

/**
 * Kiểm tra file upload có thật sự là ảnh (JPEG/PNG/WebP) bằng magic bytes,
 * không tin vào đuôi file hay Content-Type do client tự khai.
 */
public final class ImageValidator {

    private ImageValidator() {
    }

    /** Trả về true nếu 12 byte đầu khớp chữ ký JPEG, PNG hoặc WebP. */
    public static boolean isSupportedImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return false;
        }
        byte[] h = new byte[12];
        try (InputStream in = file.getInputStream()) {
            if (in.readNBytes(h, 0, 12) < 12) {
                return false;
            }
        } catch (IOException e) {
            return false;
        }
        // JPEG: FF D8 FF
        boolean jpeg = (h[0] & 0xFF) == 0xFF && (h[1] & 0xFF) == 0xD8 && (h[2] & 0xFF) == 0xFF;
        // PNG: 89 50 4E 47 0D 0A 1A 0A
        boolean png = (h[0] & 0xFF) == 0x89 && h[1] == 'P' && h[2] == 'N' && h[3] == 'G'
                && h[4] == 0x0D && h[5] == 0x0A && h[6] == 0x1A && h[7] == 0x0A;
        // WebP: "RIFF" .... "WEBP"
        boolean webp = h[0] == 'R' && h[1] == 'I' && h[2] == 'F' && h[3] == 'F'
                && h[8] == 'W' && h[9] == 'E' && h[10] == 'B' && h[11] == 'P';
        return jpeg || png || webp;
    }

    public static final String INVALID_MESSAGE =
            "Tệp không phải ảnh hợp lệ. Chỉ chấp nhận JPG, PNG hoặc WebP.";
}
