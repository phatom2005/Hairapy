# Hairapy

[![CI/CD Pipeline](https://github.com/phatom2005/Hairapy/actions/workflows/main.yml/badge.svg)](https://github.com/phatom2005/Hairapy/actions)
[![CodeQL](https://github.com/phatom2005/Hairapy/actions/workflows/codeql.yml/badge.svg)](https://github.com/phatom2005/Hairapy/security/code-scanning)
![Security Status](https://img.shields.io/badge/Security-Snyk_Protected-blueviolet?logo=snyk)
![License](https://img.shields.io/badge/License-MIT-green)

*Read this in other languages: [Tiếng Việt](README.vi.md)*

> **Scan. Style. Smile.**
> AI-powered hairstyle analysis and recommendation web app for Gen Z.

Hairapy is a web application that uses AI to analyze face shape and suggest suitable hairstyles. Built as a monorepo with a modern React frontend and a high-performance Java Spring Boot backend.

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 + Vite, TailwindCSS, Zustand, React Query |
| **Backend** | Java 21, Spring Boot 3, Spring Security + JWT |
| **Database** | PostgreSQL 16, Flyway migration |
| **Cache** | Redis 7 |
| **Storage** | Cloudflare R2 (auto-delete after 24h) |
| **Payment** | PayOS + VietQR |
| **DevOps** | Docker, Docker Compose, GitHub Actions |
| **Security** | Snyk, Bucket4j rate limiting, HTTPS |

## Project Structure

```text
.
├── project/
│   ├── frontend/         # React + Vite source code
│   └── backend/          # Java Spring Boot source code
├── docker-compose.yml    # Build & run the entire stack
├── .env.example          # Environment variables template
└── README.md
```

## Getting Started

### 1. Prerequisites

- [Docker Desktop](https://www.docker.com/) — required to run the full stack
- [Node.js 20+](https://nodejs.org/) — optional, for running frontend independently
- [Java JDK 21+](https://adoptium.net/) — optional, for running backend independently

### 2. Setup environment

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

Minimum required for local dev:

```env
DB_PASSWORD=YourPassword123
JWT_SECRET=hairapy_jwt_secret_key_minimum_32_chars
```

### 3. Run with Docker

Launch the full stack (Frontend + Backend + PostgreSQL + Redis) with one command:

```bash
docker compose up --build
```

After a successful build, services are available at:

| Service | URL |
|---|---|
| **Frontend** | http://localhost:3000 |
| **Backend API** | http://localhost:8090 |
| **Health Check** | http://localhost:8090/actuator/health |
| **PostgreSQL** | localhost:5433 |
| **Redis** | localhost:6379 |

> Add `-d` flag to run in background: `docker compose up -d`
> Stop all services: `docker compose down`

### 4. Run services individually

**Frontend** (requires Node.js):
```bash
cd project/frontend
npm install
npm run dev
# Available at http://localhost:5173
```

**Backend** (requires Java 21):
```bash
cd project/backend
./mvnw spring-boot:run
# Ensure PostgreSQL is running locally first
```

## User Tiers

| Feature | Guest | Free | Premium |
|---|---|---|---|
| Face analysis | ✗ | 1x/day | 5x/day |
| Hairstyle try-on | ✗ | 5x/day | 20x/day |
| Hairstyle catalog | ✗ | Limited | Full |
| Image quality | ✗ | Watermark | HD, clean |
| Outfit suggestions | ✗ | ✗ | ✓ |

## Environment Variables

See `.env.example` for all required variables. Key ones:

```env
DB_PASSWORD=          # PostgreSQL password
JWT_SECRET=           # Min 32 chars
R2_BUCKET=            # Cloudflare R2 bucket name
R2_ACCESS_KEY=        # Cloudflare R2 access key
R2_SECRET_KEY=        # Cloudflare R2 secret key
PAYOS_API_KEY=        # PayOS API key
SENTRY_DSN=           # Sentry error tracking DSN
```

## Security & DevOps

- **GitHub Actions** — CI/CD pipeline: test → build → deploy on push to `main`
- **Snyk** — automatic vulnerability scanning on every build
- **CodeQL** — static code analysis
- **JWT + Spring Security** — stateless auth with 3-tier access control
- **Bucket4j** — rate limiting per user tier
- **HTTPS** — Let's Encrypt via Cloudflare

---

**Hairapy** — FPT University HCM · EXE101 · 2026
