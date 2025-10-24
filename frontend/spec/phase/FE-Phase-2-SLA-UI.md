# ⏱️ FE Phase 2 — SLA UI & Visualization
**Version:** v1.0 — Angular + Tailwind + Zard UI

Mục tiêu: Hiển thị SLA deadline và flag (OK, NEAR, BREACHED) cho từng ticket, giúp người dùng nhận biết trạng thái SLA nhanh chóng. Không CRUD, chỉ hiển thị dữ liệu từ backend.

---

## 0) Deliverables
- Hiển thị SLA flags (OK / NEAR / BREACHED) trong **Ticket List** và **Ticket Detail**.
- Format thời gian deadline rõ ràng (UTC → local).
- (Optional) Hiển thị countdown (thời gian còn lại) nếu muốn nâng UX.
- Không cần API mới — chỉ đọc dữ liệu `slaResponseDeadline`, `slaResolutionDeadline`, `slaFlag` từ backend.

---

## 1) API Fields (backend đã có)
Từ entity `Ticket`:

| Field | Type | Description |
|--------|------|-------------|
| slaResponseDeadline | string (ISO) | Hạn phản hồi |
| slaResolutionDeadline | string (ISO) | Hạn xử lý |
| slaFlag | 'OK' \| 'NEAR' \| 'BREACHED' | Trạng thái SLA |

---

## 2) Integration Points
| Màn hình | Vị trí hiển thị | Component/Logic |
|-----------|----------------|-----------------|
| **Ticket List** | Cột SLA | `SlaBadgeComponent` |
| **Ticket Detail** | Panel info | `date-utc.pipe`, `relative-time.pipe` + badge |

---

## 3) Components & Pipes

### 3.1 `SlaBadgeComponent`
```ts
// src/app/shared/components/sla-badge/sla-badge.component.ts
@Component({
  selector: 'app-sla-badge',
  standalone: true,
  template: `<span [ngClass]="classMap()" class="px-2 py-1 rounded text-xs font-medium">{{flag}}</span>`,
})
export class SlaBadgeComponent {
  @Input() flag: 'OK' | 'NEAR' | 'BREACHED' | undefined;
  classMap() {
    return {
      'bg-gray-200 text-gray-700': this.flag === 'OK',
      'bg-yellow-200 text-yellow-800': this.flag === 'NEAR',
      'bg-red-200 text-red-800': this.flag === 'BREACHED',
    };
  }
}
```

### 3.2 `date-utc.pipe.ts`
```ts
@Pipe({ name: 'dateUtc', standalone: true })
export class DateUtcPipe implements PipeTransform {
  transform(iso: string): string {
    if (!iso) return '-';
    const d = new Date(iso);
    return d.toLocaleString();
  }
}
```

### 3.3 `relative-time.pipe.ts`
```ts
@Pipe({ name: 'relativeTime', standalone: true })
export class RelativeTimePipe implements PipeTransform {
  transform(iso: string): string {
    if (!iso) return '';
    const target = new Date(iso).getTime();
    const diff = target - Date.now();
    const mins = Math.floor(Math.abs(diff) / 60000);
    if (diff > 0) return `Còn ${mins} phút`;
    return `Trễ ${mins} phút`;
  }
}
```

---

## 4) Ticket List Integration
```html
<td class="p-2">
  <app-sla-badge [flag]="t.slaFlag"></app-sla-badge>
</td>
```

---

## 5) Ticket Detail Integration
```html
<div class="border rounded p-3">
  <h2 class="font-semibold mb-2">{{ticket.subject}}</h2>
  <div class="text-sm text-gray-700">{{ticket.description}}</div>
  <div class="mt-3 flex flex-col gap-1 text-sm">
    <div>Response Deadline: {{ticket.slaResponseDeadline | dateUtc}} <span class="ml-2"><app-sla-badge [flag]="ticket.slaFlag"></app-sla-badge></span></div>
    <div>Resolution Deadline: {{ticket.slaResolutionDeadline | dateUtc}}</div>
    <div class="text-gray-500 text-xs">({{ticket.slaResolutionDeadline | relativeTime}})</div>
  </div>
</div>
```

---

## 6) Styles (Tailwind Utility)
| Flag | Class | Màu |
|------|--------|------|
| OK | `bg-gray-200 text-gray-700` | Xám |
| NEAR | `bg-yellow-200 text-yellow-800` | Vàng |
| BREACHED | `bg-red-200 text-red-800` | Đỏ |

---

## 7) Optional UX Enhancements
- Countdown realtime (`setInterval`) cập nhật mỗi phút.  
- Tooltip hiển thị thời gian còn lại cụ thể (dùng directive).  
- Hiển thị icon (🟢🟡🔴) thay vì text.

---

## 8) Acceptance Criteria
- [ ] SLA badge hiển thị đúng flag.
- [ ] Deadline format theo timezone người dùng (locale).
- [ ] Relative time hiển thị chính xác (còn/trễ).  
- [ ] Badge xuất hiện trong List và Detail.  
- [ ] Optional countdown hoạt động trơn tru.

---

## 9) Tasks
- **FE-2.1** Tạo `SlaBadgeComponent`.
- **FE-2.2** Viết pipes: `date-utc.pipe.ts`, `relative-time.pipe.ts`.
- **FE-2.3** Thêm badge vào Ticket List.
- **FE-2.4** Hiển thị deadline & badge tại Ticket Detail.
- **FE-2.5** (Optional) countdown realtime.
- **FE-2.6** Manual test end-to-end.

---

## 10) README snippet
```
### Test nhanh SLA UI
1) Login ADMIN → xem ticket có SLA.
2) Quan sát màu badge:
   - OK: xám
   - NEAR: vàng
   - BREACHED: đỏ
3) Xem detail → deadline format đúng, relative time hiển thị chính xác.
4) (Nếu có countdown) thời gian cập nhật mỗi phút.
```
