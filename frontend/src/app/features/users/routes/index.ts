import { Routes } from '@angular/router';

export const USERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../list/users-list.component').then(m => m.UsersListComponent)
  }
];
