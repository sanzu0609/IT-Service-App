import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { forceChangePasswordGuard } from './core/guards/force-change-password.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'change-password',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/auth/change-password/change-password.component').then(
        m => m.ChangePasswordComponent
      )
  },
  {
    path: '',
    canActivate: [authGuard, forceChangePasswordGuard],
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
        loadComponent: () =>
          import('./features/users/users-placeholder.component').then(
            m => m.UsersPlaceholderComponent
          )
      }
    ]
  },
  { path: '**', redirectTo: '' }
];
