import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'tickets' },
      {
        path: 'tickets',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/tickets/list/ticket-list.component').then(
                m => m.TicketListComponent
              )
          },
          {
            path: 'create',
            loadComponent: () =>
              import('./features/tickets/create/ticket-create.component').then(
                m => m.TicketCreateComponent
              )
          },
          {
            path: ':id',
            loadComponent: () =>
              import('./features/tickets/detail/ticket-detail.component').then(
                m => m.TicketDetailComponent
              )
          },
          {
            path: ':id/edit',
            loadComponent: () =>
              import('./features/tickets/edit/ticket-edit.component').then(
                m => m.TicketEditComponent
              )
          }
        ]
      },
      {
        path: 'admin/users',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/users/list/users-list.component').then(
            m => m.UsersListComponent
          )
      },
      {
        path: 'admin/departments',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/departments/list/department-list.component').then(
            m => m.DepartmentListComponent
          )
      }
    ]
  },
  { path: '**', redirectTo: '' }
];
