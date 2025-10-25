# 🧩 ITSM Frontend Data Models

## User
| Field | Type | Description |
|--------|------|--------------|
| id | number | Unique user ID |
| username | string | Login name |
| email | string | Email |
| fullName | string | Họ tên đầy đủ |
| role | 'ADMIN' \| 'AGENT' \| 'END_USER' | Vai trò |
| active | boolean | Trạng thái tài khoản |
| departmentId | number | Phòng ban (optional) |
| mustChangePassword | boolean | Bắt buộc đổi mật khẩu |
| createdAt | string (ISO) | Ngày tạo |

---

## Ticket
| Field | Type | Description |
|--------|------|--------------|
| id | number | Ticket ID |
| ticketNumber | string | Mã định danh (e.g. TCK-0012) |
| subject | string | Tiêu đề |
| description | string | Mô tả chi tiết |
| status | 'NEW' \| 'IN_PROGRESS' \| 'RESOLVED' \| 'CLOSED' \| 'ON_HOLD' \| 'REOPENED' \| 'CANCELLED' | Trạng thái |
| priority | 'LOW' \| 'MEDIUM' \| 'HIGH' \| 'CRITICAL' | Mức độ ưu tiên |
| reporter | User | Người tạo |
| assignee | User | Người xử lý |
| relatedAssetId | number? | (Optional) asset liên quan |
| slaResponseDeadline | string (ISO) | Hạn phản hồi |
| slaResolutionDeadline | string (ISO) | Hạn xử lý |
| slaFlag | 'OK' \| 'NEAR' \| 'BREACHED' | Trạng thái SLA |
| createdAt | string (ISO) | Ngày tạo |
| updatedAt | string (ISO) | Ngày cập nhật |

---

## TicketComment
| Field | Type | Description |
|--------|------|-------------|
| id | number | Comment ID |
| ticketId | number | Ticket liên quan |
| author | User | Người comment |
| content | string | Nội dung |
| isInternal | boolean | Nội bộ hay công khai |
| createdAt | string (ISO) | Ngày tạo |

---

## TicketHistory
| Field | Type | Description |
|--------|------|-------------|
| id | number | History ID |
| ticketId | number | Ticket liên quan |
| fromStatus | string | Trạng thái cũ |
| toStatus | string | Trạng thái mới |
| note | string | Ghi chú thay đổi |
| changedBy | User | Người thay đổi |
| createdAt | string (ISO) | Ngày thay đổi |

---

## API Response Wrappers

### ApiResponse<T>
```ts
interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  message?: string;
}
```

### Pagination<T>
```ts
interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
```

---

## ✨ Gợi ý tổ chức trong code

```
src/app/core/models/
  user.ts
  ticket.ts
  comment.ts
  history.ts
  api.ts
```

---

## 🧠 Tips
- Dùng `DatePipe` để format thời gian (hoặc `dayjs` nếu cần).
- Với các enum, nên định nghĩa TypeScript union type (string literal).
- Nếu backend thay đổi field name → chỉ cần sửa ở model này, FE còn lại không cần chỉnh.

---
