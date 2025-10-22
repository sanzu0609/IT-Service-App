# 🧰 Phase 3 — DevOps & Documentation (Docker, Compose, Postman, CI)
**Version:** v1.2 — Simplified (No Asset Module)

---

## 0️⃣ Scope
- Đóng gói ứng dụng **Spring Boot** (Java 21) bằng Docker.
- Dựng **docker-compose** chạy **Postgres + App** (profile `dev`).
- Chuẩn hóa **ENV** (`.env.sample`) và runbook trong **README**.
- Tạo **Postman Collection** cho các luồng còn lại (Auth, Users, Tickets, SLA).
- (Optional) **GitHub Actions CI**: build + test + badge.

> Gỡ toàn bộ references tới Asset module.

---

## 1️⃣ Artifacts bàn giao
- `Dockerfile` (multi-stage).
- `docker-compose.yml` (services: `db`, `app`).
- `.env.sample` (DB & server config).
- `README.md` (Quickstart, ENV, Docker, Swagger links).
- `POSTMAN_COLLECTION.json` (Auth, User, Ticket, SLA).
- `.github/workflows/ci.yml` (build & test) — optional.
- (Optional) `Makefile` tiện chạy lệnh.

---

## 2️⃣ Dockerfile (spec)
```dockerfile
# ===== Build stage =====
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn -B -DskipTests=true clean package

# ===== Run stage =====
FROM eclipse-temurin:21-jre
WORKDIR /app
ENV JAVA_OPTS="-Xms256m -Xmx512m"
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["sh","-c","java $JAVA_OPTS -jar /app/app.jar"]
```
**Checklist**
- [ ] Build OK locally (`mvn -DskipTests=true clean package`).
- [ ] Image run size gọn (JRE base).

---

## 3️⃣ docker-compose.yml (spec)
```yaml
version: "3.9"
services:
  db:
    image: postgres:15-alpine
    container_name: itsm_db
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-itsm_db}
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-postgres}
    ports:
      - "${DB_PORT:-5432}:5432"
    volumes:
      - db_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB"]
      interval: 5s
      timeout: 3s
      retries: 10

  app:
    build: .
    container_name: itsm_app
    depends_on:
      db:
        condition: service_healthy
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://db:5432/${POSTGRES_DB:-itsm_db}
      SPRING_DATASOURCE_USERNAME: ${POSTGRES_USER:-postgres}
      SPRING_DATASOURCE_PASSWORD: ${POSTGRES_PASSWORD:-postgres}
      SPRING_PROFILES_ACTIVE: ${SPRING_PROFILES_ACTIVE:-dev}
      SERVER_PORT: ${SERVER_PORT:-8080}
    ports:
      - "${SERVER_PORT:-8080}:8080"

volumes:
  db_data:
```
**Checklist**
- [ ] `depends_on` healthcheck.
- [ ] Port map từ ENV.

---

## 4️⃣ `.env.sample` (spec)
```
# Database
POSTGRES_DB=itsm_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
DB_PORT=5432

# Spring
SPRING_PROFILES_ACTIVE=dev
SERVER_PORT=8080
```
> Commit `.env.sample`, **không commit** `.env` thật.

---

## 5️⃣ README.md — Quickstart (spec)
Nội dung cần có:
1. **Giới thiệu** + link `docs/Overview.md`, `docs/ERD.md`, `docs/Phases/`.
2. **Yêu cầu môi trường:** Docker, Maven, JDK 21.
3. **Chạy nhanh**:
   ```bash
   cp .env.sample .env
   docker compose up -d db
   ./mvnw spring-boot:run
   # Hoặc build image & compose cả app
   docker compose up --build
   ```
4. **Swagger**: `http://localhost:8080/swagger-ui/index.html`
5. **Postman Collection**: import `POSTMAN_COLLECTION.json`.
6. **Seed users**: admin/agent/alice (ghi rõ user/pass).
7. **Troubleshooting**: DB connection, port bị chiếm, clean volume:
   ```bash
   docker compose down -v
   ```

---

## 6️⃣ Postman Collection (spec)
Folders đề xuất:
- `Auth/` → Login, Me, Logout, CSRF
- `Users/` → Create, List, Get, Update, Reset Password, Self Change Password
- `Tickets/` → Create, List, Get, Patch, Delete, Comment Add/List, Status Change
- `SLA/` → Verify fields & run checker (manual)

**Environment variables**
- `base_url` = `http://localhost:8080`
- `csrf_token` (nếu dùng CookieCsrfTokenRepository → GET `/csrf` trước)

**Scripts gợi ý**
- Tests: assert status code, JSON schema (basic).

---

## 7️⃣ GitHub Actions CI (optional)
`.github/workflows/ci.yml`:
```yaml
name: CI
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up JDK 21
        uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: '21'
          cache: 'maven'
      - name: Build & Test
        run: ./mvnw -B -DskipTests=false test
```
**Checklist**
- [ ] Cache Maven.
- [ ] PR hiển thị pass/fail.
- [ ] (Optional) badge trạng thái vào README.

---

## 8️⃣ Makefile (optional)
```Makefile
.PHONY: dev-up dev-down build run test

dev-up:
	docker compose up -d db

dev-down:
	docker compose down -v

build:
	./mvnw -B -DskipTests=true clean package

run:
	java -jar target/*.jar

test:
	./mvnw -B test
```

---

## 9️⃣ Tasks & Checklist
- [ ] Dockerfile multi-stage build OK.
- [ ] compose chạy `db` + `app` với ENV.
- [ ] `.env.sample` & README Quickstart.
- [ ] Postman collection **không có Asset**.
- [ ] (Optional) CI workflow.
- [ ] (Optional) Makefile.

---

## 🔟 Definition of Done (DoD)
| Tiêu chí | Mô tả |
|---------|------|
| ✅ Dockerfile | Build image thành công, app chạy |
| ✅ Compose | `docker compose up` chạy được DB + App |
| ✅ ENV | `.env.sample` rõ ràng; `.env` ignored |
| ✅ Docs | README + link `docs/` đầy đủ |
| ✅ Postman | Import collection, chạy end-to-end |
| ✅ CI | (Optional) CI build & test pass |

---

## 1️⃣1️⃣ Manual Test Plan
- [ ] `docker compose up --build` → App chạy `:8080`.
- [ ] Swagger mở được; `/auth/login` → session cookie; `/auth/me` trả user.
- [ ] Users: admin tạo user mới, reset & self change password.
- [ ] Tickets: create → assign → in_progress → resolved → (auto) closed.
- [ ] SLA: verify deadline fields, checker/auto-close chạy (thủ công hoặc mock).

---

## 1️⃣2️⃣ Out of Scope
- Deploy cloud/Kubernetes.
- Secrets manager (Vault, SSM).
- Observability nâng cao (Prometheus/Grafana/ELK).
