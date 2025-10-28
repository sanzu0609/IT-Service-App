# 🏢 FE Phase — Department Management (Admin)
**Version:** v1.0 — Angular 20.3.6 • Tailwind v4 • Zard UI • Session-based + CSRF

Mục tiêu: Bổ sung module **Departments** cho ADMIN: **List + Create/Update + Deactivate**, integrate với backend mới (trả `DepartmentResponse`, `DepartmentMinimalResponse`).

---

## 0) Deliverables
- Route `/admin/departments` (ADMIN-only).
- Trang **List** (filter q/active + pagination + actions).
- Trang **Form** (create/update).
- Action **Deactivate/Activate** (toggle `active`).
- Service gọi API với `withCredentials:true` + CSRF.
- README snippet + checklist test thủ công.

---

## 1) API Contracts (phía backend)
- `GET   /departments?q&active&page&size&sort` → `Page<DepartmentResponse>`
- `GET   /departments/{id}` → `DepartmentResponse`
- `POST  /departments` → 201 `DepartmentResponse` (create)
- `PATCH /departments/{id}` → 200 `DepartmentResponse` (update/deactivate)
- `GET   /departments/minimal?active=true` → `DepartmentMinimalResponse[]`

**Models** (tham chiếu):
```ts
export interface DepartmentResponse {
  id: number; code: string; name: string;
  description?: string; active: boolean;
  createdAt: string; updatedAt: string;
}
export interface DepartmentMinimalResponse {
  id: number; code: string; name: string;
}
export interface Page<T> {
  content: T[]; totalElements: number; totalPages: number; size: number; number: number;
}
```

---

## 2) Cấu trúc thư mục (gợi ý)
```
src/app/features/departments/
  list/department-list.component.ts|html|ts
  form/department-form.component.ts|html|ts
  routes.ts
src/app/core/services/departments.service.ts
src/app/core/guards/admin.guard.ts  (đã có từ Phase 0B)
```

**Routing**
```ts
// src/app/features/departments/routes.ts
export const DEPT_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./list/department-list.component').then(m => m.DepartmentListComponent) },
  { path: 'form/new', loadComponent: () => import('./form/department-form.component').then(m => m.DepartmentFormComponent) },
  { path: 'form/:id', loadComponent: () => import('./form/department-form.component').then(m => m.DepartmentFormComponent) },
];
```
Thêm vào `app.routes.ts` dưới nhóm ADMIN:
```ts
{ path: 'admin/departments', canActivate: [authGuard, adminGuard],
  loadChildren: () => import('./features/departments/routes').then(m => m.DEPT_ROUTES) }
```

---

## 3) Service
```ts
// src/app/core/services/departments.service.ts
@Injectable({ providedIn: 'root' })
export class DepartmentsService {
  constructor(private http: HttpClient) {}
  list(params: { q?: string; active?: boolean; page?: number; size?: number; sort?: string; }) {
    return this.http.get<Page<DepartmentResponse>>('/api/departments', { params, withCredentials: true });
  }
  get(id: number) {
    return this.http.get<DepartmentResponse>(`/api/departments/${id}`, { withCredentials: true });
  }
  create(payload: { code: string; name: string; description?: string; active?: boolean; }) {
    return this.http.post<DepartmentResponse>('/api/departments', payload, { withCredentials: true });
  }
  update(id: number, patch: Partial<{ code: string; name: string; description?: string; active?: boolean; }>) {
    return this.http.patch<DepartmentResponse>(`/api/departments/${id}`, patch, { withCredentials: true });
  }
  minimal(active = true) {
    return this.http.get<DepartmentMinimalResponse[]>(`/api/departments/minimal`, { params: { active }, withCredentials: true });
  }
}
```

---

## 4) Pages & UI

### 4.1 List
- Filter: `q` (search code/name), `active` (All/Active/Inactive).
- Bảng: `code`, `name`, `active`, `createdAt`, actions **Edit**, **Toggle Active**.
- Pagination: page/size.

```html
<!-- department-list.component.html -->
<div class="flex items-end gap-2 mb-3">
  <input class="border rounded p-2" placeholder="Search code/name" [(ngModel)]="filters.q">
  <select class="border rounded p-2" [(ngModel)]="filters.active">
    <option value="">All</option>
    <option [value]="true">Active</option>
    <option [value]="false">Inactive</option>
  </select>
  <button class="bg-emerald-600 text-white px-3 py-2 rounded" (click)="reload()">Filter</button>
  <div class="flex-1"></div>
  <a class="border rounded px-3 py-2" [routerLink]="['/admin/departments/form/new']">+ Create</a>
</div>

<table class="w-full border rounded">
  <thead class="bg-gray-50">
    <tr>
      <th class="p-2 text-left">Code</th>
      <th class="p-2 text-left">Name</th>
      <th class="p-2 text-left">Active</th>
      <th class="p-2 text-left">Created</th>
      <th class="p-2 text-right">Actions</th>
    </tr>
  </thead>
  <tbody>
    <tr *ngFor="let d of page?.content" class="border-t hover:bg-gray-50">
      <td class="p-2 font-mono">{{d.code}}</td>
      <td class="p-2">{{d.name}}</td>
      <td class="p-2">
        <span class="px-2 py-1 rounded text-xs" [ngClass]="d.active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'">
          {{ d.active ? 'Active' : 'Inactive' }}
        </span>
      </td>
      <td class="p-2 text-sm text-gray-500">{{d.createdAt | date:'short'}}</td>
      <td class="p-2 text-right space-x-3">
        <a [routerLink]="['/admin/departments/form', d.id]" class="text-blue-600 hover:underline">Edit</a>
        <button class="text-rose-600" (click)="toggleActive(d)">{{ d.active ? 'Deactivate' : 'Activate' }}</button>
      </td>
    </tr>
  </tbody>
</table>
```

**Logic gợi ý:**
```ts
toggleActive(d: DepartmentResponse) {
  this.dept.update(d.id, { active: !d.active }).subscribe({
    next: () => { this.toast.success('Updated'); this.reload(); },
    error: (e) => this.toast.error('Update failed')
  });
}
```

### 4.2 Form (Create/Update)
- Fields: `code` (uppercased), `name`, `description`, `active` (ẩn khi create => mặc định true).
- Validation: `code`/`name` required; hiển thị lỗi 409 (duplicate) từ backend.

```html
<!-- department-form.component.html -->
<form (ngSubmit)="submit()" [formGroup]="form" class="space-y-3 max-w-lg">
  <div class="grid grid-cols-2 gap-3">
    <input class="border rounded p-2" placeholder="CODE" formControlName="code" [readonly]="isEdit">
    <input class="border rounded p-2" placeholder="Name" formControlName="name">
    <textarea class="border rounded p-2 col-span-2" placeholder="Description" formControlName="description"></textarea>
    <label class="flex items-center gap-2 col-span-2" *ngIf="isEdit">
      <input type="checkbox" formControlName="active"> Active
    </label>
  </div>
  <div class="flex gap-2">
    <button class="rounded bg-emerald-600 text-white px-4 py-2">{{ isEdit ? 'Save' : 'Create' }}</button>
    <a class="rounded border px-4 py-2" [routerLink]="['/admin/departments']">Cancel</a>
  </div>
  <div *ngIf="error409" class="text-sm text-rose-700">Code/Name đã tồn tại.</div>
</form>
```

**Uppercase code trước khi gửi:**
```ts
submit() {
  const v = { ...this.form.value };
  if (!this.isEdit && v.code) v.code = String(v.code).toUpperCase().trim();
  (this.isEdit ? this.dept.update(this.id, v) : this.dept.create(v)).subscribe(...);
}
```

---

## 5) Guards & Role-based UI
- Dùng `adminGuard` (đã có ở Phase 0B). Nếu `me.role !== 'ADMIN'` → redirect `/tickets` + toast “No permission”.
- Ẩn menu **Departments** trên header nếu không phải ADMIN.

---

## 6) Integration điểm khác (tham khảo)
- **Users Form** (ở Phase 0B): source dropdown Department từ `GET /departments/minimal?active=true`.
- **Profile/Header**: hiển thị `me.department?.name` (đã có backend trả).

---

## 7) Acceptance Criteria
- [ ] Non-admin không truy cập được `/admin/departments`.
- [ ] List hiển thị + filter q/active + pagination.
- [ ] Create/Update hoạt động; duplicate code/name trả lỗi hiển thị rõ.
- [ ] Toggle Active chạy OK, list refresh.
- [ ] Code tự upper-case khi tạo mới.
- [ ] UI Tailwind + Zard gọn gàng, đồng nhất với Users.

---

## 8) Tasks (chia nhỏ Issues)
- **FE-DEP.1** Routing `/admin/departments` + AdminGuard
- **FE-DEP.2** DepartmentsService (list/get/create/update/minimal)
- **FE-DEP.3** List page (filter + table + pager + toggle active)
- **FE-DEP.4** Form page (create/update + validation + uppercase code)
- **FE-DEP.5** Toast + Error handling (409/400/401)
- **FE-DEP.6** (Optional) Hook minimal vào Users Form (dropdown)

---

## 9) README snippet
```
### Test nhanh Departments (Admin)
1) Login ADMIN → /admin/departments.
2) Create dept: CODE=OPS, Name=Operations → OK.
3) Edit dept → đổi name, toggle active.
4) Duplicate code/name → thấy lỗi 409 hiển thị.
5) (Optional) Vào Users Form → dropdown Department có dữ liệu từ /departments/minimal.
```
