# 🧭 ITSM Mini Clone — Project Overview  
**Version:** v1.1 — Updated for Phase 0B integration  

---

## 0️⃣ Mục tiêu dự án
Dự án mô phỏng một phần mềm **IT Service Management (ITSM)** cơ bản gồm ba module chính:

1. 🎫 **Ticket System** — Quản lý yêu cầu hỗ trợ (Incident/Request)  
2. 🧳 **Asset Management** — Quản lý tài sản CNTT (máy tính, thiết bị, phần mềm)  
3. 🔄 **Workflow & SLA** — Theo dõi quy trình xử lý & thời gian phản hồi

Mục tiêu:
- Dựng nền tảng backend **chuẩn doanh nghiệp** (Spring Boot, Maven, PostgreSQL).
- Viết **API sạch, có kiểm thử**, tuân thủ layered architecture.
- Đủ mức độ để trình bày trong **portfolio Java Fresher** (không overkill).

---

## 1️⃣ Tech Stack

| Layer | Technology | Ghi chú |
|-------|-------------|--------|
| **Language** | Java 21 | Sử dụng record, switch expression, Stream API |
| **Framework** | Spring Boot 3.x | Core, Web, Validation, Data JPA, Scheduling |
| **Security** | Spring Security (Session-based) | CSRF bật, Cookie login, không dùng JWT |
| **Build tool** | Maven | Dựng project, quản lý dependencies |
| **Database** | PostgreSQL | Dùng H2 cho test |
| **ORM** | Hibernate | JPA annotations chuẩn |
| **Test** | JUnit 5, Spring Boot Test, MockMvc | Unit + Integration |
| **Docs** | Markdown, Mermaid, Postman | Cấu trúc /docs/ |
| **Containerization** | Docker, docker-compose | Chạy app + DB local |
| **CI/CD (optional)** | GitHub Actions | Build + test tự động |

---

## 2️⃣ Kiến trúc tổng quan

### 🔹 Mô hình
**Layered Architecture**
```
controller → service → repository → entity
```

### 🔹 Quy tắc chính
- Entity chỉ chứa dữ liệu.
- Service xử lý logic nghiệp vụ.
- Controller chỉ tiếp nhận request/response.
- Dùng DTO (record) giữa controller ↔ service.
- Tách rõ config (security, scheduler, datasource...).

---

## 3️⃣ Entities chính (theo module)

| Module | Entity | Ghi chú |
|---------|---------|--------|
| **Auth/User** | User, Department | Role, active, mustChangePassword |
| **Ticket** | Ticket, TicketComment, TicketHistory, Category | CRUD, comment, transition |
| **Asset** | Asset, AssetHistory | CRUD + checkin/checkout |
| **SLA/Workflow** | (fields trong Ticket) | deadline + auto-close job |

---

## 4️⃣ Lifecycle hệ thống (Business Flow)

1. 👤 **User/Agent/Admin đăng nhập** qua `/auth/login` (session-based).  
2. 👑 **Admin** tạo user mới (qua Phase 0B) và quản lý quyền.  
3. 🙋‍♂️ **End User** tạo ticket hỗ trợ → auto gán trạng thái `NEW`.  
4. 🧑‍🔧 **Agent** nhận xử lý → ticket chuyển `IN_PROGRESS → RESOLVED`.  
5. ✅ **Admin** giám sát, cập nhật SLA và asset liên quan.  
6. 🕒 **Scheduler** tự đánh cờ SLA (NEAR/BREACHED) & auto close sau N ngày.  

---

## 5️⃣ ERD Tổng quan (Mermaid)

```mermaid
erDiagram
  USERS {
    bigint id PK
    varchar username
    varchar email
    varchar password_hash
    varchar role
    boolean is_active
    boolean must_change_password
    timestamp created_at
    timestamp updated_at
  }

  DEPARTMENTS {
    bigint id PK
    varchar name
  }

  TICKETS {
    bigint id PK
    varchar subject
    text description
    varchar status
    varchar priority
    bigint reporter_id FK -> USERS.id
    bigint assignee_id FK -> USERS.id
    bigint related_asset_id FK -> ASSETS.id
    bigint category_id FK -> CATEGORIES.id
    timestamp created_at
    timestamp updated_at
    timestamp sla_response_deadline
    timestamp sla_resolution_deadline
    varchar sla_flag
  }

  ASSETS {
    bigint id PK
    varchar asset_tag
    varchar type
    varchar model
    varchar serial_no
    varchar status
    bigint assigned_to FK -> USERS.id
  }

  ASSET_HISTORY {
    bigint id PK
    bigint asset_id FK -> ASSETS.id
    varchar field
    varchar old_value
    varchar new_value
    bigint changed_by FK -> USERS.id
    timestamp created_at
  }

  TICKET_COMMENTS {
    bigint id PK
    bigint ticket_id FK -> TICKETS.id
    bigint author_id FK -> USERS.id
    text content
    boolean is_internal
    timestamp created_at
  }

  TICKET_HISTORY {
    bigint id PK
    bigint ticket_id FK -> TICKETS.id
    varchar from_status
    varchar to_status
    bigint changed_by FK -> USERS.id
    text note
    timestamp created_at
  }

  CATEGORIES {
    bigint id PK
    varchar name
  }

  USERS ||--o{ TICKETS : "reporter_id"
  USERS ||--o{ TICKETS : "assignee_id"
  USERS ||--o{ ASSETS : "assigned_to"
  USERS ||--o{ ASSET_HISTORY : "changed_by"
  USERS ||--o{ TICKET_HISTORY : "changed_by"
  USERS ||--o{ TICKET_COMMENTS : "author_id"
```

---

## 6️⃣ Phân chia Phase

| Phase | Tên | Mô tả | Output |
|--------|------|--------|---------|
| **Phase 0** | Authentication & RBAC | Login/logout, session, CSRF | `/auth/*`, `/csrf`, `/auth/me` |
| **Phase 0B** | User Management | Admin CRUD user, reset/self change password | `/users/*` |
| **Phase 1** | Ticket Core | CRUD ticket, comment, status transition | `/tickets/*` |
| **Phase 2** | Asset Management | CRUD asset, checkin/out, link ticket | `/assets/*` |
| **Phase 3** | SLA & Scheduler | SLA compute, flag (NEAR/BREACHED), auto-close | `@Scheduled` jobs |
| **Phase 4** | DevOps & Docs | Dockerfile, Compose, Postman, CI | `/Dockerfile`, `/docs/*` |

---

## 7️⃣ Milestones (timeline gợi ý)

| Sprint | Mục tiêu chính | Thời gian ước lượng |
|---------|----------------|---------------------|
| Sprint 0 | Auth + RBAC | 2 ngày |
| Sprint 0B | User CRUD + Password change | 1 ngày |
| Sprint 1 | Ticket CRUD + Comment + Workflow | 3 ngày |
| Sprint 2 | Asset CRUD + Checkout/In | 2 ngày |
| Sprint 3 | SLA & Scheduler | 2 ngày |
| Sprint 4 | Docker + Docs + Postman | 1 ngày |

---

## 8️⃣ Testing Strategy

| Cấp độ | Mục tiêu | Công cụ |
|--------|-----------|--------|
| Unit | Logic nghiệp vụ (service, util) | JUnit 5 |
| Integration | REST API (MockMvc + H2) | SpringBootTest |
| Manual | End-to-end (Postman, Browser) | Postman |
| Optional | CI/CD build | GitHub Actions |

---

## 9️⃣ Deliverables

- 📁 **Source code:** `/backend` (Spring Boot)  
- 🧩 **Docs:** `/docs/Overview.md`, `/docs/ERD.md`, `/docs/Phases/*.md`  
- 🧪 **Tests:** `/src/test/java/...`  
- 🐳 **Docker:** `Dockerfile`, `docker-compose.yml`  
- 🧭 **Postman Collection:** `ITSM_API.postman_collection.json`

---

## 🔟 Definition of Done (to close project)

- [x] Toàn bộ phase có spec, code, test pass.  
- [x] App chạy ổn qua `docker compose up`.  
- [x] Postman test full luồng: login → ticket → asset → SLA → auto close.  
- [x] README đầy đủ hướng dẫn setup.  
- [x] GitHub repo public, có tag version.  

---

## 📘 Notes
- **Không dùng JWT** để giảm độ phức tạp — session login là đủ cho fresher-level.  
- Tất cả spec được thiết kế để **AI Agent** có thể code tự động theo checklist.  
- Có thể mở rộng thêm UI (React hoặc Thymeleaf) ở giai đoạn sau.

---
