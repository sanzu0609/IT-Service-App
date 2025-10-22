# 🚀 Phase 0 — Authentication & RBAC (Session-based)  
**Version:** v1.1 — Updated for Phase 0B integration

---

## 0️⃣ Scope
- Triển khai xác thực **session-based** (không JWT).
- Cung cấp các endpoint: `/auth/login`, `/auth/logout`, `/auth/me`.
- Áp dụng **RBAC (ADMIN / AGENT / END_USER)** và **ownership rule** cho tài nguyên.
- Bật **CSRF + Security headers**.
- Seed dữ liệu: users (demo), departments, categories.
- Chuẩn bị nền cho **Phase 0B — User Management** (Admin CRUD + Self password change).

---

## 1️⃣ API Contracts

### 🔹 POST /auth/login
**Mô tả:** Đăng nhập, tạo session (cookie `JSESSIONID`).

**Request**
```json
{
  "username": "alice",
  "password": "alice123"
}
```

**Response 200**
```json
{
  "id": 1,
  "username": "alice",
  "role": "END_USER",
  "mustChangePassword": false
}
```
> Cookie: `JSESSIONID` (HttpOnly, SameSite=Lax, Secure=true ở môi trường HTTPS)

**Response 401**
```json
{ "code": "AUTH_BAD_CREDENTIALS", "message": "Invalid username or password" }
```

---

### 🔹 POST /auth/logout
**Mô tả:** Hủy session hiện tại.  
**Response:** `204 No Content`

---

### 🔹 GET /auth/me
**Mô tả:** Lấy thông tin người dùng hiện tại từ session.  
**Response 200**
```json
{ "id": 1, "username": "alice", "role": "END_USER", "mustChangePassword": false }
```
**Response 401** nếu chưa đăng nhập.

---

### 🔹 GET /csrf
**Mô tả:** Trả về CSRF token để client gửi trong header `X-CSRF-TOKEN` (nếu bật `CookieCsrfTokenRepository`).

---

## 2️⃣ Data Model liên quan
- **USERS**
  - `username`, `email`, `password_hash`, `role`, `is_active`,  
  - `must_change_password BOOLEAN DEFAULT TRUE` *(bổ sung để hỗ trợ Phase 0B)*  
  - `created_at`, `updated_at`
- **DEPARTMENTS**, **CATEGORIES** — seed dữ liệu mẫu.

---

## 3️⃣ Tasks & Checklist

### 🧩 Entity & Repository
- [ ] Entity `User`:
  - field `mustChangePassword` (boolean, default true).
  - `isActive` (boolean, default true).
  - `role` enum (`END_USER`, `AGENT`, `ADMIN`).
- [ ] Repository `UserRepository`:
  - `findByUsername`, `existsByUsername`, `existsByEmail`.

### 🔒 Security & Config
- [ ] `SecurityConfig`:
  - Session-based (STATELESS = ❌)
  - CSRF ON (`CookieCsrfTokenRepository`)
  - Permit `/auth/**`, `/csrf`, `/swagger-ui/**`
  - Custom `AuthenticationEntryPoint` (401 JSON)
  - Custom `AccessDeniedHandler` (403 JSON)
- [ ] `PasswordEncoder` = BCrypt.

### 🧠 Controller & Service
- [ ] `AuthController`: `/auth/login`, `/auth/logout`, `/auth/me`
- [ ] `AuthService`: xác thực, tạo session, trả thông tin user.
- [ ] `UserDetailsServiceImpl`: nạp user từ DB (Spring Security).

### 🧱 Seed Data
- [ ] 3 user mẫu:
  - `admin / Admin@123` (ADMIN)
  - `agent / Agent@123` (AGENT)
  - `alice / Alice@123` (END_USER)
- [ ] Departments: IT, HR.
- [ ] Categories: Hardware, Software, Access.
- [ ] Gán `mustChangePassword=false` cho user seed.

### 🧰 CSRF & Headers
- [ ] `CookieCsrfTokenRepository` bật, client gửi `X-CSRF-TOKEN`.
- [ ] Header bảo mật:
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`

---

## 4️⃣ Definition of Done (DoD)

| Tiêu chí | Mô tả |
|-----------|-------|
| ✅ Auth hoạt động | `/auth/login`, `/auth/logout`, `/auth/me` chạy OK (cookie persist) |
| ✅ Session bảo mật | HttpOnly, SameSite=Lax, Secure(true) |
| ✅ CSRF bật | POST/PATCH/DELETE (trừ `/auth/*`) cần `X-CSRF-TOKEN` |
| ✅ RBAC | Vai trò đúng, unauthorized trả 403 |
| ✅ User state | User inactive không thể đăng nhập |
| ✅ Integration | Chuẩn bị sẵn cho Phase 0B (User CRUD) |
| ✅ Seed dữ liệu | Users, Departments, Categories sẵn sàng |

---

## 5️⃣ Test Plan

### 🔸 Unit Tests
| Mục tiêu | Class |
|-----------|--------|
| Password encode/verify | `AuthServiceTest` |
| Load user details | `UserDetailsServiceImplTest` |
| EntryPoint & AccessDeniedHandler JSON | `SecurityHandlerTest` |

### 🔸 Integration (MockMvc + H2)
| Case | Expect |
|------|---------|
| Login đúng | 200 + cookie |
| Login sai | 401 |
| `/auth/me` sau login | 200 |
| `/auth/me` chưa login | 401 |
| Logout rồi gọi `/auth/me` | 401 |
| POST `/tickets` thiếu CSRF | 403 |
| POST `/tickets` có CSRF | 201 |
| Login với user inactive | 403 |

---

## 6️⃣ Integration với Phase 0B — User Management

### 🔗 Liên kết
- Phase 0B sẽ dùng lại `User` entity và `UserRepository`.
- API `/users/**` (trừ `/users/change-password`) chỉ ADMIN truy cập.
- Khi admin tạo user mới:
  - Set `mustChangePassword=true`
  - User phải đổi mật khẩu ở lần đăng nhập đầu tiên (sử dụng `/users/change-password`).

### 🔐 Security Rule Bổ sung
- `/users/change-password` → cho phép tất cả user login.
- `/users/**` khác → chỉ `ADMIN`.

---

## 7️⃣ Out of Scope
- JWT / Refresh token.
- Remember-me.
- OAuth2 / SSO.

---

## 8️⃣ Thứ tự thực thi cho AI Agent
1. Tạo `User` entity (+ role, isActive, mustChangePassword).  
2. Repository + seed dữ liệu mẫu.  
3. Cấu hình `SecurityConfig` (session, csrf, handlers).  
4. Implement `AuthService` + `UserDetailsServiceImpl`.  
5. Controller `/auth/login`, `/auth/logout`, `/auth/me`.  
6. Test integration qua Postman (cookie persist).  
7. Chuẩn bị cho Phase 0B (ADMIN CRUD + password change).  

---
