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
        loadChildren: () =>
          import('./features/users/routes').then(m => m.USERS_ROUTES)
      }
    ]
  },
  { path: '**', redirectTo: '' }
];
