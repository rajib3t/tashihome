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

      // Don't interfere with programmatic navigation after login
      // Only protect against unauthorized access
      if (state.url.startsWith('/admin') && role !== 'admin') {
        return router.parseUrl('/profile');
      }

      return true;
    })
  );
};
