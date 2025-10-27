# FE-0B – Admin User Management Test Checklist

## Pre-conditions
- Backend running on `http://localhost:8080` with seed data (`admin/Admin@123`).
- Frontend served via `npm start` (proxy to backend).
- Browser devtools open to watch requests/cookies.

---

## 1. Access Control
1. Login as `agent/Agent@123`.
   - Attempt to navigate to `http://localhost:4200/admin/users`.
   - Expect redirect back to `/tickets` (guard) and no Users menu entry.
2. Logout and login as `admin/Admin@123`.
   - Users menu should appear.
   - Navigating to `/admin/users` loads the user list.

---

## 2. Users List
1. Confirm loading spinner then populated table with seeded users.
2. Filter by role `AGENT` and Active `true` ? only agent accounts remain.
3. Reset filters ? table returns to full list.
4. Use pagination buttons and ensure page number updates.

---

## 3. Create User
1. Click `+ Create`.
2. Fill form (e.g. username `newuser`, email `newuser@example.com`, role `END_USER`).
3. Submit ? expect redirect to list, success message optional, and new user visible.
4. Logout and login as `newuser` to confirm app requests password change (backend behavior).

---

## 4. Update User
1. Back as admin ? open Edit for `newuser`.
2. Change role to `AGENT`, mark inactive, save.
3. Verify table reflects new role/active flags.

---

## 5. Reset Password
1. From list, click `Reset password` for `newuser`.
2. Confirm dialog appears; accept.
3. Success banner shows and list reloads.
4. Attempt login as `newuser` with original password ? should fail (must change password next login).

---

## 6. Error Handling
- Stop backend and trigger list reload ? show error banner.
- Restart backend and retry to ensure recovery.
- Submit form with invalid email ? inline validation error appears.

---

## 7. Regression – Self Change Password
- Login with seeded `alice/Alice@123` and ensure mandatory change modal still works.

---

Document any issues or unexpected responses for follow-up.
