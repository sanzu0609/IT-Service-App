# 🧭 ITSM Mini Clone — Frontend Overview
**Version:** v1.0 — Angular + Tailwind + Zard UI

---

## 🎯 Mục tiêu

Frontend hiển thị và thao tác toàn bộ quy trình **ITSM Mini Clone** (Authentication → Ticket → SLA) dựa trên backend Spring Boot session-based.  
Mục tiêu chính:

- Nắm vững **Angular + TailwindCSS** với cấu trúc module hoá.
- Thực hiện đúng luồng bảo mật: **session cookie + CSRF token**.
- Dùng **Zard UI** (port shadcn) để tăng tốc UI/UX.
- Hoàn thiện CRUD Tickets, Comments, Workflow, SLA visualization.

---

## 🧰 Tech Stack

| Layer | Technology | Mục đích |
|--------|-------------|----------|
| **Framework** | Angular 20.3.6 | SPA + Routing + HttpClient |
| **UI Framework** | Zard UI + TailwindCSS v4 | Giao diện component-based + utility CSS |
| **HTTP** | Angular HttpClient | withCredentials + Interceptors |
| **State Mgmt** | Signals / RxJS (built-in) | Không dùng lib phức tạp |
| **Build Tool** | Angular CLI | DevServer + Build |
| **API Backend** | Spring Boot 3.x (session-based) | Auth + CRUD + SLA |
| **Container (optional)** | Nginx (serve dist) | Dùng trong Docker Compose (Phase 3) |

---

## 🧩 Cấu trúc thư mục

```
frontend/
  src/
    app/
      core/
        interceptors/
          auth.interceptor.ts
          csrf.interceptor.ts
        guards/
          auth.guard.ts
          force-change-password.guard.ts
        services/
          auth.service.ts
          users.service.ts
          tickets.service.ts
        models/
          user.ts
          ticket.ts
          comment.ts
          api.ts
        core.module.ts
      shared/
        ui/        # Zard UI wrappers
        pipes/     # date-utc, relative-time
        components/# toast, modal, button
        shared.module.ts
      layout/
        main-layout/
        auth-layout/
      features/
        auth/
          login/
          change-password/
        users/
          list/
          form/
        tickets/
          list/
          detail/
          comment-form/
          status-change/
          create/
      app.routes.ts
      app.component.ts
      app.config.ts
    assets/
    environments/
      environment.ts
      environment.prod.ts
  package.json
  tailwind.config.ts
  .postcssrc.json
```

---

## ⚙️ Kiến trúc & Flow

```
AuthInterceptor
    ↓ (withCredentials:true)
Angular HttpClient  ──►  Backend Spring Security
                          ├─ Session Cookie (JSESSIONID)
                          └─ CSRF Cookie (XSRF-TOKEN)
```

**Luồng chính:**
1. FE gửi `/auth/login` → nhận cookie session + CSRF token.
2. FE giữ cookie tự động, Angular gắn header `X-XSRF-TOKEN`.
3. FE gọi `/auth/me` để lấy thông tin user (role, mustChangePassword).
4. FE điều hướng layout/guard theo role.
5. Các thao tác CRUD ticket đều thực hiện qua API backend (session-auth).

---

## 🔐 Security Notes
- `HttpClient` **phải bật** `withCredentials: true` ở mọi request.
- `HttpClientXsrfModule` bật mặc định → tự đính `X-XSRF-TOKEN`.
- CSRF token lấy từ cookie `XSRF-TOKEN` do Spring Boot gửi.
- Guard `auth.guard.ts` kiểm tra login.
- Guard `force-change-password.guard.ts` bắt buộc đổi mật khẩu nếu flag `mustChangePassword=true`.

---

## 🧱 UI Framework Integration

**TailwindCSS v4**
- Cấu hình bằng `.postcssrc.json` + `@import "tailwindcss";` trong `src/styles.css`.
- Dùng utilities cho layout, spacing, màu sắc.

**Zard UI**
- Dùng để dựng nhanh Button, Input, Table, Dialog, Toast.
- Có thể mix Tailwind utilities để tinh chỉnh layout.
- Tạo `UiModule` trong `shared/ui/ui.module.ts` để gom export tất cả Zard component dùng chung.

---

## 📋 Phân chia Phase

| Phase | Nội dung | Mục tiêu |
|--------|-----------|----------|
| **FE-0** | Setup Angular + Tailwind + Auth Skeleton | Login, Change Password, Guard |
| **FE-0B** | User Management (Admin) | CRUD user, Reset Password |
| **FE-1** | Tickets | List, Detail, Comments, Status workflow |
| **FE-2** | SLA UI | Deadline + Badge OK/NEAR/BREACHED |
| **FE-3** | Polish & DevOps | Docker build, Docs, Postman link |

---

## 🧪 Testing Checklist

| Module | Test thủ công | Kết quả mong đợi |
|---------|----------------|-----------------|
| Auth | Login + Logout + CSRF check | 200 + Cookie set |
| User | Admin list/create/update/reset | Role guard hoạt động |
| Ticket | List/filter/detail/comment/status | Workflow đúng guard |
| SLA | Hiển thị badge + deadline | Đúng theo backend |
| Global | Chưa login redirect `/login` | AuthGuard hoạt động |

---

## 🚀 Deliverables
- SPA Angular chạy ở `http://localhost:4200`
- Kết nối backend qua proxy hoặc direct (port 8080)
- UI hoàn chỉnh: Auth, User, Ticket, SLA
- Dockerfile (optional): build FE và serve bằng Nginx
- README hướng dẫn FE (quickstart, scripts, env)

---

## 🔗 Integration với Backend
- BE chạy port 8080 (Spring Boot)
- FE chạy port 4200
- Proxy file `proxy.conf.json`:
  ```json
  {
    "/api": {
      "target": "http://localhost:8080",
      "secure": false,
      "changeOrigin": true,
      "logLevel": "info"
    }
  }
  ```
  → Khi gọi `this.http.get('/api/auth/me')`, Angular sẽ proxy sang backend và giữ cookie session.

---

## 🧠 Definition of Done
- [x] Auth flow hoạt động (login/logout/me/change-password)
- [x] User CRUD hoạt động (Admin-only)
- [x] Ticket CRUD + Comment + Workflow hoạt động
- [x] SLA hiển thị đúng theo flag
- [x] Role-based UI + Guard
- [x] Tailwind & Zard UI đồng bộ theme
- [x] Docker build FE + README

---

## 📘 Notes
- FE dùng **Zard UI** (Angular port của shadcn/ui) kết hợp Tailwind utilities.
- Không dùng state management phức tạp — chỉ cần service + signals.
- Thiết kế hướng “AI Agent friendly”: có thể auto-generate code theo từng phase.

---
