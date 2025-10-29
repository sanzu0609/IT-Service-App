# 🎫 FE Phase 1 — Tickets Module (v1.1, có Create)
**Stack:** Angular 20.3.6 • Tailwind • Zard UI • Session-based + CSRF

Mục tiêu: Hoàn thiện Tickets **CRUD + Comments + Workflow + SLA** và guard theo role/ownership. Bản v1.1 bổ sung **Create, Edit, Cancel** (trước đó thiếu Create).

---

## 0) Deliverables
- Routes `/tickets`, `/tickets/create`, `/tickets/:id`, `/tickets/:id/edit`
- Pages: **List**, **Detail**, **Create**, **Edit**
- Components: **Comment box**, **Status change panel**, **SLA badge**
- Role-based UI: END_USER / AGENT / ADMIN
- API gọi bằng `withCredentials: true`; POST/PATCH cần CSRF

---

## 1) API Contracts (backend)
| Endpoint | Method | Description |
|-----------|--------|-------------|
| `/tickets` | `GET` | List/filter/pagination (`status`, `priority`, `page`, `size`, `search?`) |
| `/tickets` | `POST` | **Create ticket** (subject, description, priority, categoryId?) |
| `/tickets/{id}` | `GET` | Ticket detail |
| `/tickets/{id}` | `PATCH` | **Edit ticket** (subject/description/priority/assignee/relatedAssetId?) |
| `/tickets/{id}/comments` | `GET`/`POST` | Comment list / add comment |
| `/tickets/{id}/status` | `POST` | Change status (NEW→IN_PROGRESS→RESOLVED→CLOSED…) |

> Tất cả request cần `withCredentials:true`; POST/PATCH cần CSRF header.

---

## 2) Models (FE)
```ts
export type TicketStatus =
  | 'NEW' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
  | 'ON_HOLD' | 'REOPENED' | 'CANCELLED';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type SlaFlag = 'OK' | 'NEAR' | 'BREACHED';

export interface Ticket {
  id: number;
  ticketNumber: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: Priority;
  reporter: User;
  assignee?: User;
  category?: { id: number; name: string };
  relatedAssetId?: number;
  slaResponseDeadline?: string;
  slaResolutionDeadline?: string;
  slaFlag?: SlaFlag;
  createdAt: string;
  updatedAt: string;
}

export interface TicketComment {
  id: number;
  ticketId: number;
  author: User;
  content: string;
  isInternal: boolean;
  createdAt: string;
}
```

---

## 3) Service
```ts
// src/app/core/services/tickets.service.ts
list(params: { status?: string; priority?: string; page?: number; size?: number; search?: string; }) { /* GET /tickets */ }
get(id: number) { /* GET /tickets/{id} */ }
create(payload: { subject: string; description: string; priority: Priority; categoryId?: number; relatedAssetId?: number; }) { /* POST /tickets */ }
update(id: number, patch: Partial<Pick<Ticket, 'subject' | 'description' | 'priority' | 'assignee' | 'relatedAssetId'>>) { /* PATCH /tickets/{id} */ }
listComments(id: number) { /* GET /tickets/{id}/comments */ }
addComment(id: number, payload: { content: string; isInternal: boolean; }) { /* POST /tickets/{id}/comments */ }
changeStatus(id: number, payload: { toStatus: TicketStatus; note?: string; holdReason?: string; }) { /* POST /tickets/{id}/status */ }
cancel(id: number, note?: string) { /* wrapper of changeStatus with toStatus='CANCELLED' */ }
```
> Luôn truyền `{ withCredentials: true }` vào `HttpClient` options.

---

## 4) Routing
```
/tickets
  ├─ ''            → list
  ├─ create       → create form
  ├─ :id          → detail
  └─ :id/edit     → edit form
```

```ts
// src/app/features/tickets/routes.ts
export const TICKETS_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./list/list.component').then(m => m.TicketListComponent) },
  { path: 'create', loadComponent: () => import('./create/create.component').then(m => m.TicketCreateComponent) },
  { path: ':id', loadComponent: () => import('./detail/detail.component').then(m => m.TicketDetailComponent) },
  { path: ':id/edit', loadComponent: () => import('./edit/edit.component').then(m => m.TicketEditComponent) },
];
```

---

## 5) Pages & UI

### 5.1 List
- Filter: `status`, `priority`, (optional) `search`
- Columns: `ticketNumber`, `subject`, `status`, `priority`, `slaFlag`, `createdAt`
- Actions: **Detail**, **Edit** (role), **Cancel** (role/state)
- Button “+ New” (ẩn với role không được tạo)

```html
<div class="flex gap-2 mb-3">
  <select [(ngModel)]="filters.status" class="border rounded p-2">
    <option value="">All Status</option>
    <option *ngFor="let s of statuses" [value]="s">{{s}}</option>
  </select>
  <select [(ngModel)]="filters.priority" class="border rounded p-2">
    <option value="">All Priority</option>
    <option *ngFor="let p of priorities" [value]="p">{{p}}</option>
  </select>
  <input [(ngModel)]="filters.search" placeholder="Search subject..." class="border rounded p-2 w-60">
  <button (click)="reload()" class="bg-emerald-600 text-white px-3 py-2 rounded">Filter</button>
  <div class="flex-1"></div>
  <a *ngIf="canCreate" class="border rounded px-3 py-2" [routerLink]="['/tickets/create']">+ New</a>
</div>

<table class="w-full border rounded">
  <thead class="bg-gray-50">
    <tr>
      <th class="p-2 text-left">#</th>
      <th class="p-2 text-left">Subject</th>
      <th class="p-2 text-left">Status</th>
      <th class="p-2 text-left">Priority</th>
      <th class="p-2 text-left">SLA</th>
      <th class="p-2"></th>
    </tr>
  </thead>
  <tbody>
    <tr *ngFor="let t of page?.content" class="border-t hover:bg-gray-50">
      <td class="p-2">{{t.ticketNumber}}</td>
      <td class="p-2">{{t.subject}}</td>
      <td class="p-2"><span class="px-2 py-1 rounded text-white" [ngClass]="statusClass(t.status)">{{t.status}}</span></td>
      <td class="p-2">{{t.priority}}</td>
      <td class="p-2"><span [ngClass]="slaClass(t.slaFlag)">{{t.slaFlag}}</span></td>
      <td class="p-2 text-right space-x-3">
        <a [routerLink]="['/tickets', t.id]" class="text-blue-600 hover:underline">Detail</a>
        <a *ngIf="canEdit(t)" [routerLink]="['/tickets', t.id, 'edit']" class="text-blue-600">Edit</a>
        <button *ngIf="canCancel(t)" (click)="cancel(t)" class="text-rose-600">Cancel</button>
      </td>
    </tr>
  </tbody>
</table>
```

### 5.2 Create
- Fields: `subject` (≥5), `description` (≥10), `priority` (default: MEDIUM), `categoryId?`
- Submit → `POST /tickets` → navigate `/:id`

```html
<form [formGroup]="form" (ngSubmit)="submit()" class="space-y-3 max-w-2xl">
  <input formControlName="subject" class="border rounded p-2 w-full" placeholder="Subject">
  <textarea formControlName="description" class="border rounded p-2 w-full h-32" placeholder="Describe your issue"></textarea>
  <div class="grid md:grid-cols-2 gap-3">
    <select formControlName="priority" class="border rounded p-2">
      <option *ngFor="let p of priorities" [value]="p">{{p}}</option>
    </select>
    <select formControlName="categoryId" class="border rounded p-2">
      <option [value]="''">No category</option>
      <option *ngFor="let c of categories" [value]="c.id">{{c.name}}</option>
    </select>
  </div>
  <button class="bg-emerald-600 text-white rounded px-4 py-2">Create</button>
</form>
```

### 5.3 Detail
- Info + SLA + Comments + Add Comment + Status Change

### 5.4 Edit
- PATCH các trường cho phép theo role/state
- END_USER chỉ edit được khi ticket đang `NEW` (FE ẩn, BE enforce)

```html
<form [formGroup]="form" (ngSubmit)="save()" class="space-y-3 max-w-2xl">
  <input formControlName="subject" class="border rounded p-2 w-full">
  <textarea formControlName="description" class="border rounded p-2 w-full h-32"></textarea>
  <div class="grid md:grid-cols-3 gap-3">
    <select formControlName="priority" class="border rounded p-2" *ngIf="canEditPriority">
      <option *ngFor="let p of priorities" [value]="p">{{p}}</option>
    </select>
    <select formControlName="assigneeId" class="border rounded p-2" *ngIf="canAssign">
      <option [value]="''">Unassigned</option>
      <option *ngFor="let u of agents" [value]="u.id">{{u.fullName || u.username}}</option>
    </select>
    <input formControlName="relatedAssetId" class="border rounded p-2" placeholder="Asset ID" *ngIf="useAssets">
  </div>
  <div class="flex gap-2">
    <button class="bg-emerald-600 text-white rounded px-4 py-2">Save</button>
    <a [routerLink]="['/tickets', ticketId]" class="border rounded px-4 py-2">Cancel</a>
  </div>
</form>
```

---

## 6) Guard & Role Rules
- END_USER: tạo ticket; chỉ edit/cancel ticket của mình và khi `NEW`. Không thấy comment internal.
- AGENT: có thể edit `priority`, `assignee`, comment internal; đổi status `IN_PROGRESS/RESOLVED`.
- ADMIN: toàn quyền.

---

## 7) Helpers
```ts
slaClass(flag: string) {
  return {
    'bg-gray-200 text-gray-700 px-2 py-1 rounded': flag==='OK',
    'bg-yellow-200 text-yellow-800 px-2 py-1 rounded': flag==='NEAR',
    'bg-red-200 text-red-800 px-2 py-1 rounded': flag==='BREACHED',
  };
}
statusClass(s: string) {
  return {
    'bg-blue-600 text-white rounded px-2 py-1': s==='NEW' || s==='IN_PROGRESS',
    'bg-yellow-600 text-white rounded px-2 py-1': s==='ON_HOLD',
    'bg-green-600 text-white rounded px-2 py-1': s==='RESOLVED' || s==='CLOSED',
    'bg-red-600 text-white rounded px-2 py-1': s==='REOPENED' || s==='CANCELLED',
  };
}
```

---

## 8) Acceptance Criteria (v1.1)
- [ ] **Create**: tạo ticket → điều hướng về `/:id`
- [ ] **Edit**: PATCH theo role/state
- [ ] **Cancel**: đổi status → `CANCELLED` + toast
- [ ] END_USER không thấy internal comments
- [ ] SLA badge hiển thị đúng
- [ ] UI đồng nhất Zard/Tailwind

---

## 9) Tasks
- **FE-1.1** TicketsService (đã cập nhật)
- **FE-1.2** Routing (thêm create/edit)
- **FE-1.2b** Create page + validation + redirect
- **FE-1.2c** Edit page + role-based fields
- **FE-1.3** Comment form + list
- **FE-1.4** Status form + validation (+ cancel wrapper)
- **FE-1.5** SLA badge + helper
- **FE-1.6** Role-based UI hide/show
- **FE-1.7** Manual test checklist CRUD matrix

---

## 10) README snippet
```
### Test nhanh Tickets (v1.1)
1) END_USER → /tickets/create → tạo ticket → chuyển về /tickets/:id.
2) ADMIN/AGENT → vào /tickets/:id/edit → chỉnh priority/assignee.
3) ADMIN/AGENT → đổi status; END_USER chỉ đổi khi được phép.
4) Thử Cancel → status=CANCELLED; List refresh; Detail ghi history.
5) Kiểm tra END_USER không thấy internal comments.
```
