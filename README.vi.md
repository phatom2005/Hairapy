# Hairapy

[![CI/CD Pipeline](https://github.com/phatom2005/Hairapy/actions/workflows/main.yml/badge.svg)](https://github.com/phatom2005/Hairapy/actions)
[![CodeQL](https://github.com/phatom2005/Hairapy/actions/workflows/codeql.yml/badge.svg)](https://github.com/phatom2005/Hairapy/security/code-scanning)
![Security Status](https://img.shields.io/badge/Security-Snyk_Protected-blueviolet?logo=snyk)
![License](https://img.shields.io/badge/License-MIT-green)

*Đọc bằng ngôn ngữ khác: [English](README.md)*

> **Scan. Style. Smile.**
> Phân tích khuôn mặt và thử kiểu tóc bằng AI cho thị trường Việt Nam.

**Bản chạy thật:** https://hairapy.io.vn

Hairapy nhận diện dáng mặt từ ảnh chân dung, gợi ý kiểu tóc phù hợp, cho bạn thử tóc bằng AI và kết nối với salon đối tác làm được đúng kiểu bạn thích. Dự án dạng monorepo gồm web React, API Spring Boot và app di động Flutter.

## Tính năng chính

- **Phân tích khuôn mặt** – nhận diện dáng mặt chạy ngay trên trình duyệt (MediaPipe Face Landmarker); người dùng tự sửa được kết quả và chọn giới tính sau khi quét.
- **Thử tóc bằng AI** – đổi kiểu tóc theo kho kiểu (AILab Hairstyle), kèm đổi màu tóc bằng kéo-thả xem trước tức thì trên trình duyệt.
- **Kho kiểu tóc** – kiểu tóc có biến thể màu, ảnh mẫu tạo bằng AI và mục "Đang hot tuần này" tính từ dữ liệu sử dụng thật.
- **Mạng lưới salon đối tác** – sau khi thử tóc, tìm salon đối tác gần bạn làm được kiểu đó và gửi yêu cầu đặt lịch kèm ảnh thử tóc.
- **Cổng quản lý salon** – salon đối tác quản lý lịch hẹn, kiểu tóc nhận làm và bảng giá, xem báo cáo xu hướng khu vực.
- **Trang quản trị** – người dùng (có khoá tài khoản), gói đăng ký, thanh toán (xuất CSV), kho kiểu tóc, salon, lịch hẹn, nhật ký sử dụng, GA4, thử nghiệm A/B và bản tin insight hằng tuần.

## Công nghệ

| Tầng | Công nghệ |
|---|---|
| **Frontend** | React 19, Vite 8, TailwindCSS 4, Zustand, TanStack Query, React Router 7, Motion, Leaflet |
| **Backend** | Java 21, Spring Boot 3.5, Spring Security + JWT (jjwt), Spring Data JPA |
| **Cơ sở dữ liệu** | PostgreSQL (Supabase trên production, PostgreSQL 16 trong Docker khi dev), Flyway migration |
| **Cache** | Redis 7 (blacklist JWT khi đăng xuất) |
| **Lưu ảnh** | Cloudinary |
| **AI** | MediaPipe Tasks Vision (landmark khuôn mặt và tách vùng tóc trên trình duyệt), AILab Hairstyle API (thử tóc), Google Gemini (AI Stylist, tóm tắt insight tuần) |
| **Thanh toán** | PayOS + VietQR (webhook) |
| **Email** | Resend |
| **Phân tích** | Google Analytics 4 (gtag + Measurement Protocol phía server, GA4 Data API) |
| **Di động** | Flutter (`project/mobile`) |
| **DevOps** | Docker, Docker Compose, GitHub Actions |
| **Hosting** | Railway (backend), Vercel (frontend), Supabase (database) |
| **Bảo mật** | Bucket4j rate limiting, CodeQL, Snyk, Sentry (tuỳ chọn) |

## Cấu trúc dự án

```text
.
├── project/
│   ├── frontend/         # Web React + Vite
│   ├── backend/          # API Java Spring Boot (Flyway migration ở src/main/resources/db/migration)
│   └── mobile/           # App di động Flutter
├── .github/workflows/    # CI/CD (main.yml) và CodeQL (codeql.yml)
├── docker-compose.yml    # Chạy toàn bộ hệ thống ở máy local
├── .env.example          # Mẫu biến môi trường
├── README.md
└── README.vi.md
```

## Bắt đầu

### 1. Yêu cầu

- [Docker Desktop](https://www.docker.com/) – bắt buộc để chạy toàn bộ hệ thống
- [Node.js 20+](https://nodejs.org/) – tuỳ chọn, để chạy riêng frontend
- [Java JDK 21](https://adoptium.net/) – tuỳ chọn, để chạy riêng backend

### 2. Cấu hình biến môi trường

```bash
cp .env.example .env
```

Khi dev ở máy local chỉ cần tối thiểu `DB_PASSWORD` và `JWT_SECRET` (sinh bằng `openssl rand -base64 32`). Các tính năng AI, thanh toán, email và phân tích sẽ tự tắt hoặc dùng phương án dự phòng cho tới khi có key. Xem mục [Biến môi trường](#biến-môi-trường).

### 3. Chạy bằng Docker

```bash
docker compose up --build
```

| Dịch vụ | Địa chỉ |
|---|---|
| **Frontend** | http://localhost:5173 |
| **Backend API** | http://localhost:8090 |
| **Health check** | http://localhost:8090/actuator/health |
| **PostgreSQL** | localhost:5433 |
| **Redis** | localhost:6379 |

> Chạy nền bằng `docker compose up -d`, dừng bằng `docker compose down`.

### 4. Chạy riêng từng phần

**Frontend**
```bash
cd project/frontend
npm install
npm run dev          # http://localhost:5173
```

**Backend** (cần PostgreSQL và Redis đang chạy, ví dụ `docker compose up db redis`)
```bash
cd project/backend
./mvnw spring-boot:run
```

## Các gói

Gói là mua một lần: **không tự gia hạn**, hết hạn sẽ tự về gói Miễn phí. Mua thêm khi gói còn hạn sẽ được cộng nối tiếp từ ngày hết hạn hiện tại.

| Quyền lợi | Miễn phí | Gói Tuần | Gói Tháng |
|---|---|---|---|
| Giá | 0đ | 49.000đ / 7 ngày | 99.000đ / 30 ngày |
| Phân tích khuôn mặt | Không giới hạn | Không giới hạn | Không giới hạn |
| Lưu lượt quét vào lịch sử | 5 / ngày | 5 / ngày | 5 / ngày |
| Thử kiểu tóc AI | 1 / ngày | 5 / ngày | 8 / ngày |
| Ảnh kết quả không watermark | — | Có | Có |
| Kiểu tóc độc quyền | — | Có | Có |
| AI Stylist | — | — | Sắp ra mắt (5 / ngày khi bật) |

Nếu lượt thử tóc AI bị lỗi hoặc quá thời gian, lượt đã dùng được hoàn tự động.

### Dành cho salon

**Gói Đối tác Salon – 299.000đ / tháng** (ở bản MVP, thanh toán là mô phỏng và do admin ghi nhận; salon mới được dùng thử 30 ngày). Salon đối tác xuất hiện trong gợi ý "Cắt kiểu này ở đâu?", nhận yêu cầu đặt lịch kèm ảnh thử tóc của khách, tự quản lý kiểu tóc và bảng giá, và nhận báo cáo xu hướng khu vực. Đăng ký tại `/for-salons`.

## Biến môi trường

Toàn bộ biến có trong [`.env.example`](.env.example). Không bao giờ commit giá trị thật.

| Nhóm | Biến | Mục đích |
|---|---|---|
| Database | `DB_PASSWORD`, `DB_URL`, `DB_USERNAME` | Kết nối PostgreSQL (production dùng Session Pooler của Supabase) |
| Cache | `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` | Redis cho blacklist JWT |
| Xác thực | `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` | Khoá ký JWT và đăng nhập mạng xã hội |
| Web | `CORS_ALLOWED_ORIGINS`, `FRONTEND_URL` | Origin web được phép và link trong email |
| AI | `AILAB_API_KEY`, `GEMINI_API_KEY`, `GEMINI_MODEL` | Thử tóc và Gemini (đặt `GEMINI_MODEL` là model Gemini còn hoạt động) |
| Thanh toán | `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY` | Tạo đơn PayOS và xác minh webhook |
| Ảnh | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Tải ảnh lên |
| Email | `RESEND_API_KEY`, `EMAIL_FROM`, `ALERT_EMAIL` | Email giao dịch, cảnh báo cho admin và bản tin tuần |
| Phân tích | `GA_MEASUREMENT_ID`, `GA_MP_API_SECRET`, `GA_PROPERTY_ID`, `GA_SERVICE_ACCOUNT_JSON` | Gửi sự kiện GA4 từ server và đọc báo cáo GA4 |
| Giám sát | `SENTRY_DSN` | Theo dõi lỗi (tuỳ chọn) |
| Frontend (Vite) | `VITE_API_URL`, `VITE_GA_ID`, `VITE_GOOGLE_CLIENT_ID`, `VITE_FACEBOOK_APP_ID`, `VITE_AI_STYLIST_ENABLED` | Giá trị đóng gói vào bản build web |

Các biến giới hạn tần suất (`RATE_LIMIT_*`) đã có giá trị mặc định hợp lý, không bắt buộc.

## Kiểm thử

```bash
# Backend (JUnit, database H2 trong bộ nhớ)
cd project/backend
./mvnw test

# Frontend
cd project/frontend
npm run lint
npm test
npm run build
```

## Bảo mật & DevOps

- **GitHub Actions** – mỗi lần push / pull request: test và build JAR backend, lint + test + build frontend, quét Snyk (khi có `SNYK_TOKEN`); build và đẩy Docker image khi push lên `main`
- **CodeQL** – phân tích tĩnh mã Java và JavaScript
- **Snyk** – quét lỗ hổng thư viện phụ thuộc
- **Spring Security + JWT** – xác thực stateless theo vai trò (người dùng, admin, tester, chủ salon), blacklist token khi đăng xuất và admin khoá được tài khoản
- **Bucket4j** – giới hạn tần suất cho đăng nhập, đăng ký, quên mật khẩu, gửi lại email xác minh và thanh toán
- **Flyway** – migration schema có đánh số phiên bản; production chạy `ddl-auto=validate`
- **Quyền riêng tư** – sự kiện phân tích chỉ gắn mã số người dùng nội bộ; không gửi email, số điện thoại, họ tên hay ảnh lên Google Analytics

## Giấy phép

[MIT](LICENSE)

---

**Hairapy** – FPT University HCM · EXE101 · 2026
