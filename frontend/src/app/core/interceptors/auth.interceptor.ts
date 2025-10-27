import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

const LOGIN_ENDPOINTS = ['/auth/login'];
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'TRACE']);

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  let authRequest = request.clone({ withCredentials: true });

  if (!SAFE_METHODS.has(request.method.toUpperCase()) && !request.headers.has('X-XSRF-TOKEN')) {
    const token = readCookie('XSRF-TOKEN');
    if (token) {
      authRequest = authRequest.clone({
        setHeaders: {
          'X-XSRF-TOKEN': token
        }
      });
    }
  }

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

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') {
    return null;
  }
  const prefix = `${name}=`;
  const cookie = document.cookie
    .split(';')
    .map(part => part.trim())
    .find(part => part.startsWith(prefix));
  return cookie ? decodeURIComponent(cookie.substring(prefix.length)) : null;
}
