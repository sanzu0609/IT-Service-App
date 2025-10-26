import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

const LOGIN_ENDPOINTS = ['/auth/login'];

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  const authRequest = request.clone({ withCredentials: true });

  return next(authRequest).pipe(
    catchError(error => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        const isLoginCall = LOGIN_ENDPOINTS.some(endpoint => request.url.includes(endpoint));
        if (!isLoginCall) {
          authService.clearCache();
          if (router.url !== '/login') {
            router.navigateByUrl('/login');
          }
        }
      }
      return throwError(() => error);
    })
  );
};
