package com.hairapy.services;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpEntity;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GaMeasurementServiceTest {

    @Mock
    private RestTemplate restTemplate;

    private GaMeasurementService service;

    @BeforeEach
    void setUp() {
        service = new GaMeasurementService(new RestTemplateBuilder());
        service.setRestTemplate(restTemplate);
    }

    @Test
    void send_chuaCauHinh_khongGoiHttp() {
        service.setConfig(null, null);

        service.sendSync("123.456", 1L, "purchase", Map.of("value", 49000));

        verifyNoInteractions(restTemplate);
    }

    @Test
    void send_thieuSecret_khongGoiHttp() {
        service.setConfig("G-XXXXX", "");

        service.sendSync("123.456", 1L, "purchase", Map.of("value", 49000));

        verifyNoInteractions(restTemplate);
    }

    @Test
    @SuppressWarnings("unchecked")
    void send_hopLe_goiHttpDungUrlVaPayload() {
        service.setConfig("G-TEST123", "secret-xyz");

        service.sendSync("111.222", 10L, "purchase", Map.of("value", 99000, "currency", "VND"));

        ArgumentCaptor<String> urlCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<HttpEntity> entityCaptor = ArgumentCaptor.forClass(HttpEntity.class);

        verify(restTemplate).postForObject(urlCaptor.capture(), entityCaptor.capture(), eq(String.class));

        String url = urlCaptor.getValue();
        assertTrue(url.contains("measurement_id=G-TEST123"));
        assertTrue(url.contains("api_secret=secret-xyz"));

        HttpEntity entity = entityCaptor.getValue();
        assertNotNull(entity.getBody());
        Map<String, Object> body = (Map<String, Object>) entity.getBody();
        assertEquals("111.222", body.get("client_id"));
        assertEquals("10", body.get("user_id"));
        assertTrue(body.containsKey("events"));
    }

    @Test
    @SuppressWarnings("unchecked")
    void send_clientIdNull_dungFallbackServerPrefix() {
        service.setConfig("G-TEST123", "secret-xyz");

        service.sendSync(null, 15L, "booking_confirmed", Map.of("salon_id", 3L));

        ArgumentCaptor<HttpEntity> entityCaptor = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate).postForObject(anyString(), entityCaptor.capture(), eq(String.class));

        Map<String, Object> body = (Map<String, Object>) entityCaptor.getValue().getBody();
        assertEquals("server.15", body.get("client_id"));
        assertEquals("15", body.get("user_id"));
    }
}

