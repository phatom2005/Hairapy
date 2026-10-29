package com.hairapy.services;

import com.hairapy.dto.admin.ExperimentResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ExperimentServiceTest {

    @Mock
    private GaReportService gaReportService;

    private ExperimentService experimentService;

    @BeforeEach
    void setUp() {
        experimentService = new ExperimentService(gaReportService);
    }

    @Test
    void twoProportionZTest_soLieuChuanTinhTay_B_TotHon() {
        // nA = 500, xA = 50 (10%)
        // nB = 500, xB = 80 (16%)
        // pooled = 130 / 1000 = 0.13
        // SE = sqrt(0.13 * 0.87 * (2/500)) = 0.02127
        // z = 0.06 / 0.02127 = 2.82
        // p-value ~ 0.0048
        double pValue = experimentService.twoProportionZTest(500, 50, 500, 80);

        assertTrue(pValue < 0.01, "p-value phải nhỏ hơn 0.01 (thực tế: " + pValue + ")");
        assertEquals(0.0048, pValue, 0.001, "p-value xấp xỉ 0.0048");

        String verdict = experimentService.evaluateVerdict(500, 50, 500, 80, pValue);
        assertEquals("B tốt hơn", verdict);
    }

    @Test
    void twoProportionZTest_A_TotHon() {
        double pValue = experimentService.twoProportionZTest(500, 80, 500, 50);

        assertTrue(pValue < 0.01);
        String verdict = experimentService.evaluateVerdict(500, 80, 500, 50, pValue);
        assertEquals("A tốt hơn", verdict);
    }

    @Test
    void twoProportionZTest_chuaCoKhacBietRo() {
        // nA = 500, xA = 50 (10%)
        // nB = 500, xB = 52 (10.4%)
        // z ~ 0.208, p-value ~ 0.835
        double pValue = experimentService.twoProportionZTest(500, 50, 500, 52);

        assertTrue(pValue > 0.5, "p-value phải lớn hơn 0.5");
        String verdict = experimentService.evaluateVerdict(500, 50, 500, 52, pValue);
        assertEquals("Chưa có khác biệt rõ", verdict);
    }

    @Test
    void evaluateVerdict_duoi100Nguoi_chuaDuDuLieu() {
        // Tỷ lệ chênh lệch lớn nhưng số lượng mẫu < 100
        double pValue = experimentService.twoProportionZTest(50, 5, 50, 20);

        String verdict = experimentService.evaluateVerdict(50, 5, 50, 20, pValue);
        assertEquals("Chưa đủ dữ liệu", verdict);
    }

    @Test
    void getExperimentResults_gaChuaCauHinh_fallbackTraVeChuaDuDuLieu() {
        when(gaReportService.isConfigured()).thenReturn(false);

        ExperimentResponse resp = experimentService.getExperimentResults("salon_cta", 30);

        assertNotNull(resp);
        assertEquals("salon_cta", resp.experimentName());
        assertEquals("Chưa đủ dữ liệu", resp.verdict());
        assertEquals(0, resp.variantA().users());
        assertEquals(0, resp.variantB().users());
    }
}

