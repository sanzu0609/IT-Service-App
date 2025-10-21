# 🧰 Phase 4 — DevOps & Documentation (Docker, Compose, Postman, CI)

## 0️⃣ Scope
- Đóng gói ứng dụng **Spring Boot** bằng Docker.
- Dựng **docker-compose** chạy **Postgres + App** (profile `dev`).
- Chuẩn hóa **ENV** (`.env.sample`) và runbook trong **README**.
- Tạo **Postman Collection** cho toàn bộ luồng.
- (Optional) **GitHub Actions CI**: build + test + badge.

---

## 1️⃣ Artifacts cần bàn giao
- `Dockerfile` (JDK 21, JAR layer caching).
- `docker-compose.yml` (services: `db`, `app`).
- `.env.sample` (DB_URL, DB_USER, DB_PASS, SERVER_PORT, SPRING_PROFILES_ACTIVE).
- `README.md` (Quickstart, ENV, Docker, Swagger links).
- `POSTMAN_COLLECTION.json` (Auth, Ticket, Asset, SLA).
- `.github/workflows/ci.yml` (build & test) — optional.
- (Optional) `Makefile` tiện chạy lệnh.

---

## 2️⃣ Dockerfile (spec)
> Multi-stage build để giảm size; bật JVM options hợp lý cho dev.

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
- [ ] Không copy `.mvnw` vào image run.
- [ ] Dùng JRE base image cho stage run.
- [ ] `JAVA_OPTS` có thể override ở compose.

---

## 3️⃣ docker-compose.yml (spec)
> Chạy Postgres + App. Dùng network nội bộ, mount volume cho DB.

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
    # Optional: add JVM opts
    # environment:
    #   JAVA_OPTS: "-Xms256m -Xmx512m"

volumes:
  db_data:
```

**Checklist**
- [ ] `depends_on` healthcheck để app chờ DB sẵn sàng.
- [ ] Port map 5432 & 8080 config qua ENV.

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

> **Lưu ý:** Commit file `.env.sample`, **không** commit `.env` thật.

---

## 5️⃣ README.md — Quickstart (spec)
Nội dung cần có:
1. **Giới thiệu project** + link đến `docs/Overview.md`, `docs/ERD.md`, `docs/Phases/`.
2. **Yêu cầu môi trường:** Docker, Maven, JDK 21.
3. **Chạy nhanh**:
   ```bash
   cp .env.sample .env
   docker compose up -d db
   ./mvnw spring-boot:run
   # hoặc build image & compose cả app
   docker compose up --build
   ```
4. **Swagger**: `http://localhost:8080/swagger-ui/index.html`
5. **Postman Collection**: cách import `POSTMAN_COLLECTION.json`.
6. **Seed users**: admin/agent/alice (ghi rõ user/pass).
7. **Troubleshooting**: DB connection, port bị chiếm, clean volume:
   ```bash
   docker compose down -v
   ```

---

## 6️⃣ Postman Collection (spec)
Folders đề xuất:
- `Auth/` → Login, Me, Logout
- `Tickets/` → Create, List, Get, Patch, Comment, Status
- `Assets/` → Create, List, Get, Patch, Checkout, Checkin, History
- `SLA/` → (verify fields & flags)

**Checklist**
- [ ] Set **Base URL** = `{{base_url}}` (env variable).  
- [ ] Bật **cookie persist** cho session.  
- [ ] Với POST/PATCH/DELETE (trừ `/auth/*`), gửi `X-CSRF-TOKEN` (nếu dùng CookieCsrfTokenRepository → lấy từ `/csrf`).

---

## 7️⃣ GitHub Actions CI (optional spec)
Workflow `.github/workflows/ci.yml`:

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
- [ ] Cache Maven để tốc độ nhanh.  
- [ ] PR hiển thị pass/fail.  
- [ ] (Optional) thêm badge vào README.

---

## 8️⃣ Makefile (optional)
```Makefile
.PHONY: dev-up dev-down build run test seed

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

- [ ] Viết `Dockerfile` multi-stage và build OK.
- [ ] Viết `docker-compose.yml` chạy `db` + `app` bằng ENV.
- [ ] Thêm `.env.sample` & hướng dẫn tạo `.env`.
- [ ] Cập nhật `README.md` Quickstart + Troubleshooting.
- [ ] Tạo `POSTMAN_COLLECTION.json` (các folder/requests đầy đủ).
- [ ] (Optional) Thêm CI workflow `ci.yml`.
- [ ] (Optional) Makefile tiện thao tác.

---

## 🔟 Definition of Done (DoD)
| Tiêu chí | Mô tả |
|---------|------|
| ✅ Dockerfile | Build image thành công, app chạy |
| ✅ Compose | `docker compose up` chạy được DB + App |
| ✅ ENV | `.env.sample` rõ ràng; `.env` được ignore |
| ✅ Docs | README + link đến `docs/` đầy đủ |
| ✅ Postman | Import được collection, chạy end-to-end |
| ✅ CI | (Optional) CI build & test chạy pass |

---

## 1️⃣1️⃣ Test Plan (Manual)
- [ ] `docker compose up --build` → App reachable at `:8080`.
- [ ] Swagger mở được; `/auth/login` → set cookie; `/auth/me` trả user.
- [ ] Tạo ticket, đổi status, add comment, link asset → OK.
- [ ] Asset checkout/in → history ghi lại.
- [ ] SLA job cập nhật flag (mock clock nếu có).

---

## 1️⃣2️⃣ Out of Scope
- CD/Deploy lên cloud (k8s, ECS).  
- Secrets manager (Vault, SSM).  
- Observability nâng cao (Prometheus, Grafana, ELK).
