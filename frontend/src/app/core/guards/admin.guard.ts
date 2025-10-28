import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

export const adminGuard: CanActivateFn = async (): Promise<boolean | UrlTree> => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);

  const me = await auth.ensureMe();

  if (!me) {
    auth.clearCache();
    return router.createUrlTree(['/login']);
  }

  if (me.role !== 'ADMIN') {
    toast.error('Bạn không có quyền truy cập trang này.');
    return router.createUrlTree(['/tickets']);
  }

  return true;
};
