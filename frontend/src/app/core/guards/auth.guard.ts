import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Route Guard kiểm tra authentication trước khi cho phép truy cập
 * Sử dụng trong routing để bảo vệ các pages cần login
 *
 * Cách sử dụng:
 * {
 *   path: 'protected',
 *   canActivate: [authGuard],
 *   component: ProtectedComponent
 * }
 */
export const authGuard: CanActivateFn = async (): Promise<boolean | UrlTree> => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Gọi ensureMe() để lấy user info (từ cache hoặc API)
  const me = await auth.ensureMe();
  if (!me) {
    auth.clearCache();  // Clear cache nếu không có user
    return router.createUrlTree(['/login']);  // Redirect về login page
  }

  return true;  // Cho phép truy cập
};
