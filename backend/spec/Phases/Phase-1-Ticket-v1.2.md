# 🎫 Phase 1 — Ticket Management (CRUD + Comment + Workflow)  
**Version:** v1.2 — Simplified (No Asset Module)

---

## 0️⃣ Scope
- Xây dựng **Ticket module** với các chức năng:
  - CRUD ticket
  - Comment (public/internal)
  - Workflow chuyển trạng thái
  - Kiểm soát ownership theo role
- **Không còn Asset module**. Trường `relatedAssetId` được **giữ tùy chọn (optional, no FK)** để mở rộng tương lai.

---

## 1️⃣ API Contracts

### 🔹 POST /tickets
**Mô tả:** Tạo ticket mới, status mặc định `NEW`.  
**Yêu cầu:** Role = `END_USER` hoặc `ADMIN`.  
**Validation:** `subject ≥ 5`, `description ≥ 10`, `categoryId` tồn tại.

**Request**
```json
{
  "subject": "Laptop không khởi động được",
  "description": "Nhấn nút nguồn nhưng máy không lên.",
  "priority": "HIGH",
  "categoryId": 1,
  "relatedAssetId": null
}
```

**Response 201**
```json
{
  "id": 12,
  "ticketNumber": "ITSM-2025-0012",
  "status": "NEW",
  "priority": "HIGH",
  "reporter": { "id": 3, "username": "alice" },
  "createdAt": "2025-10-22T10:00:00Z"
}
```

---

### 🔹 GET /tickets
**Mô tả:** Liệt kê ticket (phân trang + filter).  
**Query params:** `status`, `priority`, `assigneeId`, `page`, `size`, `sort`.

- END_USER: chỉ thấy ticket mình tạo.  
- AGENT/ADMIN: thấy tất cả.

**Response**
```json
{
  "content": [
    {
      "id": 12,
      "ticketNumber": "ITSM-2025-0012",
      "subject": "Laptop không khởi động được",
      "status": "NEW",
      "priority": "HIGH",
      "assignee": null,
      "relatedAssetId": null
    }
  ],
  "page": 0,
  "size": 10,
  "totalElements": 25
}
```

---

### 🔹 GET /tickets/{id}
**Mô tả:** Xem chi tiết ticket.  
- END_USER chỉ xem ticket của mình.  
- AGENT/ADMIN xem tất cả.

**Response 200**
```json
{
  "id": 12,
  "ticketNumber": "ITSM-2025-0012",
  "subject": "Laptop không khởi động được",
  "description": "…",
  "priority": "HIGH",
  "status": "IN_PROGRESS",
  "categoryId": 1,
  "assignee": { "id": 2, "username": "agent" },
  "relatedAssetId": null,
  "comments": [
    { "id": 20, "content": "Đang kiểm tra nguồn", "author": "agent", "isInternal": true }
  ],
  "history": [
    { "from": "NEW", "to": "IN_PROGRESS", "by": "agent", "at": "…" }
  ]
}
```

---

### 🔹 PATCH /tickets/{id}
**Mô tả:** Cập nhật ticket (assign agent, thay đổi priority/category, **relatedAssetId optional**).  
**Yêu cầu:** `ADMIN` hoặc `AGENT`.  
**Rules:** `assigneeId` phải là user **tồn tại & active**.  
**Response:** 200 OK hoặc 403 nếu không có quyền.

**Request (ví dụ)**
```json
{ "assigneeId": 2, "priority": "MEDIUM", "relatedAssetId": null }
```

---

### 🔹 DELETE /tickets/{id}
**Mô tả:** Xóa ticket (ADMIN-only).  
**Response:** `204 No Content`.

---

### 🔹 POST /tickets/{id}/comments
**Mô tả:** Thêm bình luận (public/internal).  
**Rules:**
- END_USER không được đặt `isInternal=true`.
- Nội dung không rỗng.

**Request**
```json
{ "content": "Đã kiểm tra phần nguồn, có thể do pin hỏng.", "isInternal": true }
```

**Response 201**
```json
{ "id": 20, "ticketId": 12, "author": "agent", "isInternal": true, "createdAt": "…" }
```

---

### 🔹 GET /tickets/{id}/comments
**Mô tả:** Liệt kê comment (ẩn comment nội bộ với END_USER).

---

### 🔹 POST /tickets/{id}/status
**Mô tả:** Thay đổi trạng thái ticket theo workflow.  
**Workflow:**
```
NEW → IN_PROGRESS → RESOLVED → CLOSED
           ↓
        ON_HOLD
           ↑
       REOPENED ← RESOLVED
```
**Rule mẫu:**
- `NEW → IN_PROGRESS`: chỉ khi `assignee` != null.
- `IN_PROGRESS → RESOLVED`: yêu cầu `note` (resolution note).
- `RESOLVED → REOPENED`: chỉ END_USER (ticket của họ).

**Request**
```json
{ "toStatus": "RESOLVED", "note": "Fixed BIOS config" }
```

---

## 2️⃣ Entity Mapping

### 🎫 Ticket
| Trường | Kiểu | Ghi chú |
|--------|------|---------|
| id | bigint | PK |
| ticket_number | varchar | Unique, format `ITSM-YYYY-####` |
| subject | varchar | ≥ 5 |
| description | text | ≥ 10 |
| status | enum | NEW/IN_PROGRESS/ON_HOLD/RESOLVED/CLOSED/REOPENED/CANCELLED |
| priority | enum | LOW/MEDIUM/HIGH/CRITICAL |
| reporter_id | FK → USERS.id | Người tạo |
| assignee_id | FK → USERS.id | Người xử lý (nullable) |
| category_id | FK → CATEGORIES.id | |
| related_asset_id | bigint | **Optional, không FK** |
| created_at / updated_at / resolved_at? / closed_at? | timestamp | |

### 💬 TicketComment
| Trường | Kiểu | Ghi chú |
|--------|------|---------|
| id | bigint | PK |
| ticket_id | FK → TICKETS.id | |
| author_id | FK → USERS.id | |
| content | text | non-empty |
| is_internal | boolean | default false |
| created_at | timestamp | |

### 📜 TicketHistory
| Trường | Kiểu | Ghi chú |
|--------|------|---------|
| id | bigint | PK |
| ticket_id | FK → TICKETS.id | |
| from_status / to_status | varchar | |
| changed_by | FK → USERS.id | |
| note | text | required với một số transition |
| created_at | timestamp | |

---

## 3️⃣ Business Rules

| Luật | Mô tả |
|------|--------|
| Ownership | END_USER chỉ thao tác trên ticket mình tạo |
| Comment | Comment nội bộ chỉ hiện với Agent/Admin |
| Assign | ADMIN/AGENT mới gán assignee; assignee phải active |
| Workflow | Kiểm tra điều kiện trước khi đổi trạng thái |
| Auto history | Mỗi thay đổi trạng thái ghi 1 record vào TicketHistory |
| relatedAssetId | **Optional**, không kiểm tra FK trong v1.2 |

---

## 4️⃣ Checklist

### 🧱 Entity + Repository
- [x] Ticket, TicketComment, TicketHistory, Category
- [x] Repository CRUD + filter (status, priority, assignee, createdAt DESC)
- [x] Generator `ticketNumber`

### 🔧 Service Layer
- [x] `TicketService` — CRUD, assign, status change, generate number  
- [x] `CommentService` — thêm/browse comment  
- [x] `WorkflowValidator` — kiểm tra trạng thái hợp lệ  
- [x] `TicketHistoryService` — ghi log tự động

### 🚦 Controller
- [ ] `/tickets` CRUD  
- [ ] `/tickets/{id}/comments`  
- [ ] `/tickets/{id}/status`

### 🔒 Security
- [ ] Ownership guard (user chỉ xem ticket của mình)  
- [ ] Role guard (`@PreAuthorize`)  
- [ ] Validation (subject ≥ 5, description ≥ 10)

---

## 5️⃣ Definition of Done (DoD)

| Mục tiêu | Trạng thái |
|-----------|-------------|
| ✅ CRUD ticket | Hoạt động, có validation |
| ✅ Comment | Tách public/internal |
| ✅ Workflow | Ma trận chuyển trạng thái & guard |
| ✅ Ownership | Kiểm tra đúng quyền người dùng |
| ✅ History | Ghi lại mọi thay đổi trạng thái |
| ✅ Integration test | MockMvc test luồng chính |
| ✅ Data seed | Category mẫu: Hardware, Software, Access |

---

## 6️⃣ Test Plan

### 🔸 Unit Test
| Thành phần | Mục tiêu |
|-------------|----------|
| TicketService | CRUD, assign, ownership |
| WorkflowValidator | Luồng hợp lệ/không hợp lệ |
| TicketHistoryService | Log tự động |

### 🔸 Integration Test
| Case | Expect |
|------|---------|
| Tạo ticket | 201 |
| Xem ticket của user khác | 403 |
| Comment nội bộ | 200 (Agent), 403 (User) |
| Đổi trạng thái hợp lệ | 200 |
| Đổi trạng thái không hợp lệ | 400 |
| relatedAssetId=null | 200 (chấp nhận) |
| Workflow log | Có bản ghi trong history |

---

## 7️⃣ Integration với Phase khác

| Phase | Liên kết |
|--------|----------|
| **Phase 0 / 0B** | Dùng `User` và `Role` để kiểm tra quyền. |
| **Phase 2 (SLA)** | Cập nhật deadline khi ticket tạo hoặc priority thay đổi. |

---

## 8️⃣ Out of Scope
- Asset CRUD / checkin/out.  
- Email notification.

---

## 9️⃣ Hướng dẫn thực thi (AI Agent order)
1. Tạo entity/repository.  
2. Viết service CRUD + status transition logic.  
3. Thêm comment + history service.  
4. Tạo controller với phân quyền.  
5. Viết test unit & integration.  
6. Seed dữ liệu & Postman scripts.

---
