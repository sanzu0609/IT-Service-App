import { HttpBackend, HttpClient, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

const CSRF_COOKIE_NAME = 'XSRF-TOKEN';
const CSRF_ENDPOINT = '/api/csrf';
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS', 'TRACE'];

export const csrfInterceptor: HttpInterceptorFn = (request, next) => {
  if (!shouldEnsureCsrf(request)) {
    return next(request);
  }

  if (hasCsrfCookie()) {
    return next(request);
  }

  const httpBackend = inject(HttpBackend);
  const httpClient = new HttpClient(httpBackend);

  return httpClient
    .get(CSRF_ENDPOINT, { withCredentials: true })
    .pipe(
      catchError(() => of(null)),
      switchMap(() => next(request))
    );
};

function shouldEnsureCsrf(request: HttpRequest<unknown>): boolean {
  if (request.url.includes(CSRF_ENDPOINT)) {
    return false;
  }

  return !SAFE_METHODS.includes(request.method.toUpperCase());
}

function hasCsrfCookie(): boolean {
  if (typeof document === 'undefined') {
    return true;
  }

  return document.cookie
    .split(';')
    .map(cookie => cookie.trim())
    .some(cookie => cookie.startsWith(`${CSRF_COOKIE_NAME}=`));
}
