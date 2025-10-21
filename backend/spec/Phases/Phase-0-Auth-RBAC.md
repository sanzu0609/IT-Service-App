# 🚀 Phase 0 — Authentication & RBAC (Session-based)

## 0️⃣ Scope
- Triển khai xác thực **session-based** (không JWT).
- Cung cấp các endpoint: `/auth/login`, `/auth/logout`, `/auth/me`.
- Áp dụng **RBAC (ADMIN/AGENT/END_USER)** và **ownership rule** cho tài nguyên.
- Bật **CSRF + Security headers**.
- Seed users, departments, categories.

---

## 1️⃣ API Contracts

### 🔹 POST /auth/login
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
  "role": "END_USER"
}
```
> Cookie: `JSESSIONID` (HttpOnly, SameSite=Lax, Secure=true nếu HTTPS)

**Response 401**
```json
{ "code": "AUTH_BAD_CREDENTIALS", "message": "Invalid username or password" }
```

---

### 🔹 POST /auth/logout
- Invalidate session.
- **Response 204 No Content**.

---

### 🔹 GET /auth/me
- Trả thông tin user hiện tại từ session.
**Response 200**
```json
{ "id": 1, "username": "alice", "role": "END_USER" }
```
**Response 401** nếu chưa đăng nhập.

---

### 🔹 GET /csrf
- Trả về CSRF token để client gửi trong header `X-CSRF-TOKEN`.

---

## 2️⃣ Data Model liên quan
- **USERS**: role, is_active, timestamps.  
- **DEPARTMENTS**, **CATEGORIES**: seed data.

---

## 3️⃣ Tasks & Checklist

### 🧩 Entity & Repository
- [x] Hoàn thiện `User` entity (role enum, active=true mặc định, timestamps LocalDateTime).
- [x] Tạo `UserRepository` (`findByUsername`, `existsByUsername`).

### 🔒 Security & Config
- [x] Cấu hình `SecurityConfig`:
  - Session-based (STATELESS = ❌).
  - CSRF ON (CookieCsrfTokenRepository).
  - Permit `/auth/**`, `/csrf`, `/swagger-ui/**`.
  - `AuthenticationEntryPoint` 401 JSON.
  - `AccessDeniedHandler` 403 JSON.
- [x] Khai báo `PasswordEncoder` = BCrypt.

### 🧠 Controller & Service
- [x] `AuthController`: `/auth/login`, `/auth/logout`, `/auth/me`.
- [x] `AuthService`: login (authenticate), logout (invalidate session).
- [x] `UserDetailsServiceImpl` (loadUserByUsername).

### 🧱 Seed Data
- [x] 3 users (`admin`, `agent`, `alice`), mật khẩu BCrypt.
- [x] Departments: IT, HR.
- [x] Categories: Hardware, Software, Access.

### 🧰 CSRF & Headers
- [x] `CookieCsrfTokenRepository` bật; client gửi header `X-CSRF-TOKEN`.
- [x] Header bảo mật: `X-Frame-Options:DENY`, `X-Content-Type-Options:nosniff`.

---

## 4️⃣ Definition of Done (DoD)

| Tiêu chí | Mô tả |
|-----------|-------|
| ✅ Auth hoạt động | `/auth/login`, `/auth/logout`, `/auth/me` chạy qua Postman (cookie persist) |
| ✅ Session bảo mật | HttpOnly, SameSite=Lax, Secure(true) |
| ✅ CSRF bật | POST/PATCH/DELETE (trừ /auth/*) cần X-CSRF-TOKEN |
| ✅ Role & Ownership | ADMIN bỏ qua, AGENT/END_USER bị giới hạn đúng quyền |
| ✅ Seed dữ liệu | Users + Departments + Categories tạo thành công |
| ✅ README cập nhật | Hướng dẫn login/logout, CSRF, cookie |

---

## 5️⃣ Test Plan

### 🔸 Unit Test
| Mục tiêu | Class |
|-----------|--------|
| Encode/verify password | `AuthServiceTest` |
| Load user details | `UserDetailsServiceImplTest` |
| EntryPoint & AccessDeniedHandler trả JSON | `SecurityHandlerTest` |

### 🔸 Integration Test (MockMvc + H2)
| Trường hợp | Kết quả |
|-------------|----------|
| Login đúng | 200 + cookie |
| Login sai | 401 |
| GET /auth/me khi login | 200 |
| GET /auth/me chưa login | 401 |
| Logout → me | 401 |
| POST /tickets thiếu CSRF | 403 |
| POST /tickets có CSRF | 201 |

---

## 6️⃣ Out of Scope
- JWT hoặc Refresh token.
- Remember-me, 2FA.
- OAuth2 login.

---

## 7️⃣ Thứ tự thực thi cho AI Agent
1. Tạo `User` entity + enum `Role`.
2. Tạo `UserRepository`.
3. Cấu hình `SecurityConfig` (session, csrf, handlers).
4. Viết `UserDetailsServiceImpl` + `AuthService`.
5. Viết `AuthController` (`/auth/login`, `/auth/logout`, `/auth/me`).
6. Seed dữ liệu mẫu.
7. Test qua Postman & MockMvc.

---
