# Hairapy

[![CI/CD Pipeline](https://github.com/phatom2005/Hairapy/actions/workflows/main.yml/badge.svg)](https://github.com/phatom2005/Hairapy/actions)
[![CodeQL](https://github.com/phatom2005/Hairapy/actions/workflows/codeql.yml/badge.svg)](https://github.com/phatom2005/Hairapy/security/code-scanning)
![Security Status](https://img.shields.io/badge/Security-Snyk_Protected-blueviolet?logo=snyk)
![License](https://img.shields.io/badge/License-MIT-green)

*Đọc bằng ngôn ngữ khác: [English](README.md)*

> **Scan. Style. Smile.**
> Ứng dụng web phân tích khuôn mặt và gợi ý kiểu tóc bằng AI dành cho Gen Z.

Hairapy là web app sử dụng AI để phân tích dáng khuôn mặt và gợi ý kiểu tóc phù hợp. Được xây dựng theo kiến trúc monorepo với frontend React hiện đại và backend Java Spring Boot hiệu suất cao.

## Tech Stack

| Layer | Công nghệ |
|---|---|
| **Frontend** | React 18 + Vite, TailwindCSS, Zustand, React Query |
| **Backend** | Java 21, Spring Boot 3, Spring Security + JWT |
| **Database** | PostgreSQL 16, Flyway migration |
| **Cache** | Redis 7 |
| **Storage** | Cloudflare R2 (tự động xóa sau 24h) |
| **Thanh toán** | PayOS + VietQR |
| **DevOps** | Docker, Docker Compose, GitHub Actions |
| **Bảo mật** | Snyk, Bucket4j rate limiting, HTTPS |

## Cấu trúc dự án

```text
.
├── project/
│   ├── frontend/         # Mã nguồn React + Vite
│   └── backend/          # Mã nguồn Java Spring Boot
├── docker-compose.yml    # Build & chạy toàn bộ stack
├── .env.example          # Template biến môi trường
└── README.md
```

## Hướng dẫn cài đặt

### 1. Yêu cầu hệ thống

- [Docker Desktop](https://www.docker.com/) — bắt buộc để chạy toàn bộ stack
- [Node.js 20+](https://nodejs.org/) — tuỳ chọn, nếu muốn chạy frontend riêng
- [Java JDK 21+](https://adoptium.net/) — tuỳ chọn, nếu muốn chạy backend riêng

### 2. Cấu hình môi trường

Copy file env mẫu và điền thông tin thực:

```bash
cp .env.example .env
```

Tối thiểu cần có để chạy local:

```env
DB_PASSWORD=YourPassword123
JWT_SECRET=hairapy_jwt_secret_key_minimum_32_chars
```

### 3. Chạy bằng Docker

Khởi chạy toàn bộ stack (Frontend + Backend + PostgreSQL + Redis) bằng một lệnh:

```bash
docker compose up --build
```

Sau khi build thành công, các dịch vụ chạy tại:

| Dịch vụ | URL |
|---|---|
| **Frontend** | http://localhost:3000 |
| **Backend API** | http://localhost:8090 |
| **Health Check** | http://localhost:8090/actuator/health |
| **PostgreSQL** | localhost:5433 |
| **Redis** | localhost:6379 |

> Thêm `-d` để chạy ngầm: `docker compose up -d`
> Dừng tất cả: `docker compose down`

### 4. Chạy từng dịch vụ riêng lẻ

**Frontend** (cần Node.js):
```bash
cd project/frontend
npm install
npm run dev
# Truy cập tại http://localhost:5173
```

**Backend** (cần Java 21):
```bash
cd project/backend
./mvnw spring-boot:run
# Đảm bảo PostgreSQL đang chạy local trước
```

## Phân quyền người dùng

| Tính năng | Khách | Free | Premium |
|---|---|---|---|
| Phân tích khuôn mặt | ✗ | 1 lần/ngày | 5 lần/ngày |
| Thử kiểu tóc | ✗ | 5 lần/ngày | 20 lần/ngày |
| Kho kiểu tóc | ✗ | Giới hạn | Toàn bộ |
| Chất lượng ảnh | ✗ | Watermark | HD, sạch |
| Gợi ý theo Outfit | ✗ | ✗ | ✓ |

## Biến môi trường

Xem `.env.example` để biết đầy đủ các biến. Các biến quan trọng:

```env
DB_PASSWORD=          # Mật khẩu PostgreSQL
JWT_SECRET=           # Tối thiểu 32 ký tự
R2_BUCKET=            # Tên bucket Cloudflare R2
R2_ACCESS_KEY=        # Access key Cloudflare R2
R2_SECRET_KEY=        # Secret key Cloudflare R2
PAYOS_API_KEY=        # API key PayOS
SENTRY_DSN=           # DSN Sentry error tracking
```

## Bảo mật & DevOps

- **GitHub Actions** — CI/CD pipeline: test → build → deploy khi push lên `main`
- **Snyk** — quét lỗ hổng bảo mật tự động mỗi lần build
- **CodeQL** — phân tích mã tĩnh
- **JWT + Spring Security** — xác thực stateless với 3 tier phân quyền
- **Bucket4j** — rate limiting theo tier người dùng
- **HTTPS** — Let's Encrypt qua Cloudflare

---

**Hairapy** — FPT University HCM · EXE101 · 2026
