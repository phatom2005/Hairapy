package com.hairapy.dto.admin;

/**
 * Điểm đánh giá trung bình theo từng tính năng (HAIR_SWAP / FACE_SCAN / GENERAL) trong kỳ.
 */
public record FeatureRating(
    String feature,  // tên enum FeedbackFeature
    long count,      // số lượt đánh giá trong kỳ
    double average   // làm tròn 1 chữ số, 0.0 nếu chưa có (KHÔNG NaN)
) {}
