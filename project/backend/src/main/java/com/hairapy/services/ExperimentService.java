package com.hairapy.services;

import com.hairapy.dto.admin.ExperimentResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;

/**
 * Service tính toán kết quả thử nghiệm A/B và kiểm định thống kê (Two-Proportion Z-Test).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ExperimentService {

    private final GaReportService gaReportService;

    public ExperimentResponse getExperimentResults(String name, int days) {
        return getExperimentResults(name, days, false);
    }

    public ExperimentResponse getExperimentResults(String name, int days, boolean onlyVietnam) {
        int d = Math.max(1, Math.min(days, 365));
        String startDate = LocalDate.now().minusDays(d).toString();

        if (!gaReportService.isConfigured()) {
            return emptyResponse(name, d, startDate);
        }

        try {
            String expDimension = "customUser:exp_" + name;
            Map<String, Object> eventFilter = Map.of(
                    "filter", Map.of("fieldName", "eventName", "inListFilter", Map.of("values", List.of(
                            "experiment_exposure", "salon_match_open", "booking_submit"
                    )))
            );
            Map<String, Object> filter = eventFilter;
            if (onlyVietnam) {
                Map<String, Object> vnFilter = Map.of("filter", Map.of("fieldName", "country",
                        "stringFilter", Map.of("value", "Vietnam", "matchType", "EXACT")));
                filter = Map.of("andGroup", Map.of("expressions", List.of(eventFilter, vnFilter)));
            }

            List<GaReportService.Row> rows = gaReportService.runReport(
                    d + "daysAgo", "today",
                    List.of(expDimension, "eventName"),
                    List.of("totalUsers", "eventCount"),
                    50, null, filter);

            if (rows.isEmpty()) {
                return emptyResponse(name, d, startDate);
            }

            long usersA = 0;
            long conversionsA = 0;
            long usersB = 0;
            long conversionsB = 0;

            for (GaReportService.Row r : rows) {
                String variant = r.dims().get(0);
                String eventName = r.dims().get(1);
                long users = Math.round(r.metrics().get(0));
                long eventCount = Math.round(r.metrics().get(1));

                if ("A".equalsIgnoreCase(variant)) {
                    if ("experiment_exposure".equalsIgnoreCase(eventName)) {
                        usersA = Math.max(usersA, Math.max(users, eventCount));
                    } else if ("booking_submit".equalsIgnoreCase(eventName) || "salon_match_open".equalsIgnoreCase(eventName)) {
                        conversionsA += eventCount;
                    }
                } else if ("B".equalsIgnoreCase(variant)) {
                    if ("experiment_exposure".equalsIgnoreCase(eventName)) {
                        usersB = Math.max(usersB, Math.max(users, eventCount));
                    } else if ("booking_submit".equalsIgnoreCase(eventName) || "salon_match_open".equalsIgnoreCase(eventName)) {
                        conversionsB += eventCount;
                    }
                }
            }

            return calculateResult(name, d, startDate, usersA, conversionsA, usersB, conversionsB);
        } catch (Exception e) {
            log.warn("Lỗi khi lấy kết quả thử nghiệm A/B {}: {}", name, e.getMessage());
            return emptyResponse(name, d, startDate);
        }
    }

    public ExperimentResponse calculateResult(String name, int days, String startDate,
                                              long usersA, long conversionsA,
                                              long usersB, long conversionsB) {
        double rateA = usersA > 0 ? (double) conversionsA / usersA : 0.0;
        double rateB = usersB > 0 ? (double) conversionsB / usersB : 0.0;

        double pValue = twoProportionZTest(usersA, conversionsA, usersB, conversionsB);
        String verdict = evaluateVerdict(usersA, conversionsA, usersB, conversionsB, pValue);

        return new ExperimentResponse(
                name,
                days,
                startDate,
                new ExperimentResponse.VariantResult("A", usersA, conversionsA, Math.round(rateA * 1000.0) / 10.0),
                new ExperimentResponse.VariantResult("B", usersB, conversionsB, Math.round(rateB * 1000.0) / 10.0),
                Math.round(pValue * 10000.0) / 10000.0,
                verdict
        );
    }

    /**
     * Đánh giá kết luận dựa trên ngưỡng 100 người mỗi nhánh và p-value < 0.05.
     */
    public String evaluateVerdict(long usersA, long conversionsA, long usersB, long conversionsB, double pValue) {
        if (usersA < 100 || usersB < 100) {
            return "Chưa đủ dữ liệu";
        }
        if (pValue < 0.05) {
            double rateA = (double) conversionsA / usersA;
            double rateB = (double) conversionsB / usersB;
            if (rateB > rateA) {
                return "B tốt hơn";
            } else if (rateA > rateB) {
                return "A tốt hơn";
            }
        }
        return "Chưa có khác biệt rõ";
    }

    /**
     * Tính toán kiểm định hai tỷ lệ (Two-Proportion Z-Test).
     * @return p-value hai phía (two-tailed) trong khoảng [0.0, 1.0].
     */
    public double twoProportionZTest(long nA, long xA, long nB, long xB) {
        if (nA <= 0 || nB <= 0) return 1.0;
        if (xA < 0 || xB < 0) return 1.0;

        double pA = (double) xA / nA;
        double pB = (double) xB / nB;

        double pooled = (double) (xA + xB) / (nA + nB);
        if (pooled <= 0.0 || pooled >= 1.0) {
            return pA == pB ? 1.0 : 0.0;
        }

        double se = Math.sqrt(pooled * (1.0 - pooled) * (1.0 / nA + 1.0 / nB));
        if (se == 0.0) return 1.0;

        double z = (pB - pA) / se;
        double pValue = 2.0 * (1.0 - standardNormalCdf(Math.abs(z)));
        return Math.max(0.0, Math.min(1.0, pValue));
    }

    /**
     * Hàm phân phối tích lũy chuẩn tắc CDF: Phi(z) = 0.5 * (1 + erf(z / sqrt(2))).
     */
    public static double standardNormalCdf(double z) {
        return 0.5 * (1.0 + erf(z / Math.sqrt(2.0)));
    }

    /**
     * Xấp xỉ hàm sai số Gauss erf(x) theo công thức 7.1.26 của Abramowitz & Stegun.
     * Sai số tối đa < 1.5e-7.
     */
    public static double erf(double x) {
        double a1 = 0.254829592;
        double a2 = -0.284496736;
        double a3 = 1.421413741;
        double a4 = -1.453152027;
        double a5 = 1.061405429;
        double p = 0.3275911;

        int sign = x < 0 ? -1 : 1;
        double absX = Math.abs(x);

        double t = 1.0 / (1.0 + p * absX);
        double y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);

        return sign * y;
    }

    private ExperimentResponse emptyResponse(String name, int days, String startDate) {
        return new ExperimentResponse(
                name,
                days,
                startDate,
                new ExperimentResponse.VariantResult("A", 0, 0, 0.0),
                new ExperimentResponse.VariantResult("B", 0, 0, 0.0),
                1.0,
                "Chưa đủ dữ liệu"
        );
    }
}

