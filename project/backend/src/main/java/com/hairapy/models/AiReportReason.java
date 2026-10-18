package com.hairapy.models;

/**
 * Lý do người dùng báo cáo nội dung do AI tạo ra.
 */
public enum AiReportReason {
    INAPPROPRIATE, // Nội dung phản cảm / không phù hợp
    DISTORTED,     // Ảnh bị lỗi, méo, kết quả sai lệch
    PRIVACY,       // Vi phạm quyền riêng tư / dùng ảnh người khác
    OTHER
}
