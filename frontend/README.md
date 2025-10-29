# Frontend

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.3.6.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## Admin User Management Testing
1. Login with `admin/Admin@123`.
2. Visit `/admin/users` to verify list, filters, pagination, and role-based guard.
3. Use the `+ Create` modal to add a user, then log in as that user to confirm password-change enforcement.
4. Reopen the modal via `Edit` to update role/active flags, and use the reset-password dialog to issue a temporary password.


## Tickets Module Smoke Test
1. Login as END_USER (e.g., `enduser/EndUser@123`).
   - Navigate to `/tickets` and verify you can view your own tickets.
   - Confirm the **+ Create** button is hidden.
2. Open one of your tickets.
   - Ensure only public comments are visible.
   - Add a comment and verify it appears without the “Internal” badge.
   - Confirm the status change panel is hidden.
3. Login as AGENT (e.g., `agent/Agent@123`).
   - Visit `/tickets` and verify the **+ Create** button is visible.
   - Pick a ticket assigned to you and open detail view.
     - Ensure all comments (including internal) are visible and you can post an internal note.
     - Use the status panel to move the ticket to `IN_PROGRESS` ? `RESOLVED`.
4. Login as ADMIN.
   - Confirm you can see ticket create button, all comments, and full status transitions (e.g., set to `CLOSED`, reopen to `IN_PROGRESS`).
   - Verify SLA badges render with OK/NEAR/BREACHED colours.
5. Negative checks.
   - Attempt to access `/admin/users` as END_USER ? should redirect/deny.
   - Try switching to an invalid ticket id (`/tickets/99999`) ? user-friendly error appears.
