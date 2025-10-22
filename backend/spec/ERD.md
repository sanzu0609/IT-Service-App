# 🧩 ITSM Mini Clone — ERD Specification
**Version:** v1.2 — Simplified (No Asset Module)

---

## 1) Overview
Bản ERD rút gọn cho scope Fresher: **Auth/User**, **Ticket**, **SLA**.  
Đã **bỏ Asset Management**. Cột `related_asset_id` được giữ lại **dạng tham chiếu lỏng** (không FK) để mở rộng sau.

---

## 2) ER Diagram (Mermaid)
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

  DEPARTMENTS {
    bigint id PK
    varchar name
  }

  CATEGORIES {
    bigint id PK
    varchar name
  }

  TICKETS {
    bigint id PK
    varchar ticket_number
    varchar subject
    text description
    varchar status
    varchar priority
    bigint reporter_id FK -> USERS.id
    bigint assignee_id FK -> USERS.id
    bigint category_id FK -> CATEGORIES.id
    bigint related_asset_id  "optional, no FK"
    timestamp created_at
    timestamp updated_at
    timestamp resolved_at
    timestamp closed_at
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

  DEPARTMENTS ||--o{ USERS : "1-N"
  USERS ||--o{ TICKETS : "reporter_id"
  USERS ||--o{ TICKETS : "assignee_id"
  USERS ||--o{ TICKET_COMMENTS : "author_id"
  USERS ||--o{ TICKET_HISTORY : "changed_by"
  CATEGORIES ||--o{ TICKETS : "1-N"
```
> Lưu ý: `related_asset_id` **không có FK** trong phiên bản này.

---

## 3) Bảng & Trường (tóm tắt)

### 👤 USERS
- `id (PK)`, `username*`, `email*`, `password_hash`, `role {ADMIN|AGENT|END_USER}`  
- `is_active (default true)`, `must_change_password (default true)`  
- `department_id (FK → DEPARTMENTS.id, nullable)`  
- `created_at`, `updated_at`

### 🏢 DEPARTMENTS
- `id (PK)`, `name*`

### 🗂 CATEGORIES
- `id (PK)`, `name*`

### 🎫 TICKETS
- `id (PK)`, `ticket_number*`, `subject`, `description`  
- `status {NEW|IN_PROGRESS|ON_HOLD|RESOLVED|CLOSED|REOPENED|CANCELLED}`  
- `priority {LOW|MEDIUM|HIGH|CRITICAL}`  
- `reporter_id (FK → USERS.id)`, `assignee_id (FK → USERS.id, nullable)`  
- `category_id (FK → CATEGORIES.id)`  
- `related_asset_id (nullable, **no FK**)`  
- `sla_response_deadline`, `sla_resolution_deadline`, `sla_flag {OK|NEAR|BREACHED}`  
- `created_at`, `updated_at`, `resolved_at?`, `closed_at?`

### 💬 TICKET_COMMENTS
- `id (PK)`, `ticket_id (FK → TICKETS.id)`, `author_id (FK → USERS.id)`  
- `content`, `is_internal (default false)`, `created_at`

### 📜 TICKET_HISTORY
- `id (PK)`, `ticket_id (FK → TICKETS.id)`, `from_status`, `to_status`, `changed_by (FK → USERS.id)`  
- `note?`, `created_at`

---

## 4) Indexes & Constraints (đề xuất)

- **USERS**: `username UNIQUE`, `email UNIQUE`, `department_id` (FK)  
- **TICKETS**: `ticket_number UNIQUE`, `(status, assignee_id)`, `reporter_id`, `created_at DESC`  
- **COMMENTS**: `(ticket_id, created_at)`  
- **HISTORY**: `(ticket_id, created_at)`

---

## 5) Enum Domains
- `User.role`: `ADMIN`, `AGENT`, `END_USER`  
- `Ticket.status`: `NEW`, `IN_PROGRESS`, `ON_HOLD`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`  
- `Ticket.priority`: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`  
- `Ticket.sla_flag`: `OK`, `NEAR`, `BREACHED`

---

## 6) Change Log
- **v1.2 (2025-10-22)** — Loại bỏ bảng `ASSETS`, `ASSET_HISTORY`; giữ `related_asset_id` (no FK).  
- v1.1 — Thêm `users.must_change_password`.  
- v1.0 — Bản ERD khởi tạo.

---

## 7) Ghi chú
- Khuyến nghị dùng **JPA Auditing** cho `created_at/updated_at`.  
- `ticket_number` có thể sinh theo format: `ITSM-YYYY-####`.  
- Khi muốn khôi phục Asset module sau này, chỉ cần tạo bảng `ASSETS` và thêm FK cho `related_asset_id`.
