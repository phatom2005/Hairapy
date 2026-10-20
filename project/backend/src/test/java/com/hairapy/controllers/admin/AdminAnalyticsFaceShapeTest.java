package com.hairapy.controllers.admin;

import com.hairapy.models.HairstyleCatalog;
import com.hairapy.repositories.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyIterable;
import static org.mockito.Mockito.when;

/** Test thuần Mockito (không khởi động Spring) cho API top kiểu tóc theo dáng mặt. */
class AdminAnalyticsFaceShapeTest {

    private SavedHairstyleRepository savedRepo;
    private UsageHistoryRepository usageRepo;
    private HairstyleCatalogRepository catalogRepo;
    private AdminAnalyticsController controller;

    @BeforeEach
    void setUp() {
        savedRepo = Mockito.mock(SavedHairstyleRepository.class);
        usageRepo = Mockito.mock(UsageHistoryRepository.class);
        catalogRepo = Mockito.mock(HairstyleCatalogRepository.class);
        controller = new AdminAnalyticsController(
                Mockito.mock(UserRepository.class),
                Mockito.mock(SubscriptionRepository.class),
                Mockito.mock(PaymentRepository.class),
                savedRepo, usageRepo, catalogRepo);

        // id1: 3 lưu + 2 thử; id2: 1 lưu; id3: 5 thử
        when(savedRepo.topSaved(any())).thenReturn(List.of(new Object[]{1L, 3L}, new Object[]{2L, 1L}));
        when(usageRepo.topTriedSince(any(), any())).thenReturn(List.of(new Object[]{1L, 2L}, new Object[]{3L, 5L}));
        when(catalogRepo.findAllById(anyIterable())).thenReturn(List.of(
                HairstyleCatalog.builder().id(1L).name("Alpha").imageUrl("a.jpg").faceShape("Oval, Round").build(),
                HairstyleCatalog.builder().id(2L).name("Beta").imageUrl("b.jpg").faceShape("Oval").build(),
                HairstyleCatalog.builder().id(3L).name("Gamma").imageUrl("g.jpg").faceShape("Round").build()));
    }

    private Map<String, List<AdminAnalyticsController.FaceShapeHairstyle>> call(int limit) {
        return controller.hairstylesByFaceShape(limit, 30).getBody().stream()
                .collect(Collectors.toMap(AdminAnalyticsController.FaceShapeRanking::faceShape,
                        AdminAnalyticsController.FaceShapeRanking::items));
    }

    @Test
    void groupsByEachFaceShapeAndRanksBySavedPlusTried() {
        var result = call(5);

        assertEquals(2, result.size());
        // Oval: Alpha (3+2=5) trước Beta (1)
        assertEquals(List.of("Alpha", "Beta"), result.get("Oval").stream().map(i -> i.name()).toList());
        assertEquals(3L, result.get("Oval").get(0).saved());
        assertEquals(2L, result.get("Oval").get(0).tried());
        // Round: Alpha và Gamma cùng 5 điểm → xếp theo tên
        assertEquals(List.of("Alpha", "Gamma"), result.get("Round").stream().map(i -> i.name()).toList());
    }

    @Test
    void limitsItemsPerFaceShape() {
        var result = call(1);

        assertEquals(1, result.get("Oval").size());
        assertEquals(1, result.get("Round").size());
    }

    @Test
    void returnsEmptyListWhenNothingTracked() {
        when(savedRepo.topSaved(any())).thenReturn(List.of());
        when(usageRepo.topTriedSince(any(), any())).thenReturn(List.of());
        when(catalogRepo.findAllById(anyIterable())).thenReturn(List.of());

        assertEquals(0, controller.hairstylesByFaceShape(5, 30).getBody().size());
    }
}
