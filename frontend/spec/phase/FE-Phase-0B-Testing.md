# FE-0B – Admin User Management Test Checklist

## Pre-conditions
- Backend running on `http://localhost:8080` with seed data (`admin/Admin@123`).
- Frontend served via `npm start` (proxy to backend).
- Browser devtools open to watch requests/cookies.

---

## 1. Access Control
1. Login as `agent/Agent@123`.
   - Attempt `http://localhost:4200/admin/users` ? redirected to `/tickets`, Users menu hidden.
2. Logout and login as `admin/Admin@123`.
   - Users menu visible and `/admin/users` loads.

---

## 2. Users List
1. Observe loading spinner then table data.
2. Apply filters (role `AGENT`, Active `true`), verify results.
3. Reset filters ? table returns to full list.
4. Exercise pagination buttons.

---

## 3. Create User (Modal)
1. Click `+ Create` ? modal opens.
2. Fill form (username `newuser`, email `newuser@test.com`, role `END_USER`).
3. Save ? modal closes, success banner shows, list refreshes with new user.
4. Logout and attempt login as `newuser` to confirm password-change enforcement.

---

## 4. Update User (Modal)
1. As admin, on the list click `Edit` for `newuser`.
2. Modal shows existing values; change role to `AGENT`, toggle Active off, save.
3. List updates to reflect changes.

---

## 5. Reset Password
1. Click `Reset password` action for `newuser`.
2. Confirm dialog appears; accept.
3. Success banner appears, list reloads.
4. Try login with previous password ? should fail (must change password).

---

## 6. Error Handling
- Stop backend and reload list ? error banner appears.
- Restart backend; reload list recovers.
- Open create modal, submit with invalid email ? inline validation message.

---

## 7. Regression – Self Change Password
- Login as `alice/Alice@123`; ensure forced change modal still works.

Document any unexpected behaviour for follow-up.
