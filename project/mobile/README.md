# Hairapy – App Android (Flutter)

App di động của Hairapy: quét dáng mặt ngay trên máy, gợi ý kiểu tóc, thử tóc bằng AI và đặt lịch với salon đối tác. Dùng chung backend với web (`https://hairapy-production.up.railway.app/api`).

Phiên bản hiện tại: **1.1.0 (build 4)** – đang ở kênh thử nghiệm khép kín trên Google Play.

## Chạy app

```bash
cd project/mobile
flutter pub get
flutter run                                   # máy thật / emulator Android
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8090/api   # trỏ backend chạy local (emulator)
```

Kiểm tra trước khi build:

```bash
flutter analyze        # phải 0 issue
flutter test           # test logic: User/plan, salon, đặt lịch
```

Build bản phát hành (AAB cho Google Play):

```bash
flutter build appbundle --release
```

Cách tạo keystore và `key.properties`: xem `android/README-release.md`. Nhớ tăng `version` trong `pubspec.yaml` (phần sau dấu `+` là versionCode, phải tăng mỗi lần upload).

## Màn hình

| Màn | Đường dẫn | Ghi chú |
|---|---|---|
| Giới thiệu, đăng nhập, đăng ký, quên mật khẩu | `/`, `/login`, `/register`, ... | Đăng nhập email/mật khẩu |
| Trang chủ | `/home` | |
| Quét khuôn mặt | `/scan` | Google ML Kit Face Mesh, chạy trên máy (chỉ Android) |
| Kết quả | `/results` | Dáng mặt, **sửa lại dáng mặt**, **chọn giới tính sau khi quét**, kiểu tóc gợi ý |
| Thử tóc | `/swap` | **Chọn màu tóc**, thanh **so sánh Trước/Sau**, lưu ảnh, chia sẻ, **"Cắt kiểu này ở đâu?"** |
| Kho kiểu tóc | `/catalog` | |
| Salon | `/salons`, `/salons/:id` | Danh sách, **chi tiết salon**, chỉ đường, gọi điện, **đặt lịch** |
| Lịch hẹn salon | `/bookings` | Trạng thái lịch, **huỷ lịch** |
| Cá nhân, cài đặt | `/profile`, `/settings` | **Gói + hạn gói**, lịch sử quét/thử tóc, xoá tài khoản |

## Gói & thanh toán

- Quyền lợi xét theo `plan` của `/auth/me` (`FREE` / `PRO` = Gói Tuần / `PREMIUM` = Gói Tháng), không theo `role` – chủ salon đã mua gói vẫn được hưởng quyền lợi.
- `kEnableExternalPayment = false` (`lib/config/feature_flags.dart`): bản Google Play **không** bán gói qua PayOS/VietQR (chính sách Google Play Billing). Người dùng mua gói trên web, app tự nhận gói sau khi đăng nhập.

## Ghi chú kỹ thuật

- Tài khoản bị admin khoá (`403`, `code: ACCOUNT_LOCKED`): app tự đăng xuất và hiện lý do ở màn Đăng nhập.
- Ảnh thử tóc tự lưu vào lịch sử trên server (Cá nhân → Ảnh đã thử tóc), nên rời màn Thử tóc không làm mất ảnh.
- Đặt lịch: giờ hẹn theo giờ máy (giờ Việt Nam), phải sau hiện tại ít nhất 1 giờ và trong 30 ngày; ảnh gửi salon phải là ảnh trong lịch sử thử tóc của chính người dùng.
- `url_launcher` dùng để chỉ đường (Google Maps), gọi điện cho salon và mở cổng quản lý salon trên web.

## Giới hạn đã biết

- **iOS chưa hỗ trợ**: Google ML Kit Face Mesh mới có trên Android.
- **Đăng nhập Google chưa có trên app**: cần tạo OAuth client Android (SHA-1 của keystore debug + upload + khoá ký của Play) trên Google Cloud trước khi tích hợp `google_sign_in`.
- **Ghép ảnh giữ gương mặt (Phase 7.3) tạm hoãn**: lượt thử tóc từ app hiển thị ảnh AI nguyên bản; lượt thử trên web đã được ghép và xem lại trên app vẫn đúng.
- Cổng quản lý cho chủ salon chỉ có trên web (app mở link `https://hairapy.io.vn/salon-portal`).
