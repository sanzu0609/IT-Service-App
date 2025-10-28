# ✅ Phase: Department Management (Backend Only)
**Version:** v1.2  
**Depends on:** Auth, User Management  
**Tech Stack:** Java 21 • Spring Boot 3.x • Spring Data JPA • PostgreSQL • Flyway • JUnit + MockMvc  

---

## 🎯 Goal
Thêm module **Department Management** (ADMIN-only), chuẩn hoá quan hệ **User → Department (N:1)**, và mở rộng API `/auth/me` + `/users` để hiển thị thông tin phòng ban.

---

## ⚙️ Workflow Checklist

### 1️⃣ Setup ERD + Migration
- [ ] Tạo bảng `departments`  
- [ ] Thêm cột `department_id` vào `users`  
- [ ] Thêm indexes: `idx_users_department_id`, `idx_departments_active`  
- [ ] Seed dữ liệu mẫu (IT, HR)  
🧾 *Output:* `Vxxx__departments.sql` chạy thành công qua Flyway.

---

### 2️⃣ Entity & Repository
- [ ] Tạo `Department` entity (fields, constraints)  
- [ ] Tạo `DepartmentRepository extends JpaRepository`  
- [ ] Thêm query helper:  
  - `findByActiveTrue()`  
  - `findByCodeIgnoreCase(String code)`  
🧾 *Output:* Entity + repository compile OK.

---

### 3️⃣ DTOs
Tạo các file:
- `DepartmentLiteDto.java`  
- `DepartmentDto.java`  
- `CreateDepartmentRequest.java`  
- `UpdateDepartmentRequest.java`  

🧩 Rule:
- `code` luôn uppercase trước khi lưu  
- `name` và `code` phải unique  
- `active` mặc định `true`

---

### 4️⃣ DepartmentService
- [ ] `create()` – kiểm tra trùng code/name  
- [ ] `update()` – validate unique  
- [ ] `deactivate()` – set active=false, kiểm tra ràng buộc  
- [ ] `search(q, active, pageable)` – filter linh hoạt  
- [ ] `minimal(active)` – trả list `{id, code, name}`  
🧾 *Test:* Unit test ≥70% coverage.

---

### 5️⃣ DepartmentController
Endpoints:
| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/departments` | ADMIN | list/filter/pagination |
| GET | `/departments/{id}` | ADMIN | detail |
| POST | `/departments` | ADMIN | create |
| PATCH | `/departments/{id}` | ADMIN | update/deactivate |
| GET | `/departments/minimal` | ALL | list active depts |

✅ *Rule:*  
- ADMIN-only cho write  
- All roles được đọc `/minimal`  
- Validate qua `@Valid` + `@ControllerAdvice`

---

### 6️⃣ User Integration
- [ ] `User` entity: thêm `@ManyToOne Department`  
- [ ] `UserDto`: thêm trường `DepartmentLiteDto department`  
- [ ] `CreateUserRequest` / `UpdateUserRequest`: thêm `departmentId`  
- [ ] `UserMapper`: map entity ↔ dto  
- [ ] `UserService`: validate department khi create/update  
  - Nếu inactive / không tồn tại → `400 Bad Request`

🧩 *Response `/auth/me` & `/users/{id}`:*
```json
{
  "id": 10,
  "username": "alice",
  "department": { "id": 2, "code": "HR", "name": "Human Resources" }
}
```

---

### 7️⃣ Test Plan
**Unit Tests**
- DepartmentService: create/update/deactivate  
- UserService: set/unset department, reject invalid dept  

**Integration Tests**
- DepartmentController CRUD  
- `/auth/me` & `/users` trả `department` object đúng.  

**Coverage Target:** ≥70% backend services.

---

### 8️⃣ Docs & Postman
- [ ] Cập nhật README  
- [ ] Cập nhật `PHASE-Dept-Management.md`  
- [ ] Thêm các request mẫu vào Postman collection:
  - Create department  
  - Get minimal  
  - Assign user → department  

🧾 *Output:* file `PHASE-Dept-Management.md` cập nhật + import được vào Postman.

---

## ✅ Acceptance Criteria
- [ ] Bảng `departments` + FK `users.department_id` tồn tại.  
- [ ] ADMIN CRUD được departments.  
- [ ] `/departments/minimal?active=true` hoạt động cho mọi role.  
- [ ] `/auth/me` & `/users/{id}` trả `department` object.  
- [ ] User create/update với dept inactive → 400.  
- [ ] Unit + Integration tests pass ≥70%.  
- [ ] Docs và Postman cập nhật đầy đủ.

---

## ⏱ Estimate
| Task | Time |
|------|------|
| Migration + Entity | 0.5d |
| Service + Controller | 0.5d |
| User Integration | 0.5d |
| Testing + Docs | 0.5d |
| **Total** | **~2 days** |

---

> 💡 **Tips:**  
> - Code logic xử lý `departmentId` trong UserService trước, rồi mới làm DepartmentController.  
> - Cho phép “seed department” tự động trong profile `dev`.  
> - Giữ backward compatibility nếu FE chưa cập nhật (trả `departmentId` tạm thời).

---

**End of Phase – Backend Department Management**
