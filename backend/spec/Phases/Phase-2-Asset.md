# 🧳 Phase 2 — Asset Management (CRUD + Check-in/Check-out + Link Ticket)

## 0️⃣ Scope
- Xây dựng module **Asset** mức cơ bản để quản lý tài sản CNTT.
- Hỗ trợ **CRUD**, **check-out / check-in**, lưu **asset history**.
- Cho phép **liên kết asset** vào ticket (chỉ set FK ở ticket – CRUD ticket đã có ở Phase-1).
- Áp dụng **RBAC**: ADMIN thao tác chính; AGENT có quyền đọc & liên kết; END_USER chỉ xem asset của ticket mình.

---

## 1️⃣ API Contracts

### 🔹 POST /assets  _(ADMIN)_
**Mô tả:** Tạo asset mới.

**Request**
```json
{
  "assetTag": "LAP-000123",
  "type": "Laptop",
  "model": "ThinkPad T14",
  "serialNo": "SN-XYZ-2025",
  "status": "AVAILABLE",
  "notes": "Office laptop"
}
```

**Response 201**
```json
{
  "id": 5,
  "assetTag": "LAP-000123",
  "status": "AVAILABLE"
}
```

**Validation**
- `assetTag` **unique**, non-empty.
- `status` ∈ {AVAILABLE, IN_USE, MAINTENANCE, RETIRED}.

---

### 🔹 GET /assets  _(ADMIN, AGENT)_
**Query Params:** `status`, `type`, `assignedTo`, `page`, `size`, `sort`  
**Response 200**
```json
{
  "content": [
    { "id": 5, "assetTag": "LAP-000123", "status": "AVAILABLE" }
  ],
  "page": 0,
  "size": 10,
  "total": 12
}
```

---

### 🔹 GET /assets/{id}  _(ADMIN, AGENT; END_USER xem nếu asset liên kết ticket của mình)_
**Response 200**
```json
{
  "id": 5,
  "assetTag": "LAP-000123",
  "type": "Laptop",
  "model": "ThinkPad T14",
  "serialNo": "SN-XYZ-2025",
  "status": "AVAILABLE",
  "assignedTo": null,
  "notes": "Office laptop"
}
```

**Response 403** nếu END_USER không sở hữu ticket liên quan asset.

---

### 🔹 PATCH /assets/{id}  _(ADMIN)_
**Mô tả:** Cập nhật thông tin asset (không thay đổi status/assignedTo).

**Request**
```json
{ "type": "Laptop", "model": "ThinkPad T14 Gen 2", "notes": "Upgraded RAM" }
```

**Response 200**

---

### 🔹 POST /assets/{id}/checkout  _(ADMIN)_
**Mô tả:** Gán asset cho user (đặt `status=IN_USE`, `assignedTo=userId`).

**Request**
```json
{ "assignedTo": 3, "note": "New employee onboarding" }
```

**Response 200**
```json
{ "id": 5, "status": "IN_USE", "assignedTo": 3 }
```

**Rules**
- Chỉ cho checkout khi `status=AVAILABLE`.
- Ghi `ASSET_HISTORY` (field=`status`/`assigned_to`).

**Response 409** nếu status không hợp lệ.

---

### 🔹 POST /assets/{id}/checkin  _(ADMIN)_
**Mô tả:** Thu hồi asset (đặt `status=AVAILABLE`, `assignedTo=null`).

**Request**
```json
{ "note": "Returned after internship" }
```

**Response 200**
```json
{ "id": 5, "status": "AVAILABLE", "assignedTo": null }
```

**Rules**
- Chỉ cho checkin khi `status=IN_USE`.

**Response 409** nếu status không hợp lệ.

---

### 🔹 GET /assets/{id}/history  _(ADMIN, AGENT)_
**Response 200**
```json
[
  { "id": 11, "field": "status", "oldValue": "AVAILABLE", "newValue": "IN_USE", "changedBy": 1, "createdAt": "..." },
  { "id": 12, "field": "assigned_to", "oldValue": null, "newValue": "3", "changedBy": 1, "createdAt": "..." }
]
```

---

### 🔹 PATCH /tickets/{ticketId}  _(AGENT, ADMIN)_
**Mô tả:** Liên kết asset vào ticket đã tồn tại (Phase-1 đã có endpoint).  
**Request**
```json
{ "relatedAssetId": 5 }
```
**Response 200**

**Rules**
- `relatedAssetId` phải tồn tại; có thể `null` để bỏ liên kết.
- Ghi history ở ticket (optional).

---

## 2️⃣ Data Model chạm tới
- **ASSETS**(id, asset_tag*, type, model, serial_no, status, assigned_to?, notes, created_at, updated_at)
- **ASSET_HISTORY**(id, asset_id, changed_by, field, old_value?, new_value?, note?, created_at)
- **TICKETS**: column `related_asset_id` (đã có từ Phase-1)

---

## 3️⃣ Tasks & Checklist

### 🧩 Entity & Repository
- [ ] `Asset` entity + `AssetHistory` entity (quan hệ 1-n).
- [ ] `AssetRepository`, `AssetHistoryRepository` (CRUD + query index).
- [ ] Index DB: `asset_tag UNIQUE`, `(status)`, `(assigned_to)`.

### 📦 DTO & Validation
- [ ] DTO create/update/checkin/checkout (Java record).
- [ ] Validate `assetTag` non-empty & unique.
- [ ] Enum validate `status`.

### ⚙️ Services
- [ ] `AssetService`:
  - create/update  
  - **checkout**: check status, set `IN_USE`, set `assignedTo`, viết history  
  - **checkin**: check status, set `AVAILABLE`, clear `assignedTo`, viết history  
  - get/list with filters/pagination
- [ ] `AssetHistoryService` (optional): log thay đổi.
- [ ] Ownership helper cho END_USER xem asset trong ticket của mình.

### 🔒 Authorization
- [ ] `ADMIN`: full CRUD + checkout/in + history.
- [ ] `AGENT`: GET/list; PATCH ticket để liên kết asset.
- [ ] `END_USER`: GET asset **chỉ khi** asset liên quan ticket của họ.

### 📄 Controller
- [ ] `/assets` (POST, GET page, GET by id, PATCH)
- [ ] `/assets/{id}/checkout` (POST)
- [ ] `/assets/{id}/checkin` (POST)
- [ ] `/assets/{id}/history` (GET)
- [ ] Reuse `/tickets/{id}` PATCH để link asset (Phase-1).

### 🧪 Testing
- [ ] Unit tests: checkout/in logic (trạng thái hợp lệ/không hợp lệ).
- [ ] Integration tests: CRUD + history + filter.

---

## 4️⃣ Definition of Done (DoD)
| Tiêu chí | Mô tả |
|---------|------|
| ✅ CRUD Asset | Tạo/đọc/cập nhật asset, `assetTag` unique |
| ✅ Checkout/In | Luồng & rule trạng thái đúng, history ghi đủ |
| ✅ Authorization | ADMIN/AGENT/END_USER đúng quyền |
| ✅ Link Ticket | PATCH ticket set `relatedAssetId` hoạt động |
| ✅ Pagination | `/assets` hỗ trợ filter/sort/page/size |
| ✅ Tests | Unit + Integration pass |

---

## 5️⃣ Test Plan (Integration)

| Case | Expect |
|------|--------|
| Tạo asset trùng `assetTag` | 409 |
| Checkout khi `status != AVAILABLE` | 409 |
| Checkin khi `status != IN_USE` | 409 |
| ADMIN checkout → status `IN_USE`, assignedTo set | 200 |
| ADMIN checkin → status `AVAILABLE`, assignedTo null | 200 |
| AGENT xem list assets | 200 |
| END_USER xem asset không liên quan | 403 |
| PATCH ticket set relatedAssetId hợp lệ | 200 |
| GET history sau checkout/in | 200 + entries |

---

## 6️⃣ Out of Scope
- Asset attachment/file.  
- Lập lịch kiểm kê tài sản.  
- Đồng bộ với CMDB ngoài.

---

## 7️⃣ Thứ tự thực thi cho AI Agent
1. Tạo entities (`Asset`, `AssetHistory`) + repos + index.
2. DTO + validation.
3. Viết `AssetService` (CRUD + checkout/in + history).
4. Controller `/assets` + endpoints phụ.
5. Quyền truy cập (SecurityConfig + @PreAuthorize nếu dùng).
6. Integration tests & cập nhật Postman.
