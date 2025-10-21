# 🎫 Phase 1 — Ticket Management (CRUD + Comment + Workflow)

## 0️⃣ Scope
- CRUD ticket cơ bản: tạo, xem chi tiết, cập nhật, xóa (soft delete nếu cần).
- Comment (public/internal) cho từng ticket.
- Status workflow (NEW → IN_PROGRESS → RESOLVED → CLOSED + REOPEN).
- Ghi lịch sử thay đổi (`TICKET_HISTORY`).
- Filter/list tickets với pagination + sort.

---

## 1️⃣ API Contracts

### 🔹 POST /tickets
**Mô tả:** Tạo ticket mới (status mặc định = `NEW`).

**Request**
```json
{
  "subject": "Cannot connect to Wi-Fi",
  "description": "Laptop cannot connect to office Wi-Fi since morning.",
  "priority": "HIGH",
  "categoryId": 1,
  "relatedAssetId": null
}
```

**Response 201**
```json
{
  "id": 10,
  "ticketNumber": "ITSM-2025-0010",
  "status": "NEW",
  "subject": "Cannot connect to Wi-Fi",
  "priority": "HIGH",
  "reporter": "alice"
}
```

**Validation**
- subject ≥ 5 ký tự
- description ≥ 10 ký tự

---

### 🔹 GET /tickets
**Mô tả:** Liệt kê danh sách ticket (theo quyền).  
**Query Params:** `status`, `priority`, `assignee`, `page`, `size`, `sort`

**Response 200**
```json
{
  "content": [
    { "id": 1, "ticketNumber": "ITSM-2025-0001", "status": "NEW", "subject": "..." }
  ],
  "page": 0,
  "size": 10,
  "total": 42
}
```
**Quyền:**
- END_USER → chỉ ticket mình tạo (`reporter_id`)
- AGENT/ADMIN → thấy tất cả

---

### 🔹 GET /tickets/{id}
**Mô tả:** Lấy chi tiết ticket (kèm comments, asset liên quan nếu có).  
**Response 200**
```json
{
  "id": 1,
  "ticketNumber": "ITSM-2025-0001",
  "subject": "...",
  "description": "...",
  "priority": "HIGH",
  "status": "IN_PROGRESS",
  "comments": [
    { "id": 1, "content": "Checking...", "author": "agent" }
  ]
}
```
**Response 403** nếu không có quyền (ownership).

---

### 🔹 PATCH /tickets/{id}
**Mô tả:** Cập nhật assignee, priority, hoặc asset liên kết.

**Request**
```json
{ "assigneeId": 2, "priority": "MEDIUM", "relatedAssetId": 5 }
```
**Response 200:** cập nhật thành công.

**Response 400:** giá trị invalid.  
**Response 403:** không đủ quyền.

---

### 🔹 POST /tickets/{id}/comments
**Mô tả:** Thêm comment cho ticket.

**Request**
```json
{ "content": "Issue escalated to network team", "isInternal": true }
```

**Response 201**
```json
{ "id": 12, "author": "agent", "isInternal": true, "createdAt": "..." }
```

**Rules:**
- Nội dung không rỗng.
- `isInternal` chỉ agent/admin mới dùng được.
- END_USER chỉ comment public.

---

### 🔹 POST /tickets/{id}/status
**Mô tả:** Chuyển trạng thái ticket.

**Request**
```json
{ "toStatus": "RESOLVED", "note": "Fixed Wi-Fi config" }
```

**Rules:**
- `NEW → IN_PROGRESS` yêu cầu ticket có `assignee`.
- `IN_PROGRESS → RESOLVED` yêu cầu `note` không rỗng.
- `RESOLVED → CLOSED` chỉ AGENT/ADMIN.
- `RESOLVED → REOPENED` chỉ END_USER ticket đó.

**Response 200**
```json
{ "id": 1, "fromStatus": "IN_PROGRESS", "toStatus": "RESOLVED", "note": "Fixed Wi-Fi config" }
```

---

## 2️⃣ Data Model chạm tới
- `TICKETS`, `TICKET_COMMENTS`, `TICKET_HISTORY`, `CATEGORIES`
- Các liên kết FK tới `USERS`, `ASSETS`.

---

## 3️⃣ Tasks & Checklist

### 🧩 Entity & Repository
- [ ] Tạo entity: `Ticket`, `TicketComment`, `TicketHistory`, `Category`.
- [ ] Repository CRUD đầy đủ, có `findAllWithFilters(...)` cho list API.

### 📦 DTO & Validation
- [ ] DTO cho create/update/status/comment (Java record).
- [ ] Validation: subject≥5, description≥10.
- [ ] Mapping entity ↔ DTO (dùng MapStruct hoặc ModelMapper).

### ⚙️ Service Layer
- [ ] TicketService CRUD + ownership check.
- [ ] CommentService thêm comment (kiểm tra role).
- [ ] Status transition logic + ghi history.

### 🔒 Authorization
- [ ] Kiểm tra quyền trong service hoặc dùng `@PreAuthorize`.
- [ ] Ownership: END_USER chỉ thao tác ticket của họ.

### 📄 Pagination & Filter
- [ ] API `/tickets` có filter status, priority, assignee, sort, page, size.
- [ ] Mặc định sort `createdAt DESC`.

### 🧠 Business Logic
- [ ] Sinh `ticketNumber`: format `"ITSM-" + YYYY + "-" + paddedId`.
- [ ] Ghi `TicketHistory` mỗi lần đổi status.

### 🧪 Testing
- [ ] Unit tests cho TicketService (status transitions, ownership).
- [ ] Integration test CRUD (MockMvc + H2).

---

## 4️⃣ Definition of Done (DoD)
| Tiêu chí | Mô tả |
|-----------|-------|
| ✅ CRUD hoạt động | Tạo, xem, sửa, xóa ticket |
| ✅ Comment hoạt động | Public/internal đúng quyền |
| ✅ Workflow | Status đổi đúng rule, ghi lịch sử |
| ✅ Ownership | END_USER bị giới hạn đúng |
| ✅ Validation | subject, description hợp lệ |
| ✅ Filter | Pagination/sort/filter chạy ổn |
| ✅ Test coverage | ≥70% TicketService |

---

## 5️⃣ Test Plan (Integration)

| Case | Expect |
|------|---------|
| Tạo ticket thiếu subject | 400 |
| Tạo ticket hợp lệ | 201 |
| END_USER xem ticket người khác | 403 |
| AGENT cập nhật priority | 200 |
| Comment rỗng | 400 |
| Comment internal từ END_USER | 403 |
| NEW→IN_PROGRESS thiếu assignee | 400 |
| IN_PROGRESS→RESOLVED thiếu note | 400 |
| RESOLVED→CLOSED bởi ADMIN | 200 |
| RESOLVED→REOPENED bởi END_USER | 200 |
| List ticket by status=NEW | 200 + filter đúng |

---

## 6️⃣ Out of Scope
- Asset CRUD / SLA (Phase-2+).
- File attachment upload.

---

## 7️⃣ Thứ tự thực thi cho AI Agent
1. Tạo entity + repository.
2. DTO + validation.
3. TicketService (CRUD + ownership + transition + history).
4. CommentService.
5. Controller `/tickets` + `/tickets/{id}/comments` + `/tickets/{id}/status`.
6. Unit test TicketService + Integration test.
