# 🏢 Phase — Department Management (Backend Only)
**Scope:** Spring Boot backend (Session-based auth).  
**Goal:** Thêm quản trị **Department** và chuẩn hoá quan hệ **User → Department (N:1)**. Response trả **department object** thay vì chỉ `departmentId`. Không thay đổi frontend trong phase này.

---

## 1) Phạm vi & Mục tiêu
- Bổ sung bảng **`departments`** + CRUD (ADMIN-only).
- Chuẩn hoá `users.department_id` (nullable, FK).
- API **User/Me** trả `department: { id, code, name }` (không chỉ id).
- Cho phép Admin set/unset `departmentId` khi tạo/sửa User.
- Tương thích ngược: nếu cần, vẫn có thể trả thêm `departmentId` (deprecated) trong v1.2, xoá ở v1.3.

---

## 2) ERD (Delta)
### Bảng mới: `departments`
- `id` (PK, bigint, identity)
- `code` (varchar(32), **unique**, UPPERCASE)
- `name` (varchar(128), **unique**, NOT NULL)
- `description` (varchar(512), NULL)
- `active` (boolean, default true)
- `created_at` (timestamp, default now)
- `updated_at` (timestamp, auto-update)

**Indexes & Constraints**
- `uk_departments_code`
- `uk_departments_name`
- `idx_departments_active` (optional)

### Sửa bảng `users`
- Thêm `department_id` (bigint, FK → `departments.id`, **on delete set null**)
- Index: `idx_users_department_id`

> Không bắt buộc sửa `tickets`. (Optional phase sau: filter ticket theo phòng ban).

---

## 3) API Design
### 3.1 Department Admin APIs (ADMIN)
- `GET /departments?q&active&page&size&sort`
  - Tìm theo `q` (code/name ILIKE), filter `active`
- `GET /departments/{id}`
- `POST /departments` → 201  
  Body: `{ code, name, description?, active? }`
- `PATCH /departments/{id}` → 200  
  Body: `{ code?, name?, description?, active? }`
- `DELETE /departments/{id}` (**tuỳ chọn**; khuyến nghị chỉ deactivate bằng `active=false`)

### 3.2 Shared (mọi role)
- `GET /departments/minimal?active=true` → list `{ id, code, name }` cho dropdown/lookup.

### 3.3 Sửa APIs liên quan User
- `GET /auth/me`, `GET /users/{id}`  
  ```json
  {
    "id": 10,
    "username": "alice",
    "email": "a@x.com",
    "role": "END_USER",
    "active": true,
    "mustChangePassword": false,
    "department": { "id": 2, "code": "HR", "name": "Human Resources" },
    "createdAt": "2025-10-26T15:20:12Z"
  }
  ```
- `POST /users`, `PATCH /users/{id}`
  - Nhận `departmentId?: number | null` (null để gỡ liên kết).
  - Reject nếu `departmentId` không tồn tại hoặc `active=false`.

---

## 4) DTOs & Mapping
### Read
```java
record DepartmentLiteDto(Long id, String code, String name) {}
record DepartmentDto(Long id, String code, String name, String description, Boolean active,
                     Instant createdAt, Instant updatedAt) {}

record UserDto(Long id, String username, String email, String role, Boolean active,
               Boolean mustChangePassword, DepartmentLiteDto department, Instant createdAt) {}
```

### Write
```java
record CreateDepartmentRequest(String code, String name, String description, Boolean active) {}
record UpdateDepartmentRequest(String code, String name, String description, Boolean active) {}

record CreateUserRequest(String username, String email, String password, String role,
                         Long departmentId, Boolean active) {}
record UpdateUserRequest(String email, String role, Long departmentId, Boolean active) {}
```

**Mapper rules:**
- `user.getDepartment()` → `DepartmentLiteDto` (id, code, name).  
- Khi nhận `departmentId`:
  - Nếu null → `user.setDepartment(null)`.
  - Nếu !null → load Department; nếu không tồn tại/inactive → `400 Bad Request`.

---

## 5) Validation & Business Rules
- `Department.code`: `^[A-Z0-9_-]{2,32}$` (convert UPPERCASE trước khi lưu), **unique**.
- `Department.name`: độ dài 2..128, **unique**.
- Deactivate (`active=false`):
  - Vẫn giữ liên kết cho users hiện tại (an toàn history).  
  - Không cho set `departmentId` tới dept inactive (400).
- (Optional) Không cho deactivate nếu còn `users.active=true` đang trỏ vào dept → trả `409 Conflict`.

---

## 6) RBAC
- ADMIN: full CRUD Departments; set/unset department cho user.
- AGENT/END_USER: chỉ đọc `GET /departments/minimal?active=true` (nếu cần). Không có quyền write.

---

## 7) Migration Plan (Flyway/Liquibase)
1. `Vxxx__create_departments.sql`
   ```sql
   create table departments (
     id bigserial primary key,
     code varchar(32) not null unique,
     name varchar(128) not null unique,
     description varchar(512),
     active boolean not null default true,
     created_at timestamp not null default now(),
     updated_at timestamp not null default now()
   );
   create index idx_departments_active on departments(active);
   ```
2. `Vxxx__alter_users_add_department_fk.sql`
   ```sql
   alter table users add column department_id bigint null;
   alter table users add constraint fk_users_department
     foreign key (department_id) references departments(id) on delete set null;
   create index idx_users_department_id on users(department_id);
   ```
3. `Vxxx__seed_departments.sql` (dev profile)
   ```sql
   insert into departments(code,name,description) values ('IT','Information Technology','Tech team');
   insert into departments(code,name,description) values ('HR','Human Resources','People team');
   ```

---

## 8) Service Layer (thiết kế)
- `DepartmentService`
  - `Page<Department> search(q, active, pageable)`
  - `Department create(...)` (uppercase code, unique checks)
  - `Department update(id, ...)`
  - `void deleteOrDeactivate(id)` (tuỳ chính sách)
  - `List<DepartmentLiteDto> minimal(active)`
- `UserService`
  - `createUser(req)` / `updateUser(id, req)` xử lý `departmentId`
  - Thêm guard khi `departmentId` inactive → 400.

---

## 9) Ảnh hưởng tới endpoints hiện có
- `/auth/me`, `/users/{id}`: bổ sung trường `department` (object).  
- `/users` (list): cân nhắc thêm filter `departmentId` (optional).  
- Tài liệu README & Postman collection phải cập nhật.

---

## 10) Seed (demo accounts)
- Departments: `IT`, `HR`.
- Users sample:
  - `admin` → dept `IT`
  - `agent` → dept `IT`
  - `alice` → dept `HR`

---

## 11) Test Plan
### Unit
- `DepartmentService`:
  - Create (unique code/name), Patch (đổi code/name), Deactivate rule.
- `UserService`:
  - Set/unset `departmentId` hợp lệ.
  - Reject inactive/unknown dept.
  - Mapping `User → UserDto.department`.

### Integration (MockMvc/H2)
- `POST /departments` → 201; duplicate `code/name` → 409.
- `PATCH /departments/{id}` set `active=false` → 200; `GET /departments?active=true` không trả dept inactive.
- `GET /departments/minimal?active=true` trả `{id, code, name}`.
- `POST /users` với `departmentId` hợp lệ → 201; inactive/non-existent → 400.
- `GET /auth/me` trả `department` object.

### E2E (thủ công)
- Admin tạo dept mới → gán cho user → `/auth/me` hiển thị tên dept.
- Deactivate dept → không thể gán dept đó cho user mới.

---

## 12) Acceptance Criteria
- [ ] Bảng `departments` + FK `users.department_id` + indexes.
- [ ] Admin CRUD `departments`; deactivate an toàn.
- [ ] `GET /departments/minimal?active=true` hoạt động.
- [ ] `POST/PATCH /users` nhận `departmentId`; reject inactive/non-existent.
- [ ] `/auth/me` & `/users/{id}` trả `department {id, code, name}`.
- [ ] Tests (unit + integration) green (≥70% coverage service mới).
- [ ] README + Postman collection cập nhật.

---

## 13) Issues (copy lên GitHub)
- **DEP-1** ERD & Migration Departments  
  *AC*: Bảng mới + FK, seed IT/HR (dev). — *Estimate*: 0.5d
- **DEP-2** Department APIs (Admin)  
  *AC*: List/get/create/patch/(delete?), minimal; RBAC. — *Estimate*: 1d
- **DEP-3** User ↔ Department Integration  
  *AC*: User create/update nhận `departmentId`; response trả `department`. — *Estimate*: 0.5d
- **DEP-4** DTO/Mapper Refactor & Docs  
  *AC*: Thêm `DepartmentLiteDto`, README/Postman update. — *Estimate*: 0.25d
- **DEP-5** Tests (Unit + Integration)  
  *AC*: Cases chính & méo; coverage đạt yêu cầu. — *Estimate*: 0.5d
- **(Optional) DEP-6** Ticket filter by department  
  *AC*: Query `departmentId` cho `/tickets`. — *Estimate*: 0.25d

---

## 14) cURL mẫu (dev)

**Tài liệu & Postman**
- README quick guide: `README.md`
- Collection: `postman/DepartmentManagement.postman_collection.json` (sử dụng biến `baseUrl`)

```bash
# Tạo Department (ADMIN)
curl -X POST http://localhost:8080/api/departments   -H "Content-Type: application/json"   -b cookies.txt   -d '{"code":"OPS","name":"Operations","description":"Ops team"}'

# Lấy minimal (mọi role)
curl http://localhost:8080/api/departments/minimal?active=true -b cookies.txt

# Gán department cho user
curl -X PATCH http://localhost:8080/api/users/42   -H "Content-Type: application/json"   -b cookies.txt   -d '{"departmentId": 1}'
```

---

## 15) Ghi chú triển khai
- Convert `code` sang **UPPERCASE** ở service trước khi lưu.
- Unique constraint trả về lỗi 409 (Conflict) với message rõ ràng.
- Nếu đang hỗ trợ client cũ: tạm trả thêm `departmentId` trong `UserDto` (deprecated) và note xoá ở v1.3.
- Đảm bảo CORS/CSRF vẫn như cũ; endpoints mới tuân thủ session-based auth.

---

**Kết thúc Phase**: Khi tất cả Acceptance Criteria thoả, merge vào `main` và gắn **tag v1.2** (hoặc theo versioning của dự án).
