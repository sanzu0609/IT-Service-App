# 📘 Overview.md — ITSM Mini (Session-based Authentication)

## 1️⃣ Mục tiêu & Phạm vi (MVP)
Xây dựng hệ thống **ITSM mini** (IT Service Management) mô phỏng nền tảng quản lý yêu cầu nội bộ doanh nghiệp.  
Mục tiêu chính là nắm vững **Spring Boot backend development**, bao gồm:
- Authentication/Authorization (session-based, không JWT)  
- Ticket Management (CRUD + comment + workflow)  
- Asset Management (liên kết với ticket, check-in/out)  
- SLA Tracking (deadline, auto-close, scheduler)  
- DevOps cơ bản (Docker + Postgres + Postman + Docs)

> **Mức độ:** Fresher–Junior  
> **Mục tiêu học tập:** Hiểu rõ cách thiết kế, code, và triển khai một backend dự án thật.

---

## 2️⃣ Tech Stack (chuẩn hóa cho AI Agent)

| Layer | Công nghệ |
|-------|------------|
| **Language** | Java 21 |
| **Framework** | Spring Boot 3.3.x |
| **Build Tool** | Maven Wrapper (`./mvnw`) |
| **Database** | PostgreSQL 15+ |
| **ORM** | Spring Data JPA (Hibernate) |
| **Security** | Spring Security 6 (Session-based, CSRF ON) |
| **Test** | JUnit 5, Mockito, SpringBootTest |
| **DevOps** | Docker, docker-compose |
| **Docs** | OpenAPI/Swagger UI, Markdown Specs |
| **Others** | Lombok (optional), MapStruct (optional), ModelMapper |

---

## 3️⃣ Kiến trúc hệ thống

**Mô hình:** `Layered Architecture + Package-by-Feature`  
Cấu trúc dự án:
```
src/main/java/org/example/backend/
 ├─ domain/
 │   ├─ auth/
 │   ├─ user/
 │   ├─ ticket/
 │   ├─ asset/
 │   ├─ common/
 │   └─ sla/
 ├─ security/
 ├─ config/
 └─ Application.java
```

**Nguyên tắc thiết kế:**
- Single Responsibility cho từng lớp (Entity, Repository, Service, Controller).
- Dependency Injection (Spring IoC).
- Validation layer ở DTO.
- Response chuẩn hóa qua `ApiResponse<T>`.

**Database:** chuẩn hóa 3NF, dùng UUID hoặc bigint làm khóa chính.  
**Session Management:** dùng cookie `JSESSIONID` (HttpOnly, SameSite=Lax, Secure=true ở prod).  
**CSRF:** bật, bỏ qua `/auth/login`, `/auth/logout`.

---

## 4️⃣ Actors & Roles (RBAC)

| Role | Quyền chính | Hành động cụ thể |
|------|--------------|------------------|
| **ADMIN** | Quản trị viên | CRUD users/assets/categories, xem tất cả ticket |
| **AGENT** | Nhân viên IT | Xử lý ticket, đổi trạng thái, comment nội bộ |
| **END_USER** | Nhân viên thông thường | Tạo, xem, comment, reopen ticket của mình |

### Quy tắc Ownership
- `END_USER` chỉ truy cập ticket do họ tạo (`reporter_id`).  
- `AGENT` chỉ thao tác ticket được assign.  
- `ADMIN` bỏ qua ràng buộc ownership.

---

## 5️⃣ Use Cases (UC chính)

| UC | Mô tả | Actor |
|----|--------|--------|
| UC01 | Đăng nhập / đăng xuất | All |
| UC02 | Xem thông tin bản thân (me) | All |
| UC03 | Tạo ticket mới | END_USER |
| UC04 | Lọc danh sách ticket | ALL (phân quyền theo vai trò) |
| UC05 | Cập nhật thông tin ticket (priority, assignee) | AGENT, ADMIN |
| UC06 | Comment (public/internal) | END_USER, AGENT, ADMIN |
| UC07 | Chuyển trạng thái ticket (workflow) | AGENT, ADMIN, END_USER (reopen) |
| UC08 | CRUD tài sản (asset) | ADMIN |
| UC09 | Check-in/out asset | ADMIN |
| UC10 | Gán asset vào ticket | ADMIN, AGENT |
| UC11 | Tính SLA khi tạo ticket | SYSTEM |
| UC12 | Scheduler SLA (NEAR, BREACHED) | SYSTEM |
| UC13 | Auto-close ticket sau N ngày | SYSTEM |

---

## 6️⃣ Modules & Mối liên hệ

| Module | Vai trò | Liên kết |
|---------|----------|-----------|
| **Auth** | Login/logout, session, CSRF | Cần UserRepository |
| **User** | Lưu user/role/department | Liên kết ticket, asset |
| **Ticket** | CRUD, comment, status workflow | Liên kết category, asset |
| **Asset** | CRUD + check-in/out | Liên kết ticket |
| **SLA** | Deadline, scheduler | Phụ thuộc Ticket |
| **Common** | Exception, ApiResponse, GlobalError | Toàn hệ thống dùng chung |

---

## 7️⃣ ERD & Workflow
- **ERD:** `spec/ERD.md`  
- **Ticket Workflow:** `spec/WORKFLOW.md`  
- **Asset Workflow:** trong Phase-2  
- **SLA Scheduler:** trong Phase-3  

---

## 8️⃣ Phase & Milestones

| Phase | Mục tiêu | Mô tả |
|-------|-----------|-------|
| **Phase 0** | Auth & RBAC | Session login/logout, role, ownership |
| **Phase 1** | Ticket | CRUD, comment, status workflow |
| **Phase 2** | Asset | CRUD, check-in/out, link ticket |
| **Phase 3** | SLA/Scheduler | Deadline compute, auto-close |
| **Phase 4** | DevOps & Docs | Dockerfile, compose, Postman, README |

Xem chi tiết từng phase tại `docs/Phases/Phase-*.md`.

---

## 9️⃣ Definition of Done (DoD - toàn hệ thống)
- [ ] Build OK (`mvn clean package`)  
- [ ] Unit test ≥ 70% coverage service layer  
- [ ] Integration test chạy qua MockMvc/H2  
- [ ] REST API trả JSON chuẩn hóa (`ApiResponse<T>`)  
- [ ] CSRF & session hoạt động đúng  
- [ ] Docs cập nhật (Overview, ERD, Phase)  
- [ ] Docker compose chạy được Postgres + app  
- [ ] Postman collection full flow chạy OK

---

## 🔟 ENV & Run

`.env.sample`
```
DB_URL=jdbc:postgresql://localhost:5432/itsm_db
DB_USER=postgres
DB_PASS=postgres
SPRING_PROFILES_ACTIVE=dev
SERVER_PORT=8080
```

### Chạy local:
```bash
docker compose up -d db
./mvnw spring-boot:run
```

### Swagger:
- `http://localhost:8080/swagger-ui/index.html`
- `http://localhost:8080/v3/api-docs`

---

## 🧩 Quy ước dự án (coding convention)

| Mục | Quy tắc |
|-----|----------|
| **Packages** | `domain/<feature>/{entity,repository,service,controller,dto}` |
| **Naming** | Java class PascalCase, DB table snake_case |
| **DTO** | tách `request` và `response`, dùng Java record |
| **Response** | `ApiResponse<T> { success, data, message, code? }` |
| **Errors** | JSON `{ code, message }` — code ví dụ: `AUTH_BAD_CREDENTIALS`, `FORBIDDEN`, `NOT_FOUND` |
| **Security** | CSRF ON, cookie HttpOnly, SameSite=Lax, Secure=true ở prod |
| **Testing** | JUnit 5 + Mockito; đặt tên test `given_when_then` |

---

## 🧠 Notes cho AI Agent
- Ưu tiên đọc `spec/Phases/` trước khi generate code.  
- Tạo file theo pattern đã định trong Overview.  
- Không tự thêm framework khác (JWT, OAuth2, Redis, Kafka...).  
- Code output nên tuân thủ package-by-feature và Spring convention.
