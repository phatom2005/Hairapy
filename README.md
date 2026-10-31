# Hairapy

[![CI/CD Pipeline](https://github.com/phatom2005/Hairapy/actions/workflows/main.yml/badge.svg)](https://github.com/phatom2005/Hairapy/actions)
[![CodeQL](https://github.com/phatom2005/Hairapy/actions/workflows/codeql.yml/badge.svg)](https://github.com/phatom2005/Hairapy/security/code-scanning)
![Security Status](https://img.shields.io/badge/Security-Snyk_Protected-blueviolet?logo=snyk)
![License](https://img.shields.io/badge/License-MIT-green)

*Read this in other languages: [Tiếng Việt](README.vi.md)*

> **Scan. Style. Smile.**
> AI-powered face analysis and virtual hairstyle try-on for the Vietnamese market.

**Live demo:** https://hairapy.io.vn

Hairapy analyzes your face shape from a portrait, recommends hairstyles that suit it, lets you try them on with AI, and connects you with partner salons that can cut the style you liked. Built as a monorepo: React web app, Spring Boot API and a Flutter mobile app.

## Key Features

- **Face analysis** – face-shape detection runs in the browser (MediaPipe Face Landmarker); you can correct the result and pick your gender after the scan.
- **AI hairstyle try-on** – swap your hair with styles from the catalog (AILab Hairstyle), plus instant drag-and-drop hair recoloring in the browser.
- **Hairstyle catalog** – styles with color variants, AI-generated sample images and a "Trending this week" section driven by real usage data.
- **Partner salon network** – after a try-on, find partner salons near you that do that style and send a booking request with your try-on image attached.
- **Salon portal** – partner salons manage bookings, the styles they offer and their prices, and see regional trend insights.
- **Admin dashboard** – users (incl. account locking), subscriptions, payments (with CSV export), catalog, salons, bookings, usage, GA4 analytics, A/B experiments and a weekly insight digest.

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite 8, TailwindCSS 4, Zustand, TanStack Query, React Router 7, Motion, Leaflet |
| **Backend** | Java 21, Spring Boot 3.5, Spring Security + JWT (jjwt), Spring Data JPA |
| **Database** | PostgreSQL (Supabase in production, PostgreSQL 16 in Docker for local dev), Flyway migrations |
| **Cache** | Redis 7 (JWT blacklist on logout) |
| **Image storage** | Cloudinary |
| **AI** | MediaPipe Tasks Vision (in-browser face landmarks and hair segmentation), AILab Hairstyle API (try-on), Google Gemini (AI Stylist, weekly insight summary) |
| **Payment** | PayOS + VietQR (webhook) |
| **Email** | Resend |
| **Analytics** | Google Analytics 4 (gtag + server-side Measurement Protocol, GA4 Data API) |
| **Mobile** | Flutter (`project/mobile`) |
| **DevOps** | Docker, Docker Compose, GitHub Actions |
| **Hosting** | Railway (backend), Vercel (frontend), Supabase (database) |
| **Security** | Bucket4j rate limiting, CodeQL, Snyk, Sentry (optional) |

## Project Structure

```text
.
├── project/
│   ├── frontend/         # React + Vite web app
│   ├── backend/          # Java Spring Boot API (Flyway migrations in src/main/resources/db/migration)
│   └── mobile/           # Flutter mobile app
├── .github/workflows/    # CI/CD (main.yml) and CodeQL (codeql.yml)
├── docker-compose.yml    # Run the whole stack locally
├── .env.example          # Environment variable template
├── README.md
└── README.vi.md
```

## Getting Started

### 1. Prerequisites

- [Docker Desktop](https://www.docker.com/) – required to run the full stack
- [Node.js 20+](https://nodejs.org/) – optional, to run the frontend on its own
- [Java JDK 21](https://adoptium.net/) – optional, to run the backend on its own

### 2. Set up environment variables

```bash
cp .env.example .env
```

For local development you need at least `DB_PASSWORD` and `JWT_SECRET` (generate with `openssl rand -base64 32`). AI, payment, email and analytics features stay disabled or fall back gracefully until their keys are set. See [Environment Variables](#environment-variables).

### 3. Run with Docker

```bash
docker compose up --build
```

| Service | URL |
|---|---|
| **Frontend** | http://localhost:5173 |
| **Backend API** | http://localhost:8090 |
| **Health check** | http://localhost:8090/actuator/health |
| **PostgreSQL** | localhost:5433 |
| **Redis** | localhost:6379 |

> Run in the background with `docker compose up -d`, stop with `docker compose down`.

### 4. Run services individually

**Frontend**
```bash
cd project/frontend
npm install
npm run dev          # http://localhost:5173
```

**Backend** (needs PostgreSQL and Redis running, e.g. `docker compose up db redis`)
```bash
cd project/backend
./mvnw spring-boot:run
```

## Plans

Subscriptions are one-time purchases: they **do not auto-renew** and fall back to Free when they expire. Buying again while a plan is active extends it from the current end date.

| Feature | Free | Weekly plan | Monthly plan |
|---|---|---|---|
| Price | 0đ | 49,000đ / 7 days | 99,000đ / 30 days |
| Face analysis | Unlimited | Unlimited | Unlimited |
| Scans saved to history | 5 / day | 5 / day | 5 / day |
| AI hairstyle try-on | 1 / day | 5 / day | 8 / day |
| Result image without watermark | — | Yes | Yes |
| Exclusive hairstyles | — | Yes | Yes |
| AI Stylist | — | — | Coming soon (5 / day when enabled) |

If an AI try-on fails or times out, the used credit is refunded automatically.

### For salons

**Salon Partner plan – 299,000đ / month** (payment is simulated and recorded by an admin in the MVP; new partners get a 30-day free trial). Partners appear in "Where can I get this cut?" suggestions, receive booking requests with the customer's try-on image, manage their styles and prices, and get regional trend reports. Apply at `/for-salons`.

## Environment Variables

All variables are listed in [`.env.example`](.env.example). Never commit real values.

| Group | Variables | Purpose |
|---|---|---|
| Database | `DB_PASSWORD`, `DB_URL`, `DB_USERNAME` | PostgreSQL connection (production uses the Supabase Session Pooler) |
| Cache | `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` | Redis for the JWT blacklist |
| Auth | `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` | JWT signing key and social login |
| Web | `CORS_ALLOWED_ORIGINS`, `FRONTEND_URL` | Allowed web origins and links in emails |
| AI | `AILAB_API_KEY`, `GEMINI_API_KEY`, `GEMINI_MODEL` | Hairstyle try-on and Gemini (set `GEMINI_MODEL` to a currently available model) |
| Payment | `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY` | PayOS checkout and webhook verification |
| Images | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Image upload |
| Email | `RESEND_API_KEY`, `EMAIL_FROM`, `ALERT_EMAIL` | Transactional email and admin alerts / weekly digest |
| Analytics | `GA_MEASUREMENT_ID`, `GA_MP_API_SECRET`, `GA_PROPERTY_ID`, `GA_SERVICE_ACCOUNT_JSON` | Server-side GA4 events and reading GA4 reports |
| Monitoring | `SENTRY_DSN` | Optional error tracking |
| Frontend (Vite) | `VITE_API_URL`, `VITE_GA_ID`, `VITE_GOOGLE_CLIENT_ID`, `VITE_FACEBOOK_APP_ID`, `VITE_AI_STYLIST_ENABLED` | Values baked into the web build |

Rate limits (`RATE_LIMIT_*`) have sensible defaults and are optional.

## Testing

```bash
# Backend (JUnit, H2 in-memory database)
cd project/backend
./mvnw test

# Frontend
cd project/frontend
npm run lint
npm test
npm run build
```

## Security & DevOps

- **GitHub Actions** – on every push / pull request: backend tests and JAR build, frontend lint + tests + build, Snyk scan (when `SNYK_TOKEN` is set); Docker images are built and pushed on pushes to `main`
- **CodeQL** – static analysis for Java and JavaScript
- **Snyk** – dependency vulnerability scanning
- **Spring Security + JWT** – stateless auth with roles (user, admin, tester, salon owner), logout token blacklist and admin account locking
- **Bucket4j** – rate limiting on login, register, password reset, verification-email resend and payment endpoints
- **Flyway** – versioned schema migrations; production runs with `ddl-auto=validate`
- **Privacy** – analytics events carry only an internal numeric user id; no email, phone number, name or image is sent to Google Analytics

## License

[MIT](LICENSE)

---

**Hairapy** – FPT University HCMC · EXE101 · 2026
