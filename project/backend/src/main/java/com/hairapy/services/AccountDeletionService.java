package com.hairapy.services;

import com.hairapy.models.AuthProvider;
import com.hairapy.models.Role;
import com.hairapy.models.ScanHistory;
import com.hairapy.models.User;
import com.hairapy.repositories.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;

/**
 * Service xử lý xoá và ẩn danh hoá tài khoản người dùng theo quy định bảo mật & Google Play.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AccountDeletionService {

    private final UserRepository userRepository;
    private final ScanHistoryRepository scanHistoryRepository;
    private final SavedHairstyleRepository savedHairstyleRepository;
    private final UsageHistoryRepository usageHistoryRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final EmailVerificationTokenRepository emailVerificationTokenRepository;
    private final FeedbackRepository feedbackRepository;
    private final CloudinaryService cloudinaryService;

    /**
     * Xóa các dữ liệu phụ thuộc của user và ẩn danh hoá thông tin người dùng trong CSDL.
     * Giữ nguyên các dòng thanh toán (payments) vì lý do kế toán.
     * Lưu ý: Không gọi Cloudinary trong method transactional này; thay vào đó trả về
     * danh sách publicId để caller (controller) gọi xóa sau khi transaction đã commit.
     *
     * @param user thực thể người dùng cần xóa.
     * @return danh sách public_id của ảnh scan trên Cloudinary cần được dọn dẹp.
     */
    @Transactional
    public List<String> deleteAccount(User user) {
        Long userId = user.getId();

        // 1. Thu thập public_id từ các ảnh trong ScanHistory trước khi xoá bản ghi
        List<ScanHistory> scans = scanHistoryRepository.findByUserId(userId);
        List<String> publicIdsToDelete = scans.stream()
                .map(ScanHistory::getImageUrl)
                .map(cloudinaryService::extractPublicId)
                .filter(Objects::nonNull)
                .toList();

        // 2. Xóa các dữ liệu cá nhân liên quan
        passwordResetTokenRepository.deleteByUserId(userId);
        emailVerificationTokenRepository.deleteByUserId(userId);
        savedHairstyleRepository.deleteByUserId(userId);
        scanHistoryRepository.deleteByUserId(userId);
        usageHistoryRepository.deleteByUserId(userId);
        subscriptionRepository.deleteByUserId(userId);
        feedbackRepository.clearCommentsByUserId(userId);

        log.info("Đã xóa dữ liệu liên quan của user ID {}. Nếu user có subscription ACTIVE, gói đã bị hủy và không hoàn tiền.", userId);

        // 3. Ẩn danh hoá thông tin User (giữ bản ghi để foreign key trong bảng payments không bị vi phạm)
        user.setEmail("deleted-" + userId + "@deleted.hairapy.invalid");
        user.setPasswordHash(null);
        user.setFullName("Tài khoản đã xoá");
        user.setPhone(null);
        user.setDateOfBirth(null);
        user.setProvider(AuthProvider.LOCAL);
        user.setProviderId(null);
        user.setRole(Role.USER);

        userRepository.save(user);
        log.info("Đã ẩn danh hoá tài khoản user ID {}", userId);

        return publicIdsToDelete;
    }
}
