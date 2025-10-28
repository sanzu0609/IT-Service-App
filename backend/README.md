## IT Service App – Department Management Notes

This backend exposes REST APIs for managing departments and linking them to users.  
All endpoints are session-based (`/api/auth/login`), expect JSON, and require CSRF tokens when used from a browser client.

### New / Updated Resources

| Method | Path | Role | Notes |
| ------ | ---- | ---- | ----- |
| POST | `/api/departments` | ADMIN | Create department (`code` uppercased automatically). |
| GET | `/api/departments` | ADMIN | Search & paginate (`q`, `active`, `page`, `size`, `sort`). |
| GET | `/api/departments/{id}` | ADMIN | Fetch full department payload. |
| PATCH | `/api/departments/{id}` | ADMIN | Partial update (toggle `active`, rename, etc.). |
| GET | `/api/departments/minimal` | Any authenticated | Lightweight listing for dropdowns (`active=true` by default). |
| POST | `/api/users` | ADMIN | Accepts optional `departmentId`; rejects inactive / missing departments. |
| PATCH | `/api/users/{id}` | ADMIN | Supports `departmentId` updates and `clearDepartment=true`. |
| GET | `/api/auth/me` | Any authenticated | Returns `department` object alongside legacy `departmentId` (deprecated). |

### Payload Cheatsheet

**Create Department**
```json
{
  "code": "OPS",
  "name": "Operations",
  "description": "Ops team",
  "active": true
}
```

**Patch User – assign to department 3**
```json
{
  "departmentId": 3
}
```

**Patch User – clear department**
```json
{
  "clearDepartment": true
}
```

### Response Fields

`department` objects follow:
```json
{
  "id": 3,
  "code": "OPS",
  "name": "Operations"
}
```

`/api/auth/me` and user detail/summary responses still include a deprecated `departmentId` field for backward compatibility; it will be removed in v1.3.

### Postman

Import `postman/DepartmentManagement.postman_collection.json` for ready-to-run requests (login, department CRUD, user assignment). Set the `baseUrl` collection variable to your API root (e.g., `http://localhost:8080/api`). Sessions rely on cookies, so use the Postman cookie jar or add an interceptor when exercising the authenticated requests.

