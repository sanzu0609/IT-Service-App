# FE-0.8 – Manual Test Checklist (Auth + CSRF + Guards)

## Pre-conditions
- Backend (`backend/`) running locally on `http://localhost:8080`.
- Frontend (`frontend/`) served via `npm start` so the proxy forwards `/api` calls.
- Browser with devtools open to observe cookies / requests (Chrome recommended).
- Use seeded users from backend `DataSeeder`:
  - `admin` / `Admin@123`
  - `agent` / `Agent@123`
  - `alice` / `Alice@123`

---

## 1. Login Flow
1. Open `http://localhost:4200/login`.
2. Submit empty form.
   - Expect both fields to show validation errors.
3. Submit invalid credentials (e.g. `admin` / `wrong`).
   - Expect error banner `Invalid username or password.` and HTTP 401 response.
4. Submit valid credentials `admin` / `Admin@123`.
   - Expect redirect to `/tickets`.
   - Verify cookies include `JSESSIONID` and `XSRF-TOKEN`.
5. Hard refresh `/tickets`.
   - Guard should keep user on app (still authenticated).

---

## 2. Change Password
1. While logged in as `admin`, navigate to `/change-password`.
2. Submit empty form → expect validation messages.
3. Submit mismatched confirmation.
   - `confirm` field should show “Password confirmation does not match.”
4. Submit correct current password with new strong password (e.g. `Admin@456!`).
   - Expect success toast/message and redirect back to `/tickets`.
   - Verify `AuthService` cache refreshed (calls `/api/auth/me`).
5. Logout and re-login using new password – old password should fail.

---

## 3. Force Change Password Guard
1. Reset a user via backend to require password change (`alice` is seeded with `mustChangePassword=true`).
2. Login with `alice` / `Alice@123`.
   - Expect redirect to `/change-password` immediately.
   - Navigating to `/tickets` manually should bounce back to `/change-password`.
3. Change password successfully and ensure guard allows access afterwards.

---

## 4. Auth Guard / Logout
1. On `/tickets`, click “Logout”.
   - Expect redirect to `/login`.
2. Attempt to hit `/tickets` or `/change-password` directly.
   - Expect redirect back to `/login`.

---

## 5. CSRF Coverage
1. Clear cookies and login again to regenerate CSRF token.
2. Use browser devtools to clear `XSRF-TOKEN` cookie.
3. Trigger a mutating request (e.g. submit change password).
   - CSRF interceptor should call `/api/csrf` automatically.
   - Confirm new `XSRF-TOKEN` cookie gets set and header `X-XSRF-TOKEN` is sent.
4. Remove both cookies and retry; request should redirect to `/login` after 401.

---

## 6. Error Handling / Resilience
- Stop backend and attempt login.
  - Expect network error banner on form (generic error message).
- Restart backend, login, then stop backend before calling change password.
  - Expect change password request to show fallback error message.

---

## 7. Lighthouse / Basic UI sanity
- Run a quick Lighthouse audit (Performance accessible).
- Check responsive layout for header (mobile / desktop).

---

## Notes
- Keep backend logs open to monitor Spring Security for CSRF behaviour.
- For automated follow-up, convert these steps into Playwright/Cypress scenarios in later phases.
