package com.hairapy.dto.stylist;

/**
 * Request body cho POST /api/stylist/consult.
 * faceShape/hairType/hairstyleId là optional — FE truyền lên nếu có sẵn ngữ cảnh
 * (từ lần quét gần nhất hoặc kiểu tóc đang xem ở Catalog) để AI tư vấn sát hơn.
 */
public record StylistConsultRequest(
        String question,
        String faceShape,
        String hairType,
        Long hairstyleId
) {
}
