# ⏱️ Phase 3 — SLA & Scheduler (Deadline Tracking + Auto Close)

## 0️⃣ Scope
- Thêm tính năng **Service Level Agreement (SLA)** cho ticket.
- Tự động tính **thời hạn phản hồi và xử lý** dựa theo `priority` khi tạo/cập nhật.
- Định kỳ **quét deadline (scheduler)** → gắn cờ `NEAR`, `BREACHED`.
- Tự động **đóng ticket RESOLVED** sau N ngày nếu không bị reopen.

---

## 1️⃣ SLA Logic

| Priority | Response Deadline | Resolution Deadline |
|-----------|------------------|---------------------|
| **LOW** | +12h | +72h |
| **MEDIUM** | +8h | +48h |
| **HIGH** | +4h | +24h |
| **CRITICAL** | +1h | +8h |

> *Deadline tính từ `createdAt` hoặc `updatedAt` (nếu priority đổi).*

### SLA Flags
| Flag | Nghĩa |
|------|--------|
| **OK** | Trong thời hạn |
| **NEAR** | Đã dùng ≥80% thời gian cho phép |
| **BREACHED** | Quá hạn |

---

## 2️⃣ API Contracts

### 🔹 POST /tickets (Phase-1 đã có)
- Khi tạo ticket → tự tính `sla_response_deadline` và `sla_resolution_deadline` theo `priority`.

### 🔹 PATCH /tickets/{id} (Phase-1)
- Khi đổi `priority` → tính lại deadline.

### 🔹 GET /tickets (Phase-1)
- Có thể hiển thị thêm trường `slaFlag`, `slaResponseDeadline`, `slaResolutionDeadline`.

---

## 3️⃣ Scheduler Jobs

### 🔸 Job 1 — SLA Checker
- Chạy mỗi **15 phút** (`@Scheduled(fixedRate = 15min)`).
- Quét các ticket có `status` khác `RESOLVED|CLOSED|CANCELLED`.
- So sánh `now` với deadline:
  - Nếu >=80% → `slaFlag = NEAR`
  - Nếu quá hạn → `slaFlag = BREACHED`
- Ghi log số lượng cập nhật.

**Output log ví dụ:**
```
[SLA-CHECKER] Updated 5 tickets (3 NEAR, 2 BREACHED)
```

### 🔸 Job 2 — Auto-close Ticket
- Chạy mỗi ngày (`@Scheduled(cron = "0 0 0 * * *")`).
- Tìm ticket có `status=RESOLVED` và `resolvedAt <= now - N days` (VD: 7 ngày).
- Đổi sang `CLOSED` + ghi `TICKET_HISTORY` note `"Auto closed by system"`.

**Config:**
```
app.sla.autoclose.days=7
```

---

## 4️⃣ Data Model liên quan
- **TICKETS**
  - `sla_response_deadline TIMESTAMP`
  - `sla_resolution_deadline TIMESTAMP`
  - `sla_flag VARCHAR (OK|NEAR|BREACHED)`
- Không cần bảng mới.

---

## 5️⃣ Tasks & Checklist

### ⚙️ Service & Scheduler
- [ ] `SlaService` tính deadline (theo priority map).
- [ ] `SlaScheduler`:
  - check deadline → update flag.
  - auto close ticket.
- [ ] `TicketService` tích hợp gọi `SlaService` khi create/update.

### 🧩 Config
- [ ] `application.properties`:
  ```properties
  app.sla.autoclose.days=7
  ```
- [ ] `@EnableScheduling` trong main app.

### 🧠 Utility
- [ ] Enum `SlaFlag { OK, NEAR, BREACHED }`.
- [ ] Helper tính thời gian còn lại %.
- [ ] Log summary mỗi lần chạy scheduler.

### 🧪 Testing
- [ ] Unit test hàm tính deadline.
- [ ] Unit test SLA flag update (NEAR/BREACHED).
- [ ] Integration test auto-close (Mock time hoặc dùng Clock bean).

---

## 6️⃣ Definition of Done (DoD)

| Tiêu chí | Mô tả |
|----------|--------|
| ✅ SLA Compute | Khi tạo/đổi priority, deadline tính đúng |
| ✅ SLA Checker | Job 15' cập nhật flag OK/NEAR/BREACHED |
| ✅ Auto Close | Job ngày chuyển RESOLVED→CLOSED đúng rule |
| ✅ Ticket History | Ghi entry khi auto-close |
| ✅ Configurable | `app.sla.autoclose.days` chỉnh được |
| ✅ Tests | Unit & integration pass |

---

## 7️⃣ Test Plan (Integration)

| Case | Expect |
|------|--------|
| Tạo ticket HIGH | Deadline +4h/+24h |
| Tạo ticket CRITICAL | Deadline +1h/+8h |
| Đổi priority → HIGH | Deadline cập nhật lại |
| SLA Checker: gần hạn (≥80%) | slaFlag=NEAR |
| SLA Checker: quá hạn | slaFlag=BREACHED |
| Auto Close sau 7 ngày | status=CLOSED, ghi history |
| Auto Close ticket reopened | bỏ qua |

---

## 8️⃣ Out of Scope
- SLA theo department hoặc business hour.  
- Báo cáo thống kê SLA.  
- Giao diện hiển thị countdown.

---

## 9️⃣ Thứ tự thực thi cho AI Agent
1. Tạo enum `SlaFlag` + service `SlaService` tính deadline.  
2. Cập nhật `TicketService` gọi `SlaService` khi tạo/đổi priority.  
3. Tạo `SlaScheduler` với 2 job (checker + auto-close).  
4. Config scheduling + properties.  
5. Test toàn bộ logic deadline & auto-close.
