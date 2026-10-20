package com.hairapy.services;

import com.cloudinary.Api;
import com.cloudinary.Cloudinary;
import com.cloudinary.api.ApiResponse;
import com.hairapy.config.AiLabConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class QuotaServiceTest {

    private RestTemplate restTemplate;
    private Cloudinary cloudinary;
    private Api api;
    private QuotaService service;

    @BeforeEach
    void setUp() throws Exception {
        AiLabConfig config = Mockito.mock(AiLabConfig.class);
        when(config.getApiKey()).thenReturn("test-key");
        restTemplate = Mockito.mock(RestTemplate.class);
        cloudinary = Mockito.mock(Cloudinary.class);
        api = Mockito.mock(Api.class);
        when(cloudinary.api()).thenReturn(api);
        service = new QuotaService(config, restTemplate, cloudinary);
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    private void stubVendors() throws Exception {
        Map<String, Object> body = Map.of("data", List.of(
                Map.of("api_name", "Hair Swap", "balance", 50, "total", 200, "balance_warning", 20)));
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(Map.class)))
                .thenReturn(ResponseEntity.ok((Map) body));

        ApiResponse usage = Mockito.mock(ApiResponse.class);
        when(usage.get("plan")).thenReturn("Free");
        when(usage.get("credits")).thenReturn(Map.of("used_percent", 42.5, "usage", 10.0, "limit", 25.0));
        when(api.usage(any())).thenReturn(usage);
    }

    @Test
    void parsesAiLabAndCloudinaryQuota() throws Exception {
        stubVendors();

        QuotaService.QuotaSnapshot snap = service.getSnapshot(false);

        assertNull(snap.ailab().error());
        assertEquals(1, snap.ailab().items().size());
        QuotaService.AiLabItem item = snap.ailab().items().get(0);
        assertEquals("Hair Swap", item.name());
        assertEquals(50L, item.balance());
        assertEquals(200L, item.total());
        assertEquals(25.0, item.percentLeft());

        assertNull(snap.cloudinary().error());
        assertEquals("Free", snap.cloudinary().plan());
        assertEquals(42.5, snap.cloudinary().usedPercent());
    }

    @Test
    void cachesResultAndHonoursMinimumRefreshInterval() throws Exception {
        stubVendors();

        service.getSnapshot(false);
        service.getSnapshot(false);
        // forceRefresh ngay sau lần gọi thật vẫn dùng cache (chưa đủ 60 giây)
        service.getSnapshot(true);

        verify(restTemplate, times(1)).exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(Map.class));
        verify(api, times(1)).usage(any());
    }

    @Test
    void vendorFailureIsReportedWithoutThrowing() throws Exception {
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(Map.class)))
                .thenThrow(new RestClientException("boom"));
        when(api.usage(any())).thenThrow(new RuntimeException("boom"));

        QuotaService.QuotaSnapshot snap = service.getSnapshot(false);

        assertNotNull(snap.ailab().error());
        assertTrue(snap.ailab().items().isEmpty());
        assertNotNull(snap.cloudinary().error());
    }
}
