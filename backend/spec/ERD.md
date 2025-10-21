# 🗺️ ERD.md — ITSM Mini

Tài liệu đặc tả lược đồ dữ liệu cho dự án **ITSM mini** (Session-based Auth). Không kèm SQL, tập trung vào **thực thể, quan hệ, ràng buộc, index** và **enum domain**.

---

## 1) Sơ đồ ER (Mermaid)

```mermaid
erDiagram
  USERS ||--o{ TICKETS : reports
  USERS ||--o{ TICKETS : assigned
  USERS ||--o{ TICKET_COMMENTS : writes
  USERS ||--o{ TICKET_HISTORY : changes
  USERS ||--o{ TICKET_ATTACHMENTS : uploads
  DEPARTMENTS ||--o{ USERS : has
  CATEGORIES ||--o{ TICKETS : classifies
  CATEGORIES ||--o{ CATEGORIES : parent_of
  ASSETS ||--o{ TICKETS : related_to
  ASSETS ||--o{ ASSET_HISTORY : changes
  TICKETS ||--o{ TICKET_COMMENTS : has
  TICKETS ||--o{ TICKET_HISTORY : has
  TICKETS ||--o{ TICKET_ATTACHMENTS : has

  USERS {
    bigint id PK
    varchar username UNIQUE
    varchar email UNIQUE
    varchar password_hash
    varchar full_name
    varchar role "END_USER|AGENT|ADMIN"
    bigint department_id FK
    boolean is_active
    timestamp created_at
    timestamp updated_at
  }

  DEPARTMENTS {
    bigint id PK
    varchar name UNIQUE
  }

  CATEGORIES {
    bigint id PK
    varchar name UNIQUE
    bigint parent_id FK
  }

  ASSETS {
    bigint id PK
    varchar asset_tag UNIQUE
    varchar type
    varchar model
    varchar serial_no
    varchar status "AVAILABLE|IN_USE|MAINTENANCE|RETIRED"
    bigint assigned_to FK
    text notes
    timestamp created_at
    timestamp updated_at
  }

  ASSET_HISTORY {
    bigint id PK
    bigint asset_id FK
    bigint changed_by FK
    varchar field
    varchar old_value
    varchar new_value
    text note
    timestamp created_at
  }

  TICKETS {
    bigint id PK
    varchar ticket_number UNIQUE
    varchar subject
    text description
    varchar priority "LOW|MEDIUM|HIGH|CRITICAL"
    varchar status "NEW|IN_PROGRESS|ON_HOLD|RESOLVED|CLOSED|REOPENED|CANCELLED"
    bigint reporter_id FK
    bigint assignee_id FK
    bigint category_id FK
    bigint related_asset_id FK
    timestamp sla_response_deadline
    timestamp sla_resolution_deadline
    varchar sla_flag "OK|NEAR|BREACHED"
    timestamp created_at
    timestamp updated_at
    timestamp resolved_at
    timestamp closed_at
  }

  TICKET_COMMENTS {
    bigint id PK
    bigint ticket_id FK
    bigint author_id FK
    text content
    boolean is_internal
    timestamp created_at
  }

  TICKET_HISTORY {
    bigint id PK
    bigint ticket_id FK
    bigint changed_by FK
    varchar from_status
    varchar to_status
    text note
    timestamp created_at
  }

  TICKET_ATTACHMENTS {
    bigint id PK
    bigint ticket_id FK
    bigint uploaded_by FK
    varchar file_name
    varchar storage_key
    varchar content_type
    bigint size
    timestamp created_at
  }
```
> Tổng số bảng cốt lõi: **9** (TICKET_ATTACHMENTS là optional vẫn ≤10).

---

## 2) Mô tả bảng (tóm tắt)

### 2.1 USERS
| Cột | Kiểu | Bắt buộc | Ghi chú |
|---|---|---:|---|
| id | bigint | ✔ | PK |
| username, email | varchar | ✔ | unique, index |
| password_hash | varchar | ✔ | BCrypt |
| full_name | varchar | ✔ |  |
| role | enum string | ✔ | END_USER/AGENT/ADMIN |
| department_id | bigint | ✖ | FK → DEPARTMENTS, nullable |
| is_active | boolean | ✔ | default true |
| created_at, updated_at | timestamp | ✔ | audit |

### 2.2 DEPARTMENTS
| Cột | Kiểu | Bắt buộc | Ghi chú |
|---|---|---:|---|
| id | bigint | ✔ | PK |
| name | varchar | ✔ | unique |

### 2.3 CATEGORIES
| Cột | Kiểu | Bắt buộc | Ghi chú |
|---|---|---:|---|
| id | bigint | ✔ | PK |
| name | varchar | ✔ | unique |
| parent_id | bigint | ✖ | self FK (nullable) |

### 2.4 ASSETS
| Cột | Kiểu | Bắt buộc | Ghi chú |
|---|---|---:|---|
| id | bigint | ✔ | PK |
| asset_tag | varchar | ✔ | unique, index |
| type, model, serial_no | varchar | ✔ | mô tả cơ bản |
| status | enum string | ✔ | AVAILABLE/IN_USE/MAINTENANCE/RETIRED |
| assigned_to | bigint | ✖ | FK → USERS, nullable |
| notes | text | ✖ | |
| created_at, updated_at | timestamp | ✔ | |

### 2.5 ASSET_HISTORY
| Cột | Kiểu | Bắt buộc | Ghi chú |
|---|---|---:|---|
| id | bigint | ✔ | PK |
| asset_id | bigint | ✔ | FK → ASSETS (**ON DELETE CASCADE**) |
| changed_by | bigint | ✔ | FK → USERS |
| field | varchar | ✔ | ví dụ: status/assigned_to |
| old_value, new_value | varchar | ✖ | |
| note | text | ✖ | |
| created_at | timestamp | ✔ | |

### 2.6 TICKETS
| Cột | Kiểu | Bắt buộc | Ghi chú |
|---|---|---:|---|
| id | bigint | ✔ | PK |
| ticket_number | varchar | ✔ | unique (VD: ITSM-2025-0001) |
| subject | varchar | ✔ | ≥ 5 ký tự |
| description | text | ✔ | ≥ 10 ký tự |
| priority | enum string | ✔ | LOW/MEDIUM/HIGH/CRITICAL |
| status | enum string | ✔ | NEW/IN_PROGRESS/… |
| reporter_id | bigint | ✔ | FK → USERS |
| assignee_id | bigint | ✖ | FK → USERS |
| category_id | bigint | ✔ | FK → CATEGORIES |
| related_asset_id | bigint | ✖ | FK → ASSETS (**ON DELETE SET NULL**) |
| sla_response_deadline, sla_resolution_deadline | timestamp | ✖ | theo priority |
| sla_flag | enum string | ✖ | OK/NEAR/BREACHED |
| created_at, updated_at, resolved_at, closed_at | timestamp | ✔/✖ | |

### 2.7 TICKET_COMMENTS
| Cột | Kiểu | Bắt buộc | Ghi chú |
|---|---|---:|---|
| id | bigint | ✔ | PK |
| ticket_id | bigint | ✔ | FK → TICKETS (**CASCADE**) |
| author_id | bigint | ✔ | FK → USERS |
| content | text | ✔ | non-empty |
| is_internal | boolean | ✔ | default false |
| created_at | timestamp | ✔ | |

### 2.8 TICKET_HISTORY
| Cột | Kiểu | Bắt buộc | Ghi chú |
|---|---|---:|---|
| id | bigint | ✔ | PK |
| ticket_id | bigint | ✔ | FK → TICKETS (**CASCADE**) |
| changed_by | bigint | ✔ | FK → USERS |
| from_status, to_status | varchar | ✔ | log trạng thái |
| note | text | ✖ | |
| created_at | timestamp | ✔ | |

### 2.9 TICKET_ATTACHMENTS (optional)
| Cột | Kiểu | Bắt buộc | Ghi chú |
|---|---|---:|---|
| id | bigint | ✔ | PK |
| ticket_id | bigint | ✔ | FK → TICKETS (**CASCADE**) |
| uploaded_by | bigint | ✔ | FK → USERS |
| file_name | varchar | ✔ | |
| storage_key | varchar | ✔ | path/key lưu trữ |
| content_type | varchar | ✔ | |
| size | bigint | ✔ | giới hạn 5MB (enforce ở app) |
| created_at | timestamp | ✔ | |

---

## 3) Ràng buộc & Hành vi FK

- `TICKET_*` → `TICKETS`: **ON DELETE CASCADE**  
- `ASSET_HISTORY.asset_id` → `ASSETS`: **ON DELETE CASCADE**  
- `TICKETS.related_asset_id` → `ASSETS`: **ON DELETE SET NULL**  
- `USERS.department_id` → `DEPARTMENTS`: **ON DELETE SET NULL**

---

## 4) Chỉ mục (Index) đề xuất

- **USERS**: `username UNIQUE`, `email UNIQUE`
- **TICKETS**: `(status, assignee_id)`, `(reporter_id)`, `(created_at DESC)`, `ticket_number UNIQUE`
- **ASSETS**: `asset_tag UNIQUE`, `(status)`, `(assigned_to)`
- **TICKET_COMMENTS**: `(ticket_id, created_at)`
- **TICKET_HISTORY**: `(ticket_id, created_at)`

---

## 5) Enum Domain

- **User.role**: `END_USER`, `AGENT`, `ADMIN`  
- **Asset.status**: `AVAILABLE`, `IN_USE`, `MAINTENANCE`, `RETIRED`  
- **Ticket.priority**: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`  
- **Ticket.status**: `NEW`, `IN_PROGRESS`, `ON_HOLD`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`  
- **Ticket.sla_flag**: `OK`, `NEAR`, `BREACHED`

---

## 6) Mapping Use Cases ↔ Bảng

- **Auth/RBAC** → `USERS`, `DEPARTMENTS`  
- **Ticket CRUD/Comment/Workflow** → `TICKETS`, `TICKET_COMMENTS`, `TICKET_HISTORY`, `CATEGORIES`  
- **Asset CRUD/Check-in/out** → `ASSETS`, `ASSET_HISTORY`  
- **Link Ticket–Asset** → `TICKETS.related_asset_id`  
- **SLA** → trường `sla_*` & `sla_flag` trên `TICKETS`

---

## 7) Change Log

- **v1.0** — Bản đầu tiên (Session-based auth, không cần bảng refresh token).

