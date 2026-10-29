package com.hairapy.services;

import com.hairapy.dto.insight.FaceShapeStyleResponse;
import com.hairapy.dto.insight.TrendingStyleResponse;
import com.hairapy.models.HairstyleCatalog;
import com.hairapy.models.ScanHistory;
import com.hairapy.models.User;
import com.hairapy.repositories.HairstyleCatalogRepository;
import com.hairapy.repositories.SavedHairstyleRepository;
import com.hairapy.repositories.ScanHistoryRepository;
import com.hairapy.repositories.UsageHistoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TrendServiceTest {

    @Mock
    private GaReportService gaReportService;

    @Mock
    private HairstyleCatalogRepository hairstyleCatalogRepository;

    @Mock
    private UsageHistoryRepository usageHistoryRepository;

    @Mock
    private SavedHairstyleRepository savedHairstyleRepository;

    @Mock
    private ScanHistoryRepository scanHistoryRepository;

    private TrendService trendService;

    @BeforeEach
    void setUp() {
        trendService = new TrendService(
                gaReportService,
                hairstyleCatalogRepository,
                usageHistoryRepository,
                savedHairstyleRepository,
                scanHistoryRepository
        );
    }

    @Test
    void getTrending_gaChuaCauHinh_fallbackDBVaNguonLaDB() {
        when(gaReportService.isConfigured()).thenReturn(false);

        HairstyleCatalog style1 = HairstyleCatalog.builder()
                .id(1L)
                .name("Layer Nữ Hàn Quốc")
                .imageUrl("https://example.com/layer.jpg")
                .gender("Nữ")
                .active(true)
                .build();

        when(hairstyleCatalogRepository.findAll()).thenReturn(List.of(style1));

        // 3 lượt swap (điểm: 3*3=9), 2 lượt lưu (điểm: 2*2=4) -> tổng 5 lượt (đủ ngưỡng), score = 13.0
        when(usageHistoryRepository.countSwapsBetween(any(), any()))
                .thenReturn(List.<Object[]>of(new Object[]{1L, 3L}))
                .thenReturn(List.<Object[]>of()); // prev period rỗng
        when(savedHairstyleRepository.countSavesBetween(any(), any()))
                .thenReturn(List.<Object[]>of(new Object[]{1L, 2L}))
                .thenReturn(List.<Object[]>of());

        List<TrendingStyleResponse> trending = trendService.getTrending(null, 8);

        assertEquals(1, trending.size());
        TrendingStyleResponse item = trending.get(0);
        assertEquals(1L, item.hairstyleId());
        assertEquals("db", item.source());
        assertEquals(13.0, item.score());
        assertEquals(100.0, item.growthPct()); // prev = 0 nên growth = 100%
    }

    @Test
    void getTrending_duoiNguong5Luot_biLoai() {
        when(gaReportService.isConfigured()).thenReturn(false);

        HairstyleCatalog style1 = HairstyleCatalog.builder()
                .id(1L)
                .name("Kiểu Ít Lượt")
                .imageUrl("https://example.com/few.jpg")
                .gender("Nam")
                .active(true)
                .build();

        when(hairstyleCatalogRepository.findAll()).thenReturn(List.of(style1));

        // Chỉ có 2 swap + 1 save = 3 lượt (< 5)
        when(usageHistoryRepository.countSwapsBetween(any(), any()))
                .thenReturn(List.<Object[]>of(new Object[]{1L, 2L}))
                .thenReturn(List.<Object[]>of());
        when(savedHairstyleRepository.countSavesBetween(any(), any()))
                .thenReturn(List.<Object[]>of(new Object[]{1L, 1L}))
                .thenReturn(List.<Object[]>of());

        List<TrendingStyleResponse> trending = trendService.getTrending(null, 8);

        assertTrue(trending.isEmpty(), "Kiểu tóc dưới 5 lượt thao tác phải bị loại bỏ");
    }

    @Test
    void getTrending_gopBienTheVeKieuGoc() {
        when(gaReportService.isConfigured()).thenReturn(false);

        HairstyleCatalog baseStyle = HairstyleCatalog.builder()
                .id(10L)
                .name("Undercut Gốc")
                .imageUrl("https://example.com/undercut.jpg")
                .gender("Nam")
                .active(true)
                .build();

        HairstyleCatalog variantStyle = HairstyleCatalog.builder()
                .id(11L)
                .baseStyleId(10L)
                .name("Undercut Nhuộm Nâu")
                .imageUrl("https://example.com/undercut-brown.jpg")
                .gender("Nam")
                .active(true)
                .build();

        when(hairstyleCatalogRepository.findAll()).thenReturn(List.of(baseStyle, variantStyle));

        // Base 2 swaps, variant 3 swaps -> gộp lại là 5 swaps cho base 10 (đạt ngưỡng)
        when(usageHistoryRepository.countSwapsBetween(any(), any()))
                .thenReturn(List.<Object[]>of(new Object[]{10L, 2L}, new Object[]{11L, 3L}))
                .thenReturn(List.<Object[]>of());
        when(savedHairstyleRepository.countSavesBetween(any(), any()))
                .thenReturn(List.<Object[]>of())
                .thenReturn(List.<Object[]>of());

        List<TrendingStyleResponse> trending = trendService.getTrending("Nam", 8);

        assertEquals(1, trending.size());
        assertEquals(10L, trending.get(0).hairstyleId());
        assertEquals(15.0, trending.get(0).score()); // 5 swaps * 3 = 15.0
    }

    @Test
    void getFaceShapeStyles_khopDongNghiaDoiTuongVaLayTopKieu() {
        when(gaReportService.isConfigured()).thenReturn(false);

        HairstyleCatalog style = HairstyleCatalog.builder()
                .id(5L)
                .name("Tóc hợp mặt trái xoan")
                .imageUrl("https://example.com/oval.jpg")
                .active(true)
                .build();

        when(hairstyleCatalogRepository.findAll()).thenReturn(List.of(style));

        User user1 = User.builder().id(100L).build();
        ScanHistory scan = ScanHistory.builder()
                .id(1L)
                .user(user1)
                .faceShape("Trái xoan") // tiếng Việt đồng nghĩa với "Oval"
                .createdAt(LocalDateTime.now())
                .build();

        when(scanHistoryRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(scan));
        when(usageHistoryRepository.countSwapsByUserIdsSince(eq(List.of(100L)), any()))
                .thenReturn(List.<Object[]>of(new Object[]{5L, 8L}));

        List<FaceShapeStyleResponse> result = trendService.getFaceShapeStyles("Oval");

        assertEquals(1, result.size());
        assertEquals(5L, result.get(0).hairstyleId());
        assertEquals(8L, result.get(0).tries());
        assertEquals("db", result.get(0).source());
    }
}

