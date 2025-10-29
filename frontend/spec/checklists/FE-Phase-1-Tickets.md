# FE Phase 1 – Tickets Module Checklist

## Prerequisites
- Backend running with sample data and accounts:
  - `admin/Admin@123`
  - `agent/Agent@123`
  - `enduser/EndUser@123`
- Frontend served via `ng serve` with proxy to backend.

## 1. Authentication & Guards
- [ ] Login as END_USER → redirected to `/tickets` by default.
- [ ] Attempt `/admin/users` and `/admin/departments` as END_USER → denied or redirected.
- [ ] Login as AGENT and ADMIN → menu entries Tickets/Users/Departments respect role visibility.

## 2. Ticket List (FE-1.2)
- [ ] Filters status & priority change request payload and reload results.
- [ ] Pagination (Next/Previous + page size) works and preserves filters.
- [ ] SLA badge colours match OK/NEAR/BREACHED mapping.
- [ ] `+ Create` button appears only for AGENT/ADMIN.

## 3. Ticket Detail (FE-1.2/1.3/1.4)
- [ ] Ticket metadata (subject, description, reporter, assignee, timestamps) renders.
- [ ] END_USER sees only public comments; AGENT/ADMIN see all comments.
- [ ] Comment form:
  - [ ] Validates required content.
  - [ ] END_USER comment posts as public; AGENT/ADMIN can toggle `Internal` flag.
  - [ ] Newly added comment appears immediately without page refresh.
- [ ] Status panel visibility:
  - [ ] Hidden for END_USER.
  - [ ] AGENT sees transitions limited to `IN_PROGRESS`/`RESOLVED`.
  - [ ] ADMIN sees full transition set per spec.
- [ ] Submitting status change updates chip and persists note when provided.

## 4. Error Handling
- [ ] Invalid ticket id (`/tickets/99999`) shows friendly error.
- [ ] Failed comment submit (simulate network error) shows toast/error message and keeps form values.
- [ ] Failed status update surfaces error banner; previous value remains selected.

## 5. Regression Checks
- [ ] Global toast container still visible in layout.
- [ ] Change-password modal flow unaffected.
- [ ] Users/Departments admin sections still guard properly.

## 6. Optional / Future Work
- [ ] Implement ticket creation form (FE-1 optional).
- [ ] Integrate file attachments for comments (Phase 2?).
- [ ] Add e2e tests for multi-role scenarios.
