# 🧩 ITSM Mini Clone — ERD Specification  
**Version:** v1.1 — Updated for Phase 0B integration  

---

## 1️⃣ Overview

Sơ đồ ERD mô tả cấu trúc cơ sở dữ liệu của hệ thống ITSM Mini, bao gồm các module:  
- **User & Department** (Phase 0, 0B)  
- **Ticket System** (Phase 1)  
- **Asset Management** (Phase 2)  
- **SLA & Workflow** (Phase 3)  

---

## 2️⃣ ER Diagram (Mermaid)

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

  TICKETS {
    bigint id PK
    varchar subject
    text description
    varchar status
    varchar priority
    bigint reporter_id FK -> USERS.id
    bigint assignee_id FK -> USERS.id
    bigint category_id FK -> CATEGORIES.id
    bigint related_asset_id FK -> ASSETS.id
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

  ASSETS {
    bigint id PK
    varchar asset_tag
    varchar type
    varchar model
    varchar serial_no
    varchar status
    bigint assigned_to FK -> USERS.id
    text notes
    timestamp created_at
    timestamp updated_at
  }

  ASSET_HISTORY {
    bigint id PK
    bigint asset_id FK -> ASSETS.id
    varchar field
    varchar old_value
    varchar new_value
    bigint changed_by FK -> USERS.id
    text note
    timestamp created_at
  }

  USERS ||--o{ TICKETS : "reporter_id"
  USERS ||--o{ TICKETS : "assignee_id"
  USERS ||--o{ ASSETS : "assigned_to"
  USERS ||--o{ ASSET_HISTORY : "changed_by"
  USERS ||--o{ TICKET_HISTORY : "changed_by"
  USERS ||--o{ TICKET_COMMENTS : "author_id"
  DEPARTMENTS ||--o{ USERS : "1-N"
  CATEGORIES ||--o{ TICKETS : "1-N"
  ASSETS ||--o{ ASSET_HISTORY : "1-N"
```

---

## 3️⃣ Entity chi tiết

### 👤 USERS
| Trường | Kiểu | Ghi chú |
|--------|------|---------|
| id | bigint | Primary key |
| username | varchar | Unique |
| email | varchar | Unique |
| password_hash | varchar | Bcrypt |
| role | enum(`ADMIN`,`AGENT`,`END_USER`) | RBAC |
| is_active | boolean | Cho phép đăng nhập |
| must_change_password | boolean | Bắt buộc đổi mật khẩu sau khi reset/tạo mới |
| department_id | FK → DEPARTMENTS.id | Phòng ban |
| created_at / updated_at | timestamp | Audit fields |

---

### 🏢 DEPARTMENTS
| Trường | Kiểu | Ghi chú |
|--------|------|---------|
| id | bigint | PK |
| name | varchar | Tên phòng ban |

---

### 🎫 TICKETS
| Trường | Kiểu | Ghi chú |
|--------|------|---------|
| id | bigint | PK |
| subject | varchar | Tiêu đề yêu cầu |
| description | text | Nội dung |
| status | enum(`NEW`,`IN_PROGRESS`,`ON_HOLD`,`RESOLVED`,`CLOSED`,`CANCELLED`,`REOPENED`) | Trạng thái |
| priority | enum(`LOW`,`MEDIUM`,`HIGH`,`CRITICAL`) | Độ ưu tiên |
| reporter_id | FK → USERS.id | Người tạo |
| assignee_id | FK → USERS.id | Người xử lý |
| category_id | FK → CATEGORIES.id | Phân loại |
| related_asset_id | FK → ASSETS.id | Tài sản liên quan |
| sla_response_deadline | timestamp | Hạn phản hồi |
| sla_resolution_deadline | timestamp | Hạn xử lý |
| sla_flag | enum(`OK`,`NEAR`,`BREACHED`) | Trạng thái SLA |
| created_at / updated_at | timestamp | Audit fields |

---

### 💬 TICKET_COMMENTS
| Trường | Kiểu | Ghi chú |
|--------|------|---------|
| id | bigint | PK |
| ticket_id | FK → TICKETS.id | Ticket liên quan |
| author_id | FK → USERS.id | Người bình luận |
| content | text | Nội dung |
| is_internal | boolean | Bình luận nội bộ (chỉ Agent/Admin xem) |
| created_at | timestamp | Thời gian tạo |

---

### 📜 TICKET_HISTORY
| Trường | Kiểu | Ghi chú |
|--------|------|---------|
| id | bigint | PK |
| ticket_id | FK → TICKETS.id | Ticket |
| from_status | varchar | Từ trạng thái |
| to_status | varchar | Sang trạng thái |
| changed_by | FK → USERS.id | Người thay đổi |
| note | text | Ghi chú |
| created_at | timestamp | Thời gian thay đổi |

---

### 🗂️ CATEGORIES
| Trường | Kiểu | Ghi chú |
|--------|------|---------|
| id | bigint | PK |
| name | varchar | Tên nhóm (VD: Hardware, Software, Access) |

---

### 🧳 ASSETS
| Trường | Kiểu | Ghi chú |
|--------|------|---------|
| id | bigint | PK |
| asset_tag | varchar | Unique tag (VD: LAP-000123) |
| type | varchar | Loại tài sản |
| model | varchar | Model |
| serial_no | varchar | Số serial |
| status | enum(`AVAILABLE`,`IN_USE`,`MAINTENANCE`,`RETIRED`) | Trạng thái |
| assigned_to | FK → USERS.id | Người đang sử dụng |
| notes | text | Mô tả |
| created_at / updated_at | timestamp | Audit fields |

---

### 🧾 ASSET_HISTORY
| Trường | Kiểu | Ghi chú |
|--------|------|---------|
| id | bigint | PK |
| asset_id | FK → ASSETS.id | Asset liên quan |
| field | varchar | Tên trường thay đổi |
| old_value | varchar | Giá trị cũ |
| new_value | varchar | Giá trị mới |
| changed_by | FK → USERS.id | Người thao tác |
| note | text | Ghi chú (VD: “check-in từ agent”) |
| created_at | timestamp | Thời gian |

---

## 4️⃣ Index & Constraint đề xuất
| Bảng | Cột | Mục đích |
|------|------|----------|
| USERS | username, email | unique |
| USERS | department_id | FK |
| TICKETS | reporter_id, assignee_id | FK |
| TICKETS | status, priority | filter |
| ASSETS | asset_tag | unique |
| ASSET_HISTORY | asset_id | lookup |
| TICKET_HISTORY | ticket_id | lookup |
| TICKET_COMMENTS | ticket_id | lookup |

---

## 5️⃣ Relationship Summary
- 1 `Department` → N `Users`  
- 1 `User` → N `Tickets` (reporter/assignee)  
- 1 `Ticket` → N `TicketComments`, `TicketHistory`  
- 1 `Asset` → N `AssetHistory`  
- 1 `User` → N `AssetHistory`, `TicketHistory`, `TicketComments`  
- 1 `Category` → N `Tickets`

---

## 6️⃣ Change Log
| Phiên bản | Ngày | Mô tả thay đổi |
|------------|------|----------------|
| v1.0 | 2025-10-10 | ERD khởi tạo |
| **v1.1** | 2025-10-22 | Thêm `must_change_password` vào bảng USERS (Phase 0B), cập nhật liên kết Users–Departments, tinh gọn quan hệ Ticket–Asset |

---

## 7️⃣ Ghi chú thiết kế
- Trường `must_change_password` phục vụ cho việc reset/tạo tài khoản mới ở **Phase 0B**.  
- Các `timestamp` lưu theo UTC.  
- Không cần bảng SLA riêng — lưu trong `TICKETS`.  
- `status`, `priority`, `sla_flag` dùng enum cố định.  
- Các bảng có `created_at`, `updated_at` dùng auto timestamp (JPA Auditing).  

---
