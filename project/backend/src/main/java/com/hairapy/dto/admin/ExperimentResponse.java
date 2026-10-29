package com.hairapy.dto.admin;

public record ExperimentResponse(
        String experimentName,
        int days,
        String startDate,
        VariantResult variantA,
        VariantResult variantB,
        Double pValue,
        String verdict
) {
    public record VariantResult(
            String variant,
            long users,
            long conversions,
            double rate
    ) {}
}

