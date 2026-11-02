package com.hairapy.services;

import com.hairapy.models.SwapHistory;
import com.hairapy.models.User;
import com.hairapy.repositories.SwapHistoryRepository;
import com.hairapy.repositories.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.NoSuchElementException;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/** Phase 7.2: thay ảnh lịch sử bằng ảnh đã ghép giữ danh tính. */
@ExtendWith(MockitoExtension.class)
class SwapHistoryCompositeTest {

    @Mock SwapHistoryRepository swapHistoryRepository;
    @Mock UserRepository userRepository;
    @Mock CloudinaryService cloudinaryService;

    SwapHistoryService service;
    User user;
    byte[] bytes = new byte[]{1, 2, 3};

    @BeforeEach
    void setUp() {
        service = new SwapHistoryService(swapHistoryRepository, userRepository, cloudinaryService);
        user = User.builder().id(7L).email("a@x.vn").build();
    }

    private SwapHistory entry(LocalDateTime createdAt, boolean composited) {
        return SwapHistory.builder().id(5L).user(user).imageUrl("https://res.cloudinary.com/old.jpg")
                .createdAt(createdAt).composited(composited).build();
    }

    @Test
    void khongPhaiChu_hoacKhongTonTai_nemNoSuchElement() {
        when(swapHistoryRepository.findByIdAndUser(5L, user)).thenReturn(Optional.empty());
        assertThrows(NoSuchElementException.class, () -> service.replaceWithComposite(5L, user, bytes, true));
        verify(cloudinaryService, never()).uploadBytes(any(), any(), anyBoolean());
    }

    @Test
    void daGhepRoi_khongChoGhepLan2() {
        when(swapHistoryRepository.findByIdAndUser(5L, user)).thenReturn(Optional.of(entry(LocalDateTime.now(), true)));
        assertThrows(IllegalArgumentException.class, () -> service.replaceWithComposite(5L, user, bytes, true));
        verify(cloudinaryService, never()).uploadBytes(any(), any(), anyBoolean());
    }

    @Test
    void quaHan24h_tuChoi() {
        when(swapHistoryRepository.findByIdAndUser(5L, user))
                .thenReturn(Optional.of(entry(LocalDateTime.now().minusHours(25), false)));
        assertThrows(IllegalArgumentException.class, () -> service.replaceWithComposite(5L, user, bytes, true));
        verify(cloudinaryService, never()).uploadBytes(any(), any(), anyBoolean());
    }

    @Test
    void hopLe_uploadDungWatermark_capNhatUrl_xoaAnhCu() {
        SwapHistory e = entry(LocalDateTime.now().minusMinutes(1), false);
        when(swapHistoryRepository.findByIdAndUser(5L, user)).thenReturn(Optional.of(e));
        when(cloudinaryService.extractPublicId("https://res.cloudinary.com/old.jpg")).thenReturn("hairapy/swap-history/old");
        when(cloudinaryService.uploadBytes(bytes, "swap-history", true)).thenReturn("https://res.cloudinary.com/new.jpg");
        when(swapHistoryRepository.save(any(SwapHistory.class))).thenAnswer(inv -> inv.getArgument(0));

        SwapHistory saved = service.replaceWithComposite(5L, user, bytes, true);

        assertEquals("https://res.cloudinary.com/new.jpg", saved.getImageUrl());
        assertTrue(saved.isComposited());
        verify(cloudinaryService).uploadBytes(bytes, "swap-history", true);
        verify(cloudinaryService).delete(eq("hairapy/swap-history/old"));
    }
}
