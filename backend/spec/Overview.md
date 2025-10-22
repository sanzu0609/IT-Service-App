# 🧭 ITSM Mini Clone — Project Overview  
**Version:** v1.2 — Simplified (No Asset Module)

---

## 0️⃣ Mục tiêu dự án
Dự án mô phỏng một phần mềm **IT Service Management (ITSM)** cơ bản gồm 3 module chính:

1. 🎫 **Ticket System** — Quản lý yêu cầu hỗ trợ (Incident/Request)  
2. 👤 **User Management** — Quản lý người dùng, vai trò và quyền hạn  
3. 🔄 **Workflow & SLA** — Theo dõi quy trình xử lý & thời gian phản hồi

Mục tiêu:
- Xây dựng backend **chuẩn doanh nghiệp** bằng Spring Boot + PostgreSQL.  
- Nắm vững **Authentication, Authorization, CRUD, Workflow, Scheduler.**  
- Tối ưu scope cho **portfolio Java Fresher (10–14 ngày)**.

---

## 1️⃣ Tech Stack

| Layer | Technology | Ghi chú |
|-------|-------------|--------|
| **Language** | Java 21 | Hỗ trợ record, pattern matching, Stream API |
| **Framework** | Spring Boot 3.x | Core, Web, Validation, Data JPA, Scheduling |
| **Security** | Spring Security (Session-based) | CSRF bật, Cookie login, không JWT |
| **Database** | PostgreSQL | Dùng H2 cho integration test |
| **Build Tool** | Maven | Quản lý dependencies |
| **Testing** | JUnit 5, MockMvc, Spring Boot Test | Unit + Integration |
| **Documentation** | Markdown, Mermaid, Postman | /docs folder |
| **Containerization** | Docker, docker-compose | App + Database |
| **CI/CD (optional)** | GitHub Actions | Build & test tự động |

---

## 2️⃣ Kiến trúc tổng quan

**Mô hình:** Layered Architecture  
```
Controller → Service → Repository → Entity
```

**Nguyên tắc:**
- Entity: chỉ chứa dữ liệu.  
- Service: xử lý logic nghiệp vụ.  
- Controller: nhận request, trả response DTO.  
- Sử dụng `record` cho DTO.  
- Cấu hình tách biệt: Security, Scheduler, Exception handler, etc.

---

## 3️⃣ Entities chính (theo module)

| Module | Entity | Ghi chú |
|---------|---------|--------|
| **Auth/User** | User, Department | Role-based access, password reset, CSRF session |
| **Ticket** | Ticket, TicketComment, TicketHistory, Category | CRUD, comment, workflow, history |
| **SLA** | (fields trong Ticket) | Deadline + auto-close scheduler |

---

## 4️⃣ Lifecycle hệ thống

1. 👤 **User/Agent/Admin** đăng nhập qua `/auth/login` (session-based).  
2. 👑 **Admin** tạo user mới, đặt role và bắt buộc đổi mật khẩu.  
3. 🙋 **End User** tạo ticket mới (status = NEW).  
4. 🧑‍🔧 **Agent** nhận xử lý → chuyển `IN_PROGRESS → RESOLVED`.  
5. ✅ **User** xác nhận hoặc reopen nếu chưa hài lòng.  
6. 🕒 **Scheduler (Phase 2)** tự flag SLA và auto-close ticket cũ.

---

## 5️⃣ ERD (Tóm tắt)

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
    bigint department_id FK
    timestamp created_at
    timestamp updated_at
  }

  TICKETS {
    bigint id PK
    varchar subject
    text description
    varchar status
    varchar priority
    bigint reporter_id FK -> USERS.id
    bigint assignee_id FK -> USERS.id
    bigint category_id FK -> CATEGORIES.id
    bigint related_asset_id
    timestamp created_at
    timestamp updated_at
    timestamp sla_response_deadline
    timestamp sla_resolution_deadline
    varchar sla_flag
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
  USERS ||--o{ TICKET_COMMENTS : "author_id"
  USERS ||--o{ TICKET_HISTORY : "changed_by"
  CATEGORIES ||--o{ TICKETS : "1-N"
```

---

## 6️⃣ Phân chia Phase

| Phase | Nội dung | Mục tiêu chính |
|--------|-----------|----------------|
| **Phase 0** | Authentication & RBAC | Login, session, CSRF |
| **Phase 0B** | User Management | CRUD user, reset/change password |
| **Phase 1** | Ticket System | CRUD + Comment + Workflow |
| **Phase 2** | SLA & Scheduler | Deadline, auto-close |
| **Phase 3** | DevOps & Docs | Docker, README, Postman, CI |

---

## 7️⃣ Milestones (timeline gợi ý)

| Sprint | Mục tiêu | Thời gian (ước lượng) |
|---------|-----------|----------------------|
| Sprint 0 | Auth + RBAC | 2 ngày |
| Sprint 0B | User CRUD | 1 ngày |
| Sprint 1 | Ticket CRUD + Workflow | 3–4 ngày |
| Sprint 2 | SLA + Auto-close job | 2 ngày |
| Sprint 3 | Docker + Postman + Docs | 1–2 ngày |

---

## 8️⃣ Testing Strategy

| Cấp độ | Mục tiêu | Công cụ |
|--------|-----------|--------|
| Unit | Test service logic | JUnit 5 |
| Integration | REST API + DB | MockMvc + H2 |
| Manual | Kiểm thử luồng qua Postman | Postman |
| Optional | CI/CD | GitHub Actions |

---

## 9️⃣ Deliverables

- 📁 **Source:** `/backend` (Spring Boot)  
- 📄 **Docs:** `/docs/Overview.md`, `/docs/ERD.md`, `/docs/Phases/*.md`  
- 🧪 **Tests:** `/src/test/java/...`  
- 🐳 **Docker:** `Dockerfile`, `docker-compose.yml`  
- 🧭 **Postman:** `ITSM_API.postman_collection.json`

---

## 🔟 Definition of Done

- [x] Auth hoạt động (session + CSRF)  
- [x] User CRUD hoạt động  
- [x] Ticket CRUD, Comment, Workflow hoàn chỉnh  
- [x] SLA flag + Auto-close hoạt động  
- [x] Docker compose chạy app + Postgres  
- [x] Tài liệu Postman + README đầy đủ  

---

## 📘 Notes
- Scope được rút gọn để vừa sức **fresher-level (backend focus)**.  
- Có thể mở rộng Asset module sau khi xin được việc.  
- Thiết kế hướng “AI Agent friendly”: mỗi phase có spec riêng, dễ generate tự động.

---
