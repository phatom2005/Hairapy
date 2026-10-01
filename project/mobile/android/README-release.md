# Hướng dẫn tạo Keystore và Build Release Android (Hairapy)

Tài liệu này hướng dẫn cách tạo upload keystore và đóng gói ứng dụng Android để phát hành lên Google Play Console.

## 1. Tạo upload keystore

Mở terminal tại thư mục `project/mobile/android` và chạy lệnh sau:

```bash
keytool -genkey -v -keystore upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

Khi được hỏi, hãy nhập các thông tin cần thiết:
- Mật khẩu keystore (storePassword)
- Mật khẩu key alias (keyPassword - có thể đặt giống storePassword)
- Họ tên, tổ chức (Hairapy), quốc gia (VN)

> ⚠️ **CỰC KỲ QUAN TRỌNG:**
> Hãy sao lưu file `upload-keystore.jks` và lưu lại mật khẩu ở nơi an toàn (ví dụ: password manager, ổ cứng bảo mật).
> Nếu mất file keystore này, bạn sẽ **KHÔNG THỂ cập nhật ứng dụng** trên Google Play Store cho các phiên bản tiếp theo.

## 2. Cấu hình file `key.properties`

Sao chép file mẫu:
```bash
cp key.properties.example key.properties
```

Mở `key.properties` và điền thông tin thật:
```properties
storePassword=mật_khẩu_keystore_vừa_tạo
keyPassword=mật_khẩu_alias_vừa_tạo
keyAlias=upload
storeFile=../upload-keystore.jks
```

*(File `key.properties` và `*.jks` đã được cấu hình trong `.gitignore` để không bị commit lên git).*

## 3. Build Android App Bundle (AAB) cho Google Play

Từ thư mục `project/mobile`, chạy lệnh:

```bash
flutter build appbundle --release
```

File bundle tạo ra sẽ nằm tại:
`build/app/outputs/bundle/release/app-release.aab`

File `.aab` này sẽ được dùng để upload lên Google Play Console.

## 4. Chế độ dev / fallback

Nếu trên máy dev chưa có file `key.properties`, hệ thống Gradle sẽ tự động fallback sang ký bằng debug key và hiện cảnh báo:
```
⚠️ Chưa có key.properties — release đang ký bằng debug key, KHÔNG upload lên Play Store
```
Nhờ đó lệnh `flutter run --release` vẫn có thể chạy thử nghiệm trên máy thật của lập trình viên.
