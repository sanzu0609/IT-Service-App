# IT Service Management Application - AI Agent Instructions

## Project Overview
This is a phased ITSM (IT Service Management) mini-clone with **Spring Boot 3.x + Java 21** backend and **Angular 20** frontend. The project implements ticket management, user management, department management, role-based access control (RBAC), and automated SLA tracking.

## Architecture

### Backend (Spring Boot)
- **Structure**: Layered architecture organized by domain (`auth`, `ticket`, `user`, `department`)
- **Package Pattern**: `org.example.backend.domain.<domain>/{entity,repository,service,controller,dto}`
- **DTOs**: Use Java 21 `record` types exclusively (e.g., `CreateUserRequest`, `TicketDetailResponse`)
- **Authentication**: Session-based with CSRF protection (no JWT) - credentials stored in `HttpSession`
- **Security**: 
  - CSRF enabled via `CookieCsrfTokenRepository` - frontend must send `X-XSRF-TOKEN` header
  - Custom `RestAuthenticationEntryPoint` and `RestAccessDeniedHandler` for JSON error responses
  - Role hierarchy: `END_USER` < `AGENT` < `ADMIN`

### Frontend (Angular)
- **Structure**: Feature-based with `core/` (services, guards, interceptors), `features/` (components), `shared/`
- **Routing**: Lazy-loaded feature modules with guards (`authGuard`, `adminGuard`)
- **HTTP**: All requests use `withCredentials: true` for session cookies
- **CSRF**: `auth.interceptor.ts` automatically attaches `X-XSRF-TOKEN` from cookie for non-safe methods

## Key Domain Concepts

### Ticket Workflow
State transitions are strictly validated via `WorkflowValidator`:
- `NEW → IN_PROGRESS` (requires assignee)
- `IN_PROGRESS → {ON_HOLD, RESOLVED}` (requires note for RESOLVED)
- `RESOLVED → {CLOSED, REOPENED}` (reopening resets SLA deadlines)
- Status changes are logged in `TICKET_HISTORY` via `TicketHistoryService`

### SLA Management (Phase 2)
- **Automatic calculation**: Deadlines set based on priority when ticket created/updated
- **Scheduled jobs**: 
  - `SlaScheduler.checkSlaFlags()` - every 15 minutes, updates `slaFlag` (OK→NEAR→BREACHED)
  - `SlaScheduler.autoCloseResolved()` - daily at midnight, closes tickets resolved >7 days ago
- **Configuration**: `app.sla.autoclose.days` in `application.properties`

### Role-Based Access
- **END_USER**: Create/view own tickets, add public comments only
- **AGENT**: All END_USER permissions + view all tickets, change status, add internal comments
- **ADMIN**: All permissions + user/department CRUD, view all data

## Development Workflows

### Running the Backend
```bash
cd backend
./mvnw spring-boot:run
# Database: H2 in-memory (auto-seeded via DataSeeder.java)
# API Base: http://localhost:8080/api
```

### Running the Frontend
```bash
cd frontend
npm start  # Uses proxy.conf.json to forward /api to backend
# App: http://localhost:4200
```

### Testing Backend
- **Unit tests**: Mock services with `@ExtendWith(MockitoExtension.class)` - see `TicketServiceTest`, `SlaServiceTest`
- **Integration tests**: Use `@SpringBootTest` with `MockMvc` - see `AuthControllerIntegrationTest`, `DepartmentControllerIntegrationTest`
- **Run tests**: `./mvnw test` (H2 database auto-configured for tests)

### Data Seeding
`DataSeeder.java` creates demo data on startup:
- Users: `admin/Admin@123`, `agent/Agent@123`, `enduser/EndUser@123`
- Departments: IT, HR, Operations
- Sample tickets with various statuses

## Project-Specific Conventions

### Backend Patterns
1. **Entity constructors**: Protected no-arg for JPA, public constructor for required fields only
2. **Timestamp management**: Use `@PrePersist` and `@PreUpdate` in entities (see `Ticket.java`)
3. **Service separation**: Split services by role (`UserSelfService`, `UserAdminService`) when access rules differ
4. **Validation**: Bean Validation annotations on DTOs (`@NotBlank`, `@Size`, `@Email`)
5. **Error handling**: `GlobalExceptionHandler` with `@RestControllerAdvice` returns consistent error format

### Frontend Patterns
1. **Services**: Injectable services in `core/services/` handle all HTTP calls
2. **Models**: TypeScript interfaces in `core/models/` match backend DTOs
3. **Guards**: Route guards check authentication and role permissions before navigation
4. **Interceptors**: `authInterceptor` handles session cookies and CSRF tokens globally

### Naming Conventions
- **Backend**: 
  - Entities: singular (e.g., `Ticket`, `User`)
  - Repositories: `<Entity>Repository`
  - Services: `<Entity>Service` or role-specific suffix
  - DTOs: `Create<Entity>Request`, `<Entity>DetailResponse`, `<Entity>SummaryResponse`
- **Frontend**:
  - Components: kebab-case (e.g., `ticket-detail.component.ts`)
  - Services: `<domain>.service.ts`

## Critical Integration Points

### Session + CSRF Flow
1. Frontend calls `POST /api/auth/login` → backend sets `JSESSIONID` + `XSRF-TOKEN` cookies
2. All subsequent requests include `withCredentials: true` to send `JSESSIONID`
3. Non-GET requests auto-attach `X-XSRF-TOKEN` header via interceptor

### Ticket State Changes
When changing ticket status:
1. Controller calls `TicketService.changeStatus()`
2. Service validates transition via `WorkflowValidator`
3. Entity updates status + metadata (e.g., `resolvedAt` for RESOLVED)
4. `TicketHistoryService.recordStatusChange()` creates audit log
5. For `RESOLVED`: `SlaService.evaluateFlag()` may mark as BREACHED if overdue

### Department Assignment
- Users can be assigned to departments via `User.department` (nullable)
- When creating/updating users, `DepartmentService` validates department is active
- Frontend dropdowns use `/api/departments/minimal?active=true` for lightweight lists

## Common Pitfalls

1. **Forgetting CSRF**: Non-GET requests will fail with 403 if `X-XSRF-TOKEN` missing
2. **Session timeout**: Frontend must handle 401 responses and redirect to login
3. **Lazy loading**: Entity relationships use `FetchType.LAZY` - access outside transaction causes exceptions
4. **Workflow validation**: Cannot change ticket status arbitrarily - follow state machine rules
5. **Test isolation**: Integration tests must clean up data or use transactions with rollback

## Phase Documentation
Each phase has detailed specs in `/backend/spec/Phases/` (e.g., `Phase-1-Ticket-v1.2.md`). Reference these for:
- API contracts with request/response examples
- Validation rules and business logic
- Database schema changes
- Testing checklists

## Quick Reference Files
- Security config: `backend/src/main/java/org/example/backend/config/SecurityConfig.java`
- Main entity: `backend/src/main/java/org/example/backend/domain/ticket/entity/Ticket.java`
- Workflow rules: `backend/src/main/java/org/example/backend/domain/ticket/service/WorkflowValidator.java`
- SLA scheduler: `backend/src/main/java/org/example/backend/domain/ticket/service/SlaScheduler.java`
- Frontend routing: `frontend/src/app/app.routes.ts`
- Auth interceptor: `frontend/src/app/core/interceptors/auth.interceptor.ts`
