import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const forceChangePasswordGuard: CanActivateFn = async (_, state): Promise<boolean | UrlTree> => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const me = await auth.ensureMe();
  if (!me) {
    auth.clearCache();
    return router.createUrlTree(['/login']);
  }

  if (!me.mustChangePassword) {
    return true;
  }

  const isChangePasswordRoute = state.url.startsWith('/change-password');
  if (!isChangePasswordRoute) {
    return router.createUrlTree(['/change-password']);
  }

  return true;
};
