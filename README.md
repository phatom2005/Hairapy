# Full-Stack Monorepo Template

[![CI/CD Pipeline](https://github.com/phatom2005/nextjs-java-monorepo-template/actions/workflows/main.yml/badge.svg)](https://github.com/phatom2005/nextjs-java-monorepo-template/actions)
[![CodeQL](https://github.com/phatom2005/nextjs-java-monorepo-template/actions/workflows/codeql.yml/badge.svg)](https://github.com/phatom2005/nextjs-java-monorepo-template/security/code-scanning)
![Security Status](https://img.shields.io/badge/Security-Snyk_Protected-blueviolet?logo=snyk)
![License](https://img.shields.io/badge/License-MIT-green)

*Read this in other languages: [Tiếng Việt](README.vi.md)*

> **Lean, Secure, and Scalable.** 
> A complete project foundation using **React (Next.js)** and **Java (Spring Boot)**.

This is a powerful project template designed as a monorepo, combining a modern Frontend (React/Next.js) and a high-performance Backend (Java/Spring Boot), pre-configured with a Dockerized environment for both applications along with a PostgreSQL database.

## Tech Stack

- **Frontend:** React (Next.js 15 App Router), Tailwind CSS
- **Backend:** Java (Spring Boot) Web API, Hibernate/Spring Data JPA
- **Database:** PostgreSQL
- **DevOps:** Docker, Docker Compose, GitHub Actions
- **Security:** Snyk Security Scanning

## Project Structure

```text
.
├── project/
│   ├── frontend/         # React (Next.js 15) source code
│   └── backend/          # Java (Spring Boot) source code
├── docker-compose.yml    # Configuration file to build & run the entire system
├── .env                  # Environment variables file (Database Password)
└── README.md
```

## Getting Started

### 1. Prerequisites
- [Docker & Docker CLI](https://www.docker.com/) (Recommended for a consistent development environment).
- [Node.js](https://nodejs.org/) (If you want to run the frontend independently).
- [Java JDK 17+](https://adoptium.net/) (If you want to develop and test the backend locally).

### 2. Run with Docker (Development Environment)
The easiest way is to launch the Frontend, Backend, and Database simultaneously with a single command:

1. Ensure your `.env` file has the necessary settings (Defaults to `DB_PASSWORD=YourPassword123` to avoid DB container errors).
2. Open a terminal at the root of this project and run:
   ```bash
   docker compose up --build
   ```
3. After a successful build, the services will be available at:
   - **Frontend (Next.js):** [http://localhost:3000](http://localhost:3000)
   - **Backend API:** [http://localhost:5000](http://localhost:5000)
   - **Database (PostgreSQL):** Port `5432`

> **Note:** The DB Volume is mapped externally, so your database data is preserved even if the container is stopped. Add the `-d` flag (`docker compose up -d`) if you want to run Docker in detached mode (in the background). To stop the services, run `docker compose down`.

### 3. Run Services Individually (Manual)

#### Run Frontend independently (requires Node.js):
```bash
cd project/frontend
npm install
npm run dev
```

#### Run Backend independently (requires Java JDK):
```bash
cd project/backend
./mvnw spring-boot:run
```
*(Note: If running manually, ensure PostgreSQL is running locally or modify the database connection string inside `application.yml` or `application.properties` to match your local DB connection).*

## Customizing the Project 
- **API Project:** When you change the project structure inside the `backend/` directory, remember to open `docker-compose.yml` and update the `dockerfile` path if needed.
- **Frontend Environment Variables:** The frontend connects to the backend using the `NEXT_PUBLIC_API_URL` environment variable, which is pre-configured via `.env`/`docker-compose.yml`.

## Security / DevOps
The project comes pre-configured with Github Actions for automated checks and integrates **Snyk Security Scanning** to automatically scan for security vulnerabilities.

---
**Happy Coding!**