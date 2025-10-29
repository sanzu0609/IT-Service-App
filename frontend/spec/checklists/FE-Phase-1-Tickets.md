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
- [ ] Filters status/priority/search update URL payload and reload results.
- [ ] Pagination (Next/Previous + page size) works and preserves filters.
- [ ] SLA badge shows chip + dot, tooltip text reflects OK/NEAR/BREACHED.
- [ ] `+ Create` button appears for END_USER and ADMIN only.
- [ ] `Edit`/`Cancel` actions render for ADMIN/AGENT; hidden for END_USER.
- [ ] `Cancel` action disabled while request in flight and hides once ticket is cancelled.

## 3. Ticket Detail (FE-1.2/1.3/1.4)
- [ ] Ticket metadata (subject, description, reporter, assignee, timestamps) renders.
- [ ] END_USER sees only public comments; AGENT/ADMIN see all comments.
- [ ] Comment form:
  - [ ] Hidden behind sign-in message when anonymous.
  - [ ] Validates required content (empty/whitespace blocked, max length).
  - [ ] END_USER comment posts as public; AGENT/ADMIN can toggle `Internal` flag.
  - [ ] Newly added comment appears immediately without page refresh.
- [ ] Status panel visibility:
  - [ ] Hidden for END_USER (no buttons rendered).
  - [ ] AGENT sees transitions limited to `IN_PROGRESS`/`RESOLVED`.
  - [ ] ADMIN sees full transition set per spec.
- [ ] Moving to `ON_HOLD` requires hold reason (validation + toast error on failure).
- [ ] Successful status change shows toast, clears note/hold reason, updates chip.
- [ ] Failure shows error banner and keeps previous selection.

## 4. Ticket Create (FE-1.2b)
- [ ] Accessible for END_USER + ADMIN; form disabled with error for other roles.
- [ ] Category dropdown populated from `/tickets/categories`; blocks submit when unavailable.
- [ ] Validation: subject ≥ 5 chars, description ≥ 10 chars, category required.
- [ ] Submit creates ticket, shows success toast, redirects to detail page.
- [ ] After submit, form resets loading state even on API failure and surfaces error toast.

## 5. Ticket Edit (FE-1.2c)
- [ ] Only ADMIN/AGENT can change priority/assignee/category/asset; inputs disabled otherwise.
- [ ] END_USER can edit own NEW ticket subject/description; read-only once status changes.
- [ ] Category dropdown loads for privileged roles; shows error toast when fetch fails.
- [ ] Submit with no changes shows “No changes to save” toast.
- [ ] Successful update redirects to detail with success toast; validation trims whitespace.
- [ ] Cancel ticket CTA visible for ADMIN/AGENT (plus reporter if NEW) and calls status `CANCELLED`.

## 6. Error Handling
- [ ] Invalid ticket id (`/tickets/99999`) shows friendly error.
- [ ] Failed comment submit (simulate network error) shows toast/error message and keeps content.
- [ ] Failed status update surfaces error banner, toast, and retains form values.
- [ ] Create/Edit forms surface backend validation errors via banner/toast without clearing user input.

## 7. Regression Checks
- [ ] Global toast container still visible in layout.
- [ ] Change-password modal flow unaffected.
- [ ] Users/Departments admin sections still guard properly.

## 8. Optional / Future Work
- [ ] Bulk ticket actions (selection + mass status update).
- [ ] Comment attachments (Phase 2).
- [ ] E2E automation across END_USER / AGENT / ADMIN flows.
