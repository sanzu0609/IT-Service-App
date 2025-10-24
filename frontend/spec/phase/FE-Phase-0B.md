# 👑 FE Phase 0B — User Management (Admin)
**Version:** v1.0 — Angular + Tailwind + Zard UI

Mục tiêu: Hoàn thiện màn hình quản trị **User** cho **ADMIN**, bám backend session-based. Bao gồm **List, Create/Update, Reset Password, Self Change Password** (dành cho người dùng hiện tại).

---

## 0) Deliverables
- Route `/admin/users` (ADMIN-only) chạy được.
- Trang **Users List** (table + filter role/active + pagination).
- Trang **User Form** (create/update).
- **Reset Password** (dialog confirm).
- **Self Change Password** (sử dụng lại từ Phase 0).
- Role-based UI (ẩn route/nút với non-admin).
- Tài liệu README ngắn cách test thủ công.

---

## 1) API Contracts (backend đã có)
- `GET /users?role&active&page&size&sort` → page `User`
- `GET /users/{id}` → `User`
- `POST /users` `{ username, email, role, departmentId?, active }` → 201
- `PATCH /users/{id}` `{ email?, role?, departmentId?, active? }` → 200
- `POST /users/{id}/reset-password` → 200 `{ mustChangePassword: true }`
- (Self) `POST /users/change-password` → 200

> Lưu ý: Tất cả request cần `withCredentials: true`. POST/PATCH cần CSRF header (`X-XSRF-TOKEN`).

---

## 2) Models
Sử dụng lại `User`/`ApiResponse<T>` trong `frontend/docs/FE-Models.md`.

```ts
export type Role = 'ADMIN' | 'AGENT' | 'END_USER';
export interface User {
  id: number;
  username: string;
  email: string;
  fullName?: string;
  role: Role;
  active: boolean;
  departmentId?: number;
  mustChangePassword: boolean;
  createdAt: string;
}
export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
```

---

## 3) Services
### 3.1 `UsersService`
```ts
// src/app/core/services/users.service.ts
list(params: { role?: Role; active?: boolean; page?: number; size?: number; sort?: string; }) { ... }
get(id: number) { ... }
create(payload: { username: string; email: string; role: Role; departmentId?: number; active?: boolean; }) { ... }
update(id: number, payload: Partial<{ email: string; role: Role; departmentId?: number; active: boolean; }>) { ... }
resetPassword(id: number) { ... }
changePasswordSelf(payload: { currentPassword: string; newPassword: string; }) { ... }
```

> Tất cả methods: `{ withCredentials: true }`.

---

## 4) Routing
```
/admin/users
  ├─ list     (default)
  └─ form/:id (edit)  | form/new (create)
```
- Route module riêng: `features/users/routes.ts`
- Guard: `authGuard` + **admin-only guard** (check `me.role==='ADMIN'`)

---

## 5) Pages & UI (Zard + Tailwind)
### 5.1 Users List
- Thanh filter: `role`, `active`, search (optional username/email)
- Bảng: `username`, `email`, `role`, `active`, `department`, `createdAt`, actions
- Actions: **Edit**, **Reset Password** (confirm dialog), **Create** (button)

**Giao diện gợi ý:**
```html
<div class="flex items-end gap-2 mb-3">
  <select class="border rounded p-2" [(ngModel)]="filters.role">
    <option value="">All roles</option>
    <option *ngFor="let r of roles" [value]="r">{{r}}</option>
  </select>
  <select class="border rounded p-2" [(ngModel)]="filters.active">
    <option value="">All</option>
    <option [value]="true">Active</option>
    <option [value]="false">Inactive</option>
  </select>
  <button class="inline-flex items-center rounded bg-emerald-600 px-3 py-2 text-white" (click)="reload()">Filter</button>
  <div class="flex-1"></div>
  <a class="rounded border px-3 py-2" [routerLink]="['/admin/users/form/new']">+ Create</a>
</div>
<table class="w-full border rounded">
  <thead class="bg-gray-50">
    <tr>
      <th class="p-2 text-left">Username</th>
      <th class="p-2 text-left">Email</th>
      <th class="p-2 text-left">Role</th>
      <th class="p-2 text-left">Active</th>
      <th class="p-2 text-left">Dept</th>
      <th class="p-2 text-right">Actions</th>
    </tr>
  </thead>
  <tbody>
    <tr *ngFor="let u of page?.content" class="border-t">
      <td class="p-2">{{u.username}}</td>
      <td class="p-2">{{u.email}}</td>
      <td class="p-2">{{u.role}}</td>
      <td class="p-2">{{u.active ? 'Yes':'No'}}</td>
      <td class="p-2">{{u.departmentId ?? '-'}}</td>
      <td class="p-2 text-right">
        <a class="text-blue-600 hover:underline mr-3" [routerLink]="['/admin/users/form', u.id]">Edit</a>
        <button class="text-rose-600" (click)="openReset(u)">Reset Password</button>
      </td>
    </tr>
  </tbody>
</table>
```

### 5.2 User Form (Create/Update)
- Trường: `username` (create-only, disable ở edit), `email`, `role`, `departmentId?`, `active`
- Validate: email hợp lệ, role thuộc enum, username không rỗng (create)
- Actions: Save, Cancel

**Giao diện gợi ý:**
```html
<form (ngSubmit)="submit()" [formGroup]="form" class="space-y-3 max-w-lg">
  <div class="grid grid-cols-2 gap-3">
    <input class="border rounded p-2" placeholder="Username" formControlName="username" [readonly]="isEdit">
    <input class="border rounded p-2" placeholder="Email" formControlName="email">
    <select class="border rounded p-2" formControlName="role">
      <option *ngFor="let r of roles" [value]="r">{{r}}</option>
    </select>
    <input class="border rounded p-2" placeholder="Department ID" formControlName="departmentId">
    <label class="flex items-center gap-2">
      <input type="checkbox" formControlName="active"> Active
    </label>
  </div>
  <div class="flex gap-2">
    <button class="rounded bg-emerald-600 text-white px-4 py-2">Save</button>
    <a class="rounded border px-4 py-2" [routerLink]="['/admin/users']">Cancel</a>
  </div>
</form>
```

### 5.3 Reset Password (Dialog)
- Hỏi xác nhận: “Reset password cho user **X**? User sẽ phải **đổi mật khẩu lần đầu đăng nhập**.”
- Gọi API: `POST /users/{id}/reset-password`
- Toast thành công + reload list

---

## 6) Guards & Role-based UI
- **AdminGuard**: nếu `me.role !== 'ADMIN'` → redirect `/tickets` + toast “No permission”.
- Ẩn/disable nút **Users** trên header nếu không phải admin.

---

## 7) Error/Loading UX
- Loading spinner khi gọi list/get.
- Hiển thị lỗi 401/403/400/409 (email/username trùng).
- Toast thành công/thất bại.

---

## 8) Acceptance Criteria
- [ ] Non-admin truy cập `/admin/users` → bị chặn (guard) → redirect `/tickets`.
- [ ] List hiển thị dữ liệu + filter role/active + pagination.
- [ ] Create user → 201; hiển thị `mustChangePassword=true` (nếu backend trả); quay lại list.
- [ ] Update user → 200; thay đổi role/active/department.
- [ ] Reset password → 200; toast “User must change password on next login”.
- [ ] Self change password (Phase 0) còn hoạt động bình thường.

---

## 9) Tasks (chia nhỏ Issues)

- **FE-0B.1** Routing `/admin/users` + AdminGuard
- **FE-0B.2** UsersService (list/get/create/update/reset/selfChangePassword)
- **FE-0B.3** Users List page (table + filter + pager + actions)
- **FE-0B.4** User Form page (create/update, validation)
- **FE-0B.5** Reset Password dialog + toast
- **FE-0B.6** Role-based UI (hide Users menu nếu non-admin)
- **FE-0B.7** Manual test checklist + README snippet

---

## 10) README snippet (copy vào FE README)
```
### Test nhanh User Management (Admin)
1) Login bằng ADMIN.
2) Vào /admin/users → thấy danh sách user.
3) Tạo user mới → đăng xuất → login bằng user mới → hệ thống yêu cầu đổi mật khẩu.
4) Quay lại Admin, thử Edit (đổi role/active) và Reset Password.
```
