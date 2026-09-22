package com.hairapy.services;

import com.hairapy.models.Subscription;
import com.hairapy.models.SubscriptionPlan;
import com.hairapy.models.SubscriptionStatus;
import com.hairapy.repositories.SubscriptionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SubscriptionServiceTest {

    @Mock
    private SubscriptionRepository subscriptionRepository;

    private SubscriptionService subscriptionService;

    @BeforeEach
    void setUp() {
        subscriptionService = new SubscriptionService(subscriptionRepository);
    }

    @Test
    void isPaidUser_ActivePaidSubscriptionWithFutureEndDate_ReturnsTrue() {
        Long userId = 1L;
        Subscription sub = Subscription.builder()
                .status(SubscriptionStatus.ACTIVE)
                .plan(SubscriptionPlan.PREMIUM)
                .endDate(LocalDateTime.now().plusDays(10))
                .build();

        when(subscriptionRepository.findByUserIdAndStatus(userId, SubscriptionStatus.ACTIVE))
                .thenReturn(Optional.of(sub));

        assertTrue(subscriptionService.isPaidUser(userId));
    }

    @Test
    void isPaidUser_ActivePaidSubscriptionWithPastEndDate_ReturnsFalse() {
        Long userId = 1L;
        Subscription sub = Subscription.builder()
                .status(SubscriptionStatus.ACTIVE)
                .plan(SubscriptionPlan.PREMIUM)
                .endDate(LocalDateTime.now().minusHours(1))
                .build();

        when(subscriptionRepository.findByUserIdAndStatus(userId, SubscriptionStatus.ACTIVE))
                .thenReturn(Optional.of(sub));

        assertFalse(subscriptionService.isPaidUser(userId));
    }

    @Test
    void isPaidUser_ActivePaidSubscriptionWithNullEndDate_ReturnsTrue() {
        Long userId = 1L;
        Subscription sub = Subscription.builder()
                .status(SubscriptionStatus.ACTIVE)
                .plan(SubscriptionPlan.PRO)
                .endDate(null)
                .build();

        when(subscriptionRepository.findByUserIdAndStatus(userId, SubscriptionStatus.ACTIVE))
                .thenReturn(Optional.of(sub));

        assertTrue(subscriptionService.isPaidUser(userId));
    }

    @Test
    void isPaidUser_ActiveFreeSubscription_ReturnsFalse() {
        Long userId = 1L;
        Subscription sub = Subscription.builder()
                .status(SubscriptionStatus.ACTIVE)
                .plan(SubscriptionPlan.FREE)
                .endDate(LocalDateTime.now().plusDays(30))
                .build();

        when(subscriptionRepository.findByUserIdAndStatus(userId, SubscriptionStatus.ACTIVE))
                .thenReturn(Optional.of(sub));

        assertFalse(subscriptionService.isPaidUser(userId));
    }

    @Test
    void isPaidUser_NoActiveSubscription_ReturnsFalse() {
        Long userId = 1L;
        when(subscriptionRepository.findByUserIdAndStatus(userId, SubscriptionStatus.ACTIVE))
                .thenReturn(Optional.empty());

        assertFalse(subscriptionService.isPaidUser(userId));
    }
}
