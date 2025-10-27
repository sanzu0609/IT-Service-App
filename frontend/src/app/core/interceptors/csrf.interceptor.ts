import { HttpBackend, HttpClient, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

const CSRF_COOKIE_NAME = 'XSRF-TOKEN';
const CSRF_HEADER_NAME = 'X-XSRF-TOKEN';
const CSRF_ENDPOINT = '/api/csrf';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'TRACE']);

export const csrfInterceptor: HttpInterceptorFn = (request, next) => {
  if (shouldBypass(request)) {
    return next(request);
  }

  if (request.headers.has(CSRF_HEADER_NAME)) {
    return next(request);
  }

  const cookieToken = readCsrfCookie();
  if (cookieToken) {
    const withHeader = attachHeader(request, cookieToken);
    return next(withHeader);
  }

  const httpBackend = inject(HttpBackend);
  const httpClient = new HttpClient(httpBackend);

  return httpClient.get(CSRF_ENDPOINT, { withCredentials: true }).pipe(
    catchError(() => of(null)),
    switchMap(() => {
      const token = readCsrfCookie();
      const withHeader = token ? attachHeader(request, token) : request;
      return next(withHeader);
    })
  );
};

function shouldBypass(request: HttpRequest<unknown>): boolean {
  if (request.url.includes(CSRF_ENDPOINT)) {
    return true;
  }
  return SAFE_METHODS.has(request.method.toUpperCase());
}

function readCsrfCookie(): string | null {
  if (typeof document === 'undefined') {
    return null;
  }
  const prefix = `${CSRF_COOKIE_NAME}=`;
  const cookie = document.cookie
    .split(';')
    .map(part => part.trim())
    .find(part => part.startsWith(prefix));
  return cookie ? decodeURIComponent(cookie.substring(prefix.length)) : null;
}

function attachHeader(request: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  if (!token) {
    return request;
  }
  return request.clone({
    setHeaders: {
      [CSRF_HEADER_NAME]: token
    }
  });
}
