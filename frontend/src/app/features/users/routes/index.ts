import { Routes } from '@angular/router';

export const USERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../list/users-list.component').then(m => m.UsersListComponent)
  },
  {
    path: 'form/new',
    loadComponent: () =>
      import('../form/user-form.component').then(m => m.UserFormComponent)
  },
  {
    path: 'form/:id',
    loadComponent: () =>
      import('../form/user-form.component').then(m => m.UserFormComponent)
  }
];
