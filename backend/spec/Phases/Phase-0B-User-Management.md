# 👥 Phase 0B — User Management (Admin CRUD + Self Password Change)

## 0️⃣ Scope
- Cho **ADMIN** quản lý người dùng: tạo, xem danh sách, xem chi tiết, cập nhật profile/role/department, **activate/deactivate**, **reset password**.
- Cho **user** tự đổi mật khẩu của mình.
- Dựa trên **session-based auth + CSRF ON** (Phase-0).

---

## 1️⃣ API Contracts

### 🔹 POST /users  _(ADMIN)_
**Mô tả:** Tạo user mới với mật khẩu tạm (hoặc do admin đặt).
**Request**
```json
{
  "username": "bob",
  "email": "bob@example.com",
  "fullName": "Bob Marley",
  "role": "AGENT",
  "departmentId": 1,
  "tempPassword": "Temp@123"   // hoặc null để hệ thống generate
}
```
**Response 201**
```json
{
  "id": 7,
  "username": "bob",
  "role": "AGENT",
  "isActive": true,
  "mustChangePassword": true
}
```
**Rules**
- `username`, `email` **unique**.
- Nếu `tempPassword` null → hệ thống generate (8–12 ký tự, có số & ký tự đặc biệt).
- Set `mustChangePassword=true` cho user mới.

---

### 🔹 GET /users  _(ADMIN)_
**Query Params:** `q`(search username/email/fullName), `role`, `departmentId`, `active`, `page`, `size`, `sort`  
**Response 200**
```json
{
  "content": [
    { "id": 1, "username": "admin", "email": "ad@ex.com", "role": "ADMIN", "isActive": true }
  ],
  "page": 0, "size": 10, "total": 3
}
```

---

### 🔹 GET /users/{id}  _(ADMIN)_
**Response 200**
```json
{ "id": 7, "username": "bob", "email": "bob@example.com", "fullName": "Bob Marley", "role": "AGENT", "departmentId": 1, "isActive": true }
```

---

### 🔹 PATCH /users/{id}  _(ADMIN)_
**Mô tả:** Cập nhật profile, role, department, trạng thái (trừ mật khẩu).
**Request (ví dụ)**
```json
{ "fullName": "Bob M.", "role": "AGENT", "departmentId": 2, "isActive": true }
```
**Response 200**

**Rules**
- Không cho **deactivate** chính mình nếu là user hiện tại.
- Không tự hạ role của **ADMIN cuối cùng** (bảo vệ hệ thống).

---

### 🔹 POST /users/{id}/reset-password  _(ADMIN)_
**Mô tả:** Reset mật khẩu user về mật khẩu tạm, **mustChangePassword=true**.
**Request**
```json
{ "tempPassword": "Tmp@2025" }  // hoặc null để hệ thống generate
```
**Response 200**
```json
{ "id": 7, "mustChangePassword": true }
```

---

### 🔹 POST /users/change-password  _(SELF)_
**Mô tả:** Người dùng tự đổi mật khẩu (đang đăng nhập).
**Request**
```json
{ "currentPassword": "Alice@123", "newPassword": "Alice@456" }
```
**Response 204**
- Nếu user có `mustChangePassword=true` → set về `false` sau khi đổi thành công.

**Validation**
- Mật khẩu mới dài ≥ 8, có chữ hoa/thường/số/ký tự đặc biệt.
- `currentPassword` phải match (BCrypt).

---

## 2️⃣ Data Model chạm tới
- **USERS**: `username*`, `email*`, `password_hash`, `full_name`, `role`, `department_id?`, `is_active`, (thêm) `must_change_password BOOLEAN DEFAULT TRUE`, `created_at`, `updated_at`.
- **DEPARTMENTS** (FK), đảm bảo tồn tại id hợp lệ khi set.

> Nếu chưa có cột `must_change_password`, thêm migration (Flyway): `ALTER TABLE users ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT TRUE;`

---

## 3️⃣ Tasks & Checklist

### 🧩 Entity & Repository
- [x] Cập nhật entity `User` thêm `mustChangePassword` (boolean, default true).
- [x] `UserRepository`: search/pagination (`findAll` với `Specification` hoặc query methods).

### 📦 DTO & Validation
- [x] `CreateUserRequest`, `UpdateUserRequest`, `ResetPasswordRequest`, `ChangePasswordRequest` (record).
- [x] Validate unique `username`/`email`; password policy khi tạo/reset/đổi.
- [x] Response DTO rút gọn (không bao giờ trả `passwordHash`).

### ⚙️ Service Layer
- [x] `UserAdminService`:
  - create (hash password, set mustChangePassword)
  - get/list (filter/pagination)
  - update (profile/role/department/active) với guard
  - resetPassword (generate hoặc từ input, hash + mustChangePassword)
- [x] `UserSelfService`:
  - changePassword (verify current, policy, update + clear mustChangePassword)
- [x] Helper: random temp password generator.

### 🔒 Authorization & Guards
- [x] Tất cả `/users/**` (trừ `/users/change-password`) chỉ **ADMIN**.
- [x] Không cho deactivate chính mình.
- [x] Không hạ role **ADMIN cuối cùng**.
- [ ] CSRF áp dụng với POST/PATCH.

### 📄 Controller
- [x] `POST /users`
- [x] `GET /users`
- [x] `GET /users/{id}`
- [x] `PATCH /users/{id}`
- [x] `POST /users/{id}/reset-password`
- [x] `POST /users/change-password` (self)

### 🧪 Testing
- [x] Unit: create user (unique), reset & change password policy, guards (admin cuối cùng).
- [x] Integration: list/filter/pagination, update role/dept, self change password.

---

## 4️⃣ Definition of Done (DoD)
| Tiêu chí | Mô tả |
|---------|------|
| ✅ Admin CRUD | Tạo/xem/sửa user, activate/deactivate |
| ✅ Password flows | Reset (admin) + Self change (user), policy enforce |
| ✅ Guards | Không deactivate chính mình; bảo vệ ADMIN cuối cùng |
| ✅ Security | Chỉ ADMIN truy cập API quản trị; CSRF ON |
| ✅ Pagination | `/users` có filter/sort/page/size |
| ✅ Tests | Unit + Integration pass |

---

## 5️⃣ Test Plan (Integration)

| Case | Expect |
|------|--------|
| ADMIN tạo user mới | 201 + `mustChangePassword=true` |
| Tạo user trùng username/email | 409 |
| ADMIN reset password | 200 + `mustChangePassword=true` |
| User đổi password đúng current | 204 + `mustChangePassword=false` |
| User đổi password sai current | 400 |
| ADMIN hạ role Admin cuối cùng | 409/400 (bị chặn) |
| ADMIN deactivate chính mình | 409/400 (bị chặn) |
| List users by role=AGENT, q="bob" | 200 + filter đúng |

---

## 6️⃣ Out of Scope
- Email gửi thông báo mật khẩu.
- OAuth2/SSO.
- MFA/2FA.

---

## 7️⃣ Thứ tự thực thi cho AI Agent
1. Thêm cột `must_change_password` vào `USERS` (migration + entity).  
2. Tạo DTOs (create/update/reset/change).  
3. Implement `UserAdminService` + `UserSelfService`.  
4. Controller routes `/users/**` + guards.  
5. Security rules (ADMIN-only + CSRF).  
6. Unit & integration tests.  
