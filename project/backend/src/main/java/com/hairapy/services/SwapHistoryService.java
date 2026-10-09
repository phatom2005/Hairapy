package com.hairapy.services;

import com.hairapy.models.SwapHistory;
import com.hairapy.models.User;
import com.hairapy.repositories.SwapHistoryRepository;
import com.hairapy.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Lưu / giới hạn / dọn lịch sử ảnh thử tóc. Mọi lỗi ở đây chỉ ghi log — không được làm hỏng luồng thử tóc chính.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SwapHistoryService {

    /** Số ảnh tối đa giữ cho mỗi user; ảnh cũ nhất bị xoá khi vượt. */
    public static final int MAX_PER_USER = 20;

    private final SwapHistoryRepository swapHistoryRepository;
    private final UserRepository userRepository;
    private final CloudinaryService cloudinaryService;

    /** Ghi 1 ảnh kết quả vào lịch sử rồi cắt bớt ảnh cũ vượt giới hạn. Trả về false nếu không lưu được. */
    public boolean record(Long userId, Long hairstyleId, String hairstyleName, String imageUrl) {
        try {
            // Chỉ lưu khi ảnh đã ở Cloudinary (bền); URL tạm của AILab sẽ hết hạn nên không đưa vào lịch sử
            if (imageUrl == null || !imageUrl.contains("res.cloudinary.com")) {
                return false;
            }
            User user = userRepository.findById(userId).orElse(null);
            if (user == null) return false;

            swapHistoryRepository.save(SwapHistory.builder()
                    .user(user)
                    .hairstyleId(hairstyleId)
                    .hairstyleName(hairstyleName)
                    .imageUrl(imageUrl)
                    .build());
            trimToLimit(user);
            return true;
        } catch (Exception e) {
            log.warn("Không lưu được lịch sử thử tóc cho user {}: {}", userId, e.getMessage());
            return false;
        }
    }

    private void trimToLimit(User user) {
        List<SwapHistory> all = swapHistoryRepository.findByUserOrderByCreatedAtDesc(user);
        if (all.size() <= MAX_PER_USER) return;
        for (SwapHistory old : all.subList(MAX_PER_USER, all.size())) {
            deleteEntryAndImage(old);
        }
    }

    /** Xoá 1 mục của đúng user đó (kèm ảnh Cloudinary). Trả về false nếu không tìm thấy. */
    public boolean deleteOwned(Long id, User user) {
        return swapHistoryRepository.findByIdAndUser(id, user)
                .map(entry -> {
                    deleteEntryAndImage(entry);
                    return true;
                })
                .orElse(false);
    }

    /** Xoá mọi mục cũ hơn cutoff (job dọn hằng ngày). Trả về số mục đã xoá. */
    @Transactional
    public int deleteOlderThan(java.time.LocalDateTime cutoff) {
        List<SwapHistory> expired = swapHistoryRepository.findByCreatedAtBefore(cutoff);
        expired.forEach(this::deleteEntryAndImage);
        return expired.size();
    }

    private void deleteEntryAndImage(SwapHistory entry) {
        String publicId = cloudinaryService.extractPublicId(entry.getImageUrl());
        swapHistoryRepository.delete(entry);
        if (publicId != null) {
            cloudinaryService.delete(publicId); // tự nuốt lỗi và ghi log
        }
    }
}
