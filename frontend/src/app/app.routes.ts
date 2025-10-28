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
        loadComponent: () =>
          import('./features/tickets/tickets-placeholder.component').then(
            m => m.TicketsPlaceholderComponent
          )
      },
      {
        path: 'admin/users',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/users/users-placeholder.component').then(
            m => m.UsersPlaceholderComponent
          )
      },
      {
        path: 'admin/departments',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/departments/list/department-list.component').then(
            m => m.DepartmentListComponent
          )
      },
      {
        path: 'admin/departments/form/new',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/departments/form/department-form.component').then(
            m => m.DepartmentFormComponent
          )
      },
      {
        path: 'admin/departments/form/:id',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/departments/form/department-form.component').then(
            m => m.DepartmentFormComponent
          )
      }
    ]
  },
  { path: '**', redirectTo: '' }
];
