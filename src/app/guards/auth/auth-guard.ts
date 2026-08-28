import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { isPlatformServer } from '@angular/common';
import { map, of } from 'rxjs';
import { AuthService } from '../../services/auth/auth-service';

export const authGuard: CanActivateFn = (route, state) => {
  const platformId = inject(PLATFORM_ID);
  if (isPlatformServer(platformId)) {
    return true;
  }

  const authService = inject(AuthService);
  const router = inject(Router);
  const authCheck$ = authService.authUser() ? of(true) : authService.initializeAuth();

  return authCheck$.pipe(
    map((isAuth) => {
      if (!isAuth) {
        return router.parseUrl('/login');
      }

      const role = authService.authUser()?.role?.toLowerCase();
      if (role === 'admin' && !state.url.startsWith('/admin')) {
        return router.parseUrl('/admin');
      }
      if (role === 'vendor' && !state.url.startsWith('/vendor')) {
        return router.parseUrl('/vendor');
      }
      if (role === 'user' && !state.url.startsWith('/user')) {
        return router.parseUrl('/user');
      }

      return true;
    })
  );
};

/**
 * Guard for guest-only pages (e.g. /login, /register).
 * If the user is already authenticated, redirect them to their role dashboard.
 */
export const guestGuard: CanActivateFn = () => {
  const platformId = inject(PLATFORM_ID);
  if (isPlatformServer(platformId)) {
    return true;
  }

  const authService = inject(AuthService);
  const router = inject(Router);
  const authCheck$ = authService.authUser() ? of(true) : authService.initializeAuth();

  return authCheck$.pipe(
    map((isAuth) => {
      if (!isAuth) {
        return true; // not logged in → allow access to login page
      }

      // Already logged in → redirect to role dashboard
      const role = authService.authUser()?.role?.toLowerCase();
      if (role === 'admin')  return router.parseUrl('/admin');
      if (role === 'vendor') return router.parseUrl('/vendor');
      return router.parseUrl('/user');
    })
  );
};
