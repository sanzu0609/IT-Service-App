# 🚀 FE Phase 0 — Setup & Auth Skeleton (Angular 20.3.6 + Tailwind v4 + Zard UI)
**Version:** v1.0

Mục tiêu phase: chạy được app FE, hoàn thành **auth flow session-based** (login → me → logout → change-password), có **routing/guard/interceptors** và sườn layout dùng **Zard UI + Tailwind**.

---

## 0) Deliverables
- App Angular chạy tại `http://localhost:4200` (dev).
- Tailwind v4 hoạt động; Zard UI import dùng được.
- Interceptors (auth, csrf) & Guards (auth, force-change-password).
- Trang: **Login**, **Change Password**, **Main Layout + Header**.
- Gọi được API backend: `/auth/login`, `/auth/me`, `/auth/logout`, `/users/change-password` với **cookie + CSRF**.

---

## 1) Khởi tạo & cấu hình

### 1.1 Init Angular + Tailwind v4
```bash
ng new itsm-fe --routing --style=css
cd itsm-fe
npm i -D tailwindcss @tailwindcss/postcss postcss
echo '{ "plugins": { "@tailwindcss/postcss": {} } }' > .postcssrc.json
# src/styles.css
@import "tailwindcss";
```

> Lưu ý Tailwind v4: dùng CSS, không dùng SCSS để tránh xung đột.

### 1.2 Cài Zard UI
Cài package theo docs Zard UI (Angular). Tạo `src/app/shared/ui/ui.module.ts` để gom import các module Button/Input/Dialog/Table/Toast…

```ts
// src/app/shared/ui/ui.module.ts
import { NgModule } from '@angular/core';
// import { ZButtonModule, ZInputModule, ZDialogModule, ZTableModule, ZToastModule } from 'zard-angular';
@NgModule({
  exports: [
    // ZButtonModule, ZInputModule, ZDialogModule, ZTableModule, ZToastModule
  ],
})
export class UiModule {}
```

### 1.3 Proxy dev (khuyến nghị)
```json
// frontend/proxy.conf.json
{
  "/api": {
    "target": "http://localhost:8080",
    "secure": false,
    "changeOrigin": true,
    "logLevel": "info"
  }
}
```
```json
// package.json
"start": "ng serve --proxy-config proxy.conf.json"
```
Khi gọi FE: `this.http.get('/api/auth/me', { withCredentials: true })`.

---

## 2) Cấu trúc thư mục (tối thiểu)
```
src/app/
  core/
    interceptors/{auth.interceptor.ts, csrf.interceptor.ts}
    guards/{auth.guard.ts, force-change-password.guard.ts}
    services/{auth.service.ts, users.service.ts}
    models/{user.ts, api.ts}
  layout/main-layout/
  features/
    auth/{login, change-password}/
  app.routes.ts
  app.component.ts
  app.config.ts
src/styles.css
```

---

## 3) Models & API contract (tối thiểu)

```ts
// src/app/core/models/user.ts
export type Role = 'ADMIN' | 'AGENT' | 'END_USER';
export interface User {
  id: number;
  username: string;
  email: string;
  role: Role;
  active: boolean;
  mustChangePassword: boolean;
  departmentId?: number;
  createdAt: string; // ISO
}
export interface MeResponse extends User {}
```

```ts
// src/app/core/models/api.ts
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  message?: string;
}
```

**Endpoints sử dụng ở Phase 0:**
- `POST /auth/login` `{ username, password }` → 200, **Set-Cookie: JSESSIONID**, cookie `XSRF-TOKEN`
- `POST /auth/logout`
- `GET /auth/me` → `ApiResponse<MeResponse>`
- `POST /users/change-password` `{ currentPassword, newPassword }`

---

## 4) Interceptors

### 4.1 AuthInterceptor (bắt buộc)
- Tự động set `withCredentials: true` cho **mọi** request.
- Bắt **401** → điều hướng `/login` (trừ khi đang ở `/login`).

```ts
// src/app/core/interceptors/auth.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const withCred = req.clone({ withCredentials: true });
  return next(withCred).pipe(
    // pseudo: catchError(err => { if (err.status===401) router.navigate(['/login']); throw err; })
  );
};
```

### 4.2 CsrfInterceptor (optional nhưng nên có)
- Đảm bảo **có cookie `XSRF-TOKEN`** trước khi gửi POST/PATCH/DELETE đầu tiên.
- Cách đơn giản: nếu method là `POST|PUT|PATCH|DELETE` và **chưa có cookie XSRF**, gọi `GET /api/csrf` để server phát cookie.

```ts
// src/app/core/interceptors/csrf.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
export const csrfInterceptor: HttpInterceptorFn = (req, next) => {
  // pseudo: kiểm tra method; nếu cần, gọi GET /api/csrf trước rồi tiếp tục
  return next(req);
};
```

> Angular có `HttpClientXsrfModule` tự động đọc cookie `XSRF-TOKEN` và gắn header `X-XSRF-TOKEN`. Bạn chỉ cần chắc chắn cookie tồn tại.

---

## 5) Guards

### 5.1 AuthGuard
- Nếu **chưa có /auth/me** hợp lệ → redirect `/login`.
- Có thể cache `me` trong `AuthService` để tránh gọi lặp.

```ts
// src/app/core/guards/auth.guard.ts
import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const me = await auth.ensureMe(); // gọi /auth/me nếu chưa có
  if (!me) { router.navigate(['/login']); return false; }
  return true;
};
```

### 5.2 ForceChangePasswordGuard (optional)
- Nếu `mustChangePassword === true` → chỉ cho phép vào `/change-password` + `/auth/*`.

---

## 6) Services

### 6.1 AuthService
```ts
// src/app/core/services/auth.service.ts
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ApiResponse } from '../models/api';
import { MeResponse } from '../models/user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private meCache: MeResponse | null = null;
  constructor(private http: HttpClient) {}

  login(username: string, password: string) {
    return this.http.post<ApiResponse<MeResponse>>('/api/auth/login', { username, password }, { withCredentials: true });
  }
  logout() {
    return this.http.post('/api/auth/logout', {}, { withCredentials: true });
  }
  me() {
    return this.http.get<ApiResponse<MeResponse>>('/api/auth/me', { withCredentials: true });
  }
  async ensureMe(): Promise<MeResponse | null> {
    if (this.meCache) return this.meCache;
    try {
      const res = await this.me().toPromise();
      this.meCache = res?.data ?? null;
      return this.meCache;
    } catch { return null; }
  }
  clearCache() { this.meCache = null; }
}
```

### 6.2 UsersService (self change password trong Phase 0)
```ts
// src/app/core/services/users.service.ts
changePassword(payload: { currentPassword: string; newPassword: string; }) {
  return this.http.post('/api/users/change-password', payload, { withCredentials: true });
}
```

---

## 7) Routing & Layout

```ts
// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent) },
  { path: 'change-password', loadComponent: () => import('./features/auth/change-password/change-password.component').then(m => m.ChangePasswordComponent), canActivate: [authGuard] },
  { path: '', loadComponent: () => import('./layout/main-layout/main-layout.component').then(m => m.MainLayoutComponent), canActivate: [authGuard],
    children: [
      { path: 'tickets', loadChildren: () => import('./features/tickets/routes').then(m => m.TICKETS_ROUTES) }, // placeholder phase sau
      { path: 'admin/users', loadChildren: () => import('./features/users/routes').then(m => m.USERS_ROUTES) },   // placeholder phase sau
      { path: '', pathMatch: 'full', redirectTo: 'tickets' }
    ]
  },
  { path: '**', redirectTo: '' }
];
```

**MainLayout (sườn)**
```html
<!-- src/app/layout/main-layout/main-layout.component.html -->
<header class="border-b bg-white">
  <div class="container mx-auto flex items-center justify-between p-3">
    <div class="font-semibold">ITSM</div>
    <nav class="flex items-center gap-4 text-sm">
      <a routerLink="/tickets" class="hover:underline">Tickets</a>
      <a routerLink="/admin/users" class="hover:underline">Users</a>
      <button class="text-red-600" (click)="logout()">Logout</button>
    </nav>
  </div>
</header>
<main class="container mx-auto p-4">
  <router-outlet></router-outlet>
</main>
```

---

## 8) Pages (Phase 0)

### 8.1 LoginComponent (template ý tưởng)
```html
<div class="max-w-sm mx-auto mt-16 space-y-4">
  <h1 class="text-xl font-semibold">Đăng nhập</h1>
  <form (ngSubmit)="submit()" [formGroup]="form" class="space-y-3">
    <input class="w-full rounded border p-2" placeholder="Username" formControlName="username">
    <input class="w-full rounded border p-2" type="password" placeholder="Password" formControlName="password">
    <button class="w-full inline-flex items-center justify-center rounded bg-emerald-600 px-4 py-2 text-white">Login</button>
  </form>
  <div *ngIf="error" class="text-sm text-red-600">Sai tài khoản hoặc mật khẩu.</div>
</div>
```

### 8.2 ChangePasswordComponent (template ý tưởng)
```html
<div class="max-w-md mx-auto mt-12 space-y-4">
  <h1 class="text-xl font-semibold">Đổi mật khẩu</h1>
  <form (ngSubmit)="submit()" [formGroup]="form" class="space-y-3">
    <input class="w-full border rounded p-2" type="password" placeholder="Mật khẩu hiện tại" formControlName="currentPassword">
    <input class="w-full border rounded p-2" type="password" placeholder="Mật khẩu mới" formControlName="newPassword">
    <input class="w-full border rounded p-2" type="password" placeholder="Xác nhận mật khẩu mới" formControlName="confirm">
    <button class="w-full rounded bg-emerald-600 text-white px-4 py-2">Cập nhật</button>
  </form>
</div>
```

---

## 9) Acceptance Criteria (Phase 0)

- [ ] `POST /auth/login` → 200, có cookie `JSESSIONID`; gọi `GET /auth/me` trả user.
- [ ] `withCredentials:true` bật cho **mọi** request; thiếu → `/auth/me` trả 401.
- [ ] POST thiếu CSRF → 403; có CSRF (cookie + header) → 2xx.
- [ ] Logout → `POST /auth/logout`; gọi lại `/auth/me` → 401.
- [ ] `POST /users/change-password` thành công; nếu có `mustChangePassword`, guard ép đến trang này.
- [ ] UI dùng Tailwind/Zard, layout tối thiểu có Header/Logout.

---

## 10) Tasks (chia nhỏ Issues)

- **FE-0.1** Init Angular + Tailwind v4 + Zard UI + Proxy dev
- **FE-0.2** Tạo `AuthService`, `UsersService`, models `User`, `ApiResponse`
- **FE-0.3** Tạo `auth.interceptor.ts` (withCredentials + 401 handler)
- **FE-0.4** (opt) `csrf.interceptor.ts` đảm bảo cookie XSRF
- **FE-0.5** Guards: `auth.guard.ts`, (opt) `force-change-password.guard.ts`
- **FE-0.6** Pages: `login`, `change-password`
- **FE-0.7** Layout: `main-layout` (header + logout), wiring routes
- **FE-0.8** Manual test checklist (Auth + CSRF + Guard)

---

## 11) Ghi chú tích hợp Backend
- Nếu backend mount URL không nằm dưới `/api`, chỉnh lại proxy hoặc base URL trong service.
- Nên mở sẵn endpoint `GET /csrf` để FE dễ “khởi động” cookie XSRF lần đầu.
- CORS: nếu không dùng proxy, bật `allowCredentials` và origin chính xác trên BE.

---
