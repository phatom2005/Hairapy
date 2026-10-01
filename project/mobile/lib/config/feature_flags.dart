/// Cấu hình các cờ tính năng (Feature Flags) cho mobile app Hairapy.
library;

/// Cờ bật luồng mua gói bằng PayOS/VietQR trong app.
/// Google Play yêu cầu dùng Google Play Billing cho tính năng premium nên bản Store
/// phải để false. Chỉ bật true khi build bản chạy ngoài Play Store hoặc sau khi đã
/// tích hợp Google Play Billing.
const bool kEnableExternalPayment = false;

/// Cờ hiển thị placeholder cho AI Stylist ("SẮP RA MẮT").
/// Tắt để giao diện gọn gàng, tránh hiển thị các tính năng chưa hoàn thiện lên Store.
const bool kShowAiStylistPlaceholder = false;
