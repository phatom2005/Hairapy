# Full-Stack Monorepo Template

[![CI/CD Pipeline](https://github.com/phatom2005/nextjs-java-monorepo-template/actions/workflows/main.yml/badge.svg)](https://github.com/phatom2005/nextjs-java-monorepo-template/actions)
[![CodeQL](https://github.com/phatom2005/nextjs-java-monorepo-template/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/phatom2005/nextjs-java-monorepo-template/actions/workflows/github-code-scanning/codeql)
![Security Status](https://img.shields.io/badge/Security-Snyk_Protected-blueviolet?logo=snyk)
![License](https://img.shields.io/badge/License-MIT-green)

*Đọc bằng ngôn ngữ khác: [English](README.md)*

> **Lean, Secure, and Scalable.** 
> Một bộ khung dự án hoàn chỉnh sử dụng **React (Next.js)** và **Java (Spring Boot)**.

Đây là một template dự án mạnh mẽ được thiết kế dưới dạng monorepo, kết hợp Frontend hiện đại (React/Next.js) và Backend hiệu suất cao (Java/Spring Boot), được cấu hình sẵn môi trường Docker cho cả hai phía cùng cơ sở dữ liệu PostgreSQL.

## Tech Stack

- **Frontend:** React (Next.js 15 App Router), Tailwind CSS
- **Backend:** Java (Spring Boot) Web API, Hibernate/Spring Data JPA
- **Database:** PostgreSQL
- **DevOps:** Docker, Docker Compose, GitHub Actions
- **Security:** Snyk Security Scanning

## Cấu trúc dự án

```text
.
├── project/
│   ├── frontend/         # Mã nguồn React (Next.js 15)
│   └── backend/          # Mã nguồn Java (Spring Boot)
├── docker-compose.yml    # File cấu hình để build & chạy toàn bộ hệ thống
├── .env                  # Tệp chứa biến môi trường (Database Password)
└── README.md
```

## Hướng dẫn cài đặt & Khởi chạy

### 1. Yêu cầu hệ thống (Prerequisites)
- [Docker & Docker CLI](https://www.docker.com/) (Khuyến nghị dùng Docker để chạy môi trường đồng bộ).
- [Node.js](https://nodejs.org/) (Nếu muốn tự chạy frontend riêng).
- [Java JDK 17+](https://adoptium.net/) (Nếu muốn phát triển và test backend cục bộ).

### 2. Khởi chạy bằng Docker (Môi trường Development)
Cách đơn giản nhất là khởi chạy đồng loạt cả Frontend, Backend và Database bằng một câu lệnh duy nhất:

1. Đảm bảo file `.env` đã có các thiết lập cần thiết (Mặc định cần có `DB_PASSWORD=YourPassword123` để tránh trường hợp Container DB lỗi).
2. Mở terminal tại mục gốc của dự án này và chạy lệnh:
   ```bash
   docker compose up --build
   ```
3. Sau khi quá trình build thành công, các dịch vụ sẽ hoạt động tại:
   - **Frontend (Next.js):** [http://localhost:3000](http://localhost:3000)
   - **Backend API:** [http://localhost:5000](http://localhost:5000)
   - **Database (PostgreSQL):** Cổng `5432`

> **Lưu ý:** DB Volume được cấu hình ánh xạ ra ngoài, vì thế dữ liệu của DB vẫn được giữ nguyên ngắt container. Dùng thêm cờ `-d` (`docker compose up -d`) nếu bạn muốn chạy ngầm Docker. Để dừng các dịch vụ, hãy chạy `docker compose down`.

### 3. Chạy từng dịch vụ riêng lẻ thủ công

#### Chạy Frontend độc lập (cần Node.js):
```bash
cd project/frontend
npm install
npm run dev
```

#### Chạy Backend độc lập (cần Java JDK):
```bash
cd project/backend
./mvnw spring-boot:run
```
*(Lưu ý: Nếu chạy thủ công, bạn cần đảm bảo PostgreSQL đang chạy local hoặc thay đổi chuỗi kết nối Database nằm bên trong `application.yml` hoặc `application.properties` khớp với thông tin kết nối DB của bạn).*

## Tùy biến dự án 
- **Backend API:** Khi bạn thay đổi cấu trúc mã nguồn bên trong thư mục `backend/`, hãy nhớ mở file `docker-compose.yml` và cập nhật lại cấu hình nếu cần thiết để trỏ vào đúng vị trí `Dockerfile` mà bạn sử dụng.
- **Biến môi trường Frontend:** Frontend kết nối với backend qua file biến môi trường `NEXT_PUBLIC_API_URL` được nạp sẵn qua tùy chỉnh trong `.env`/`docker-compose.yml`.

## Security / DevOps
Dự án được cấu hình sẵn Github Actions với các kiểm tra tự động và tích hợp sẵn công cụ **Snyk Security Scanning** để rà quét tự động các lỗ hổng bảo mật.

---
**Happy Coding!**
