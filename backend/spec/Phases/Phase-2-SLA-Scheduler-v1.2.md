# ⏱️ Phase 2 — SLA & Scheduler (Deadline Tracking + Auto Close)
**Version:** v1.2 — Simplified (No Asset Module)

---

## 0️⃣ Scope
- Thêm tính năng **Service Level Agreement (SLA)** cho ticket.
- Tự động tính **thời hạn phản hồi & xử lý** theo `priority` khi tạo/cập nhật.
- Định kỳ **quét deadline** → gắn cờ `OK / NEAR / BREACHED`.
- **Auto-close** ticket ở trạng thái `RESOLVED` sau N ngày nếu không reopen.
- Không phụ thuộc Asset module.

---

## 1️⃣ SLA Policy

| Priority | Response Deadline | Resolution Deadline |
|---------|-------------------|---------------------|
| LOW     | +12h              | +72h                |
| MEDIUM  | +8h               | +48h                |
| HIGH    | +4h               | +24h                |
| CRITICAL| +1h               | +8h                 |

> Deadline tính từ `createdAt` (khi tạo) hoặc từ `updatedAt` (khi thay đổi priority).

**Flags**
- `OK`: trong hạn
- `NEAR`: đã dùng ≥80% thời gian
- `BREACHED`: quá hạn

---

## 2️⃣ API Contracts (không đổi endpoint, chỉ thêm fields)
- **POST /tickets**: Khi tạo ticket → set `sla_response_deadline`, `sla_resolution_deadline`, `sla_flag=OK`.
- **PATCH /tickets/{id}**: Khi đổi `priority` → tính lại deadline tương ứng.
- **GET /tickets / {id}**: Có thể trả thêm `sla*` fields cho client.

---

## 3️⃣ Scheduler Jobs

### 🔸 SLA Checker
- Chạy mỗi **15 phút** (`@Scheduled(fixedRate = 15 * 60 * 1000)`).
- Bỏ qua `CLOSED`, `CANCELLED`.
- Tính % thời gian đã dùng so với deadline:
  - ≥80% → `NEAR`
  - >100% → `BREACHED`
- Không hạ cờ (ví dụ từ `BREACHED` về `OK`), chỉ tiến/giữ nguyên.

**Log ví dụ**
```
[SLA-CHECK] updated=5 (near=3, breached=2)
```

### 🔸 Auto-close Resolved
- Chạy **hàng ngày** (`0 0 0 * * *`).
- Tìm ticket `status=RESOLVED` có `resolvedAt <= now - N days`.
- Chuyển `RESOLVED → CLOSED`; ghi `TICKET_HISTORY` note `"Auto closed by system"`.

**Config**
```properties
app.sla.autoclose.days=7
```

---

## 4️⃣ Data Model
- **TICKETS** thêm/duy trì các cột:
  - `sla_response_deadline TIMESTAMP`
  - `sla_resolution_deadline TIMESTAMP`
  - `sla_flag VARCHAR(16)  -- OK|NEAR|BREACHED`
  - `resolved_at TIMESTAMP` (khi set RESOLVED)
  - `closed_at TIMESTAMP` (khi set CLOSED)

> Không cần bảng SLA riêng. Toàn bộ lưu trong `TICKETS`.

---

## 5️⃣ Tasks & Checklist

### ⚙️ Service & Scheduler
- [x] `SlaService` tính deadline từ priority map.
- [x] `SlaScheduler` gồm 2 job: checker & auto-close.
- [x] `TicketService` gọi `SlaService` khi create/đổi priority.
- [x] Ghi `TicketHistory` khi auto-close.

### 🧩 Config & Infra
- [x] `@EnableScheduling` trong main app.
- [x] `application.properties` thêm `app.sla.autoclose.days=7`.

### 🧠 Utility
- [x] Enum `SlaFlag { OK, NEAR, BREACHED }`.
- [x] Helper tính phần trăm thời gian đã dùng.

### 🔒 Guard (không bắt buộc)
- [ ] Bỏ qua ticket của `reporter` **inactive** (nếu chính sách yêu cầu).

### 🧪 Testing
- [ ] Unit: mapping priority → deadline; flag transitions.
- [ ] Integration: mock clock để test checker & auto-close.

---

## 6️⃣ Definition of Done (DoD)
| Tiêu chí | Mô tả |
|---------|------|
| ✅ SLA compute | Deadline đúng theo priority |
| ✅ SLA checker | Cập nhật flag OK/NEAR/BREACHED |
| ✅ Auto-close | RESOLVED → CLOSED sau N ngày |
| ✅ History | Ghi log khi auto-close |
| ✅ Configurable | `app.sla.autoclose.days` hoạt động |
| ✅ Tests | Unit + Integration pass |

---

## 7️⃣ Test Plan (Integration)

| Case | Expect |
|------|--------|
| Create ticket HIGH | +4h / +24h deadlines |
| Change priority to CRITICAL | deadline cập nhật lại |
| Checker at 79% elapsed | flag=OK |
| Checker at 80% elapsed | flag=NEAR |
| Checker beyond deadline | flag=BREACHED |
| Auto-close after 7 days | status=CLOSED + history |
| Reopened ticket | không auto-close |

---

## 8️⃣ Out of Scope
- Business hour calendar (chỉ tính thời gian thực).  
- SLA riêng theo department.  
- Báo cáo SLA/biểu đồ.

---

## 9️⃣ Thứ tự thực thi cho AI Agent
1. Tạo enum `SlaFlag`, implement `SlaService` (priority → durations).  
2. Hook vào `TicketService` (create/update priority).  
3. Tạo `SlaScheduler` với 2 job.  
4. Thêm cấu hình scheduling & properties.  
5. Viết tests (mock clock/time source).  

---
