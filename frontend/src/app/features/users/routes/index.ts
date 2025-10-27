import { Routes } from '@angular/router';

export const USERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../users-placeholder.component').then(m => m.UsersPlaceholderComponent)
  }
];
