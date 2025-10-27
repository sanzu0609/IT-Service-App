# 🎫 FE Phase 1 — Tickets Module
**Version:** v1.0 — Angular + Tailwind + Zard UI

Mục tiêu: Hoàn thiện module Tickets bao gồm **CRUD, Comment, Workflow, SLA flag**, đảm bảo guard quyền & ownership.

---

## 0) Deliverables
- Routes `/tickets`, `/tickets/:id`
- Trang **List**, **Detail**, **Comment**, **Status Change**
- (Optional) **Create Ticket**
- Role-based UI: END_USER/AGENT/ADMIN
- SLA badge hiển thị `OK/NEAR/BREACHED`
- Gọi API backend session-based với CSRF

---

## 1) API Contracts (backend)
| Endpoint | Method | Description |
|-----------|---------|-------------|
| `/tickets` | `GET` | List/filter/pagination |
| `/tickets` | `POST` | Create new ticket |
| `/tickets/{id}` | `GET` | Ticket detail |
| `/tickets/{id}` | `PATCH` | Update priority/assignee |
| `/tickets/{id}/comments` | `GET`/`POST` | Comments list/add |
| `/tickets/{id}/status` | `POST` | Change ticket status |

> Tất cả request cần `withCredentials:true`; POST/PATCH cần CSRF.

---

## 2) Models
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
list(params: { status?: string; priority?: string; page?: number; size?: number; }) { /* GET /tickets */ }
get(id: number) { /* GET /tickets/{id} */ }
create(payload: { subject: string; description: string; priority: Priority; categoryId?: number; }) { /* POST /tickets */ }
update(id: number, patch: Partial<Ticket>) { /* PATCH /tickets/{id} */ }
listComments(id: number) { /* GET /tickets/{id}/comments */ }
addComment(id: number, payload: { content: string; isInternal: boolean; }) { /* POST /tickets/{id}/comments */ }
changeStatus(id: number, payload: { toStatus: TicketStatus; note?: string; }) { /* POST /tickets/{id}/status */ }
```
> Luôn truyền `{ withCredentials: true }`. Với POST/PATCH cần CSRF.

---

## 4) Routing
```
/tickets
  ├─ list       (default)
  ├─ detail/:id (info + comments + status)
  └─ create     (optional)
```

```ts
// src/app/features/tickets/routes.ts
export const TICKETS_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./list/list.component').then(m => m.TicketListComponent) },
  { path: 'create', loadComponent: () => import('./create/create.component').then(m => m.TicketCreateComponent) },
  { path: ':id', loadComponent: () => import('./detail/detail.component').then(m => m.TicketDetailComponent) }
];
```

---

## 5) Pages & UI

### 5.1 Ticket List
- Filter: `status`, `priority`
- Bảng: `ticketNumber`, `subject`, `status`, `priority`, `slaFlag`, `createdAt`
- SLA badge màu:
  - OK → xám
  - NEAR → vàng
  - BREACHED → đỏ

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
  <button (click)="reload()" class="bg-emerald-600 text-white px-3 py-2 rounded">Filter</button>
  <div class="flex-1"></div>
  <a *ngIf="me.role!=='END_USER'" class="border rounded px-3 py-2" [routerLink]="['/tickets/create']">+ New</a>
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
      <td class="p-2 text-right">
        <a [routerLink]="['/tickets', t.id]" class="text-blue-600 hover:underline">Detail</a>
      </td>
    </tr>
  </tbody>
</table>
```

---

### 5.2 Ticket Detail
- Thông tin: subject, description, status, priority, SLA.
- Comments list + add comment.
- Status change form (right panel).

```html
<div class="grid lg:grid-cols-3 gap-4">
  <section class="lg:col-span-2 space-y-3">
    <div class="border rounded p-3">
      <h2 class="font-semibold">{{ticket.subject}}</h2>
      <div class="mt-2 text-sm text-gray-700">{{ticket.description}}</div>
      <div class="mt-3 flex gap-2">
        <span class="px-2 py-1 rounded bg-blue-600 text-white">{{ticket.status}}</span>
        <span class="px-2 py-1 rounded bg-gray-100">Priority: {{ticket.priority}}</span>
        <span class="px-2 py-1 rounded" [ngClass]="slaClass(ticket.slaFlag)">SLA: {{ticket.slaFlag}}</span>
      </div>
    </div>
    <div class="border rounded p-3">
      <h3 class="font-medium mb-2">Comments</h3>
      <div *ngFor="let c of comments" class="border rounded p-2 mb-2">
        <div class="text-xs text-gray-500">{{c.author.username}} • {{c.createdAt | date:'short'}}</div>
        <div class="text-sm" [class.italic]="c.isInternal">
          {{c.content}} <span *ngIf="c.isInternal" class="text-amber-700">(internal)</span>
        </div>
      </div>
      <form (ngSubmit)="addComment()" [formGroup]="commentForm" class="space-y-2 mt-3">
        <textarea formControlName="content" class="border w-full rounded p-2" placeholder="Add comment..."></textarea>
        <label class="text-sm flex items-center gap-2">
          <input type="checkbox" formControlName="isInternal"> Internal (ẩn với END_USER)
        </label>
        <button class="bg-emerald-600 text-white px-4 py-2 rounded">Submit</button>
      </form>
    </div>
  </section>
  <aside class="space-y-3">
    <div class="border rounded p-3">
      <h3 class="font-medium mb-2">Change Status</h3>
      <form (ngSubmit)="changeStatus()" [formGroup]="statusForm" class="space-y-2">
        <select class="border rounded p-2 w-full" formControlName="toStatus">
          <option *ngFor="let s of nextStatuses" [value]="s">{{s}}</option>
        </select>
        <textarea formControlName="note" class="border rounded p-2 w-full" placeholder="Note..."></textarea>
        <button class="bg-emerald-600 text-white w-full rounded px-3 py-2">Update</button>
      </form>
    </div>
  </aside>
</div>
```

---

## 6) Guard & Role rules
- END_USER: chỉ xem ticket mình tạo, comment công khai.
- AGENT: có thể comment nội bộ, đổi status (IN_PROGRESS → RESOLVED).
- ADMIN: toàn quyền.
- Backend đã enforce; FE chỉ cần ẩn nút.

---

## 7) SLA Badge Helper
```ts
slaClass(flag: string) {
  return {
    'bg-gray-200 text-gray-700 px-2 py-1 rounded': flag==='OK',
    'bg-yellow-200 text-yellow-800 px-2 py-1 rounded': flag==='NEAR',
    'bg-red-200 text-red-800 px-2 py-1 rounded': flag==='BREACHED',
  };
}
```
```ts
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

## 8) Acceptance Criteria
- [ ] List/filter hoạt động, phân trang ok.
- [ ] Detail hiển thị đúng, comment và status change chạy.
- [ ] END_USER không thấy comment internal.
- [ ] Status transition đúng guard.
- [ ] SLA badge hiển thị theo flag.
- [ ] UI Tailwind + Zard đẹp, đồng bộ màu.

---

## 9) Tasks
- **FE-1.1** TicketsService (API methods)
- **FE-1.2** Routing + pages (list/detail)
- **FE-1.3** Comment form + list
- **FE-1.4** Status form + validation
- **FE-1.5** SLA badge + helper
- **FE-1.6** Role-based UI hide/show
- **FE-1.7** Manual test checklist

---

## 10) README snippet
```
### Test nhanh Tickets
1. Login bằng END_USER → tạo ticket (nếu có màn create).
2. Đăng nhập ADMIN/AGENT → đổi status, comment internal.
3. END_USER xem lại ticket → chỉ thấy comment public.
4. Quan sát SLA flag đổi màu khi gần hạn hoặc quá hạn.
```
