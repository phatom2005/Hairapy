package com.hairapy.services;

import com.hairapy.models.AuthProvider;
import com.hairapy.models.Role;
import com.hairapy.models.ScanHistory;
import com.hairapy.models.User;
import com.hairapy.repositories.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AccountDeletionServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private ScanHistoryRepository scanHistoryRepository;
    @Mock
    private SavedHairstyleRepository savedHairstyleRepository;
    @Mock
    private UsageHistoryRepository usageHistoryRepository;
    @Mock
    private SubscriptionRepository subscriptionRepository;
    @Mock
    private PasswordResetTokenRepository passwordResetTokenRepository;
    @Mock
    private FeedbackRepository feedbackRepository;
    @Mock
    private CloudinaryService cloudinaryService;

    private AccountDeletionService accountDeletionService;

    @BeforeEach
    void setUp() {
        accountDeletionService = new AccountDeletionService(
                userRepository,
                scanHistoryRepository,
                savedHairstyleRepository,
                usageHistoryRepository,
                subscriptionRepository,
                passwordResetTokenRepository,
                feedbackRepository,
                cloudinaryService
        );
    }

    @Test
    void deleteAccount_DeletesChildRecordsAndAnonymizesUser() {
        User user = User.builder()
                .id(42L)
                .email("test@hairapy.id.vn")
                .passwordHash("hashed_secret")
                .fullName("Nguyen Van A")
                .phone("0912345678")
                .role(Role.USER)
                .provider(AuthProvider.LOCAL)
                .build();

        ScanHistory scan = ScanHistory.builder()
                .id(1L)
                .imageUrl("https://res.cloudinary.com/demo/image/upload/v1/hairapy/scans/scan_1.jpg")
                .build();

        when(scanHistoryRepository.findByUserId(42L)).thenReturn(List.of(scan));
        when(cloudinaryService.extractPublicId(scan.getImageUrl())).thenReturn("hairapy/scans/scan_1");

        List<String> publicIds = accountDeletionService.deleteAccount(user);

        // Verify child records deleted
        verify(passwordResetTokenRepository).deleteByUserId(42L);
        verify(savedHairstyleRepository).deleteByUserId(42L);
        verify(scanHistoryRepository).deleteByUserId(42L);
        verify(usageHistoryRepository).deleteByUserId(42L);
        verify(subscriptionRepository).deleteByUserId(42L);
        verify(feedbackRepository).clearCommentsByUserId(42L);

        // Verify user anonymized
        assertEquals("deleted-42@deleted.hairapy.invalid", user.getEmail());
        assertNull(user.getPasswordHash());
        assertEquals("Tài khoản đã xoá", user.getFullName());
        assertNull(user.getPhone());
        assertNull(user.getDateOfBirth());
        assertEquals(AuthProvider.LOCAL, user.getProvider());
        assertNull(user.getProviderId());
        assertEquals(Role.USER, user.getRole());

        verify(userRepository).save(user);

        // Verify public IDs collected
        assertEquals(1, publicIds.size());
        assertEquals("hairapy/scans/scan_1", publicIds.get(0));
    }
}
