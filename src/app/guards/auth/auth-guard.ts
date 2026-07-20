import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { isPlatformServer } from '@angular/common';
import { AuthService } from '../../services/auth/auth-service';
import { map } from 'rxjs';
export const authGuard: CanActivateFn = (route, state) => {
  const platformId = inject(PLATFORM_ID);
  if (isPlatformServer(platformId)) {
    return true;
  }

  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.initializeAuth().pipe(
    map((isAuth) => {
      if (!isAuth) {
        return router.parseUrl('/login');
      }

      const user = authService.authUser();
      const role = user?.role?.toLowerCase();

      if (role === 'admin' && !state.url.startsWith('/admin')) {
        return router.parseUrl('/admin');
      }
      if (role === 'vendor' && !state.url.startsWith('/vendor')) {
        return router.parseUrl('/vendor');
      }
      if (role === 'user' && !state.url.startsWith('/user')) {
        return router.parseUrl('/user/dashboard');
      }

      return true;
    })
  );
};
