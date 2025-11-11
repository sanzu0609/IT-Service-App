import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

// Các endpoint không cần xử lý 401 (vì chúng tự handle)
const LOGIN_ENDPOINTS = ['/auth/login'];

// Các HTTP methods an toàn (không cần CSRF token)
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'TRACE']);

/**
 * HTTP Interceptor tự động xử lý authentication cho mọi request
 * - Tự động gửi credentials (cookies) với mọi request
 * - Tự động đính kèm CSRF token cho non-safe methods
 * - Xử lý 401 errors và redirect về login
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  // 1. Clone request và thêm withCredentials (gửi cookies)
  let authRequest = request.clone({ withCredentials: true });

  // 2. Tự động đính kèm CSRF token cho non-safe methods
  // Chỉ cần nếu header chưa có X-XSRF-TOKEN
  if (!SAFE_METHODS.has(request.method.toUpperCase()) && !request.headers.has('X-XSRF-TOKEN')) {
    const token = readCookie('XSRF-TOKEN');
    if (token) {
      authRequest = authRequest.clone({
        setHeaders: {
          'X-XSRF-TOKEN': token  // Backend expect header này
        }
      });
    }
  }

  // 3. Xử lý response và catch 401 errors
  return next(authRequest).pipe(
    catchError(error => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        // Không redirect nếu là login call (để component tự handle)
        const isLoginCall = LOGIN_ENDPOINTS.some(endpoint => request.url.includes(endpoint));
        if (!isLoginCall) {
          authService.clearCache();  // Clear cache khi session expired
          if (router.url !== '/login') {
            router.navigateByUrl('/login');  // Redirect về login page
          }
        }
      }
      return throwError(() => error);
    })
  );
};

/**
 * Helper function đọc cookie từ document.cookie
 * @param name tên cookie cần đọc
 * @returns giá trị cookie hoặc null nếu không tìm thấy
 */
function readCookie(name: string): string | null {
  if (typeof document === 'undefined') {
    return null; // SSR safe
  }
  const prefix = `${name}=`;
  const cookie = document.cookie
    .split(';')
    .map(part => part.trim())
    .find(part => part.startsWith(prefix));
  return cookie ? decodeURIComponent(cookie.substring(prefix.length)) : null;
}
