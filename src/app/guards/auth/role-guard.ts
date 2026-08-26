import { isPlatformServer } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, of } from 'rxjs';
import { AuthService } from '../../services/auth/auth-service';
import { UserRole } from '../../services/user/user.model';

export const roleGuard = (allowedRoles: UserRole[]): CanActivateFn => {
  return () => {
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

        const userRole = authService.authUser()?.role?.toLowerCase();
        if (userRole && allowedRoles.map((role) => role.toLowerCase()).includes(userRole)) {
          return true;
        }

        if (userRole === 'admin') {
          return router.parseUrl('/admin');
        }
        if (userRole === 'vendor') {
          return router.parseUrl('/vendor');
        }
        return router.parseUrl('/user');
      })
    );
  };
};

export const adminGuard: CanActivateFn = roleGuard(['admin']);
export const vendorGuard: CanActivateFn = roleGuard(['vendor']);
export const userGuard: CanActivateFn = roleGuard(['user']);

// More permissive guard for profile - allows user and vendor
export const profileGuard: CanActivateFn = (route, state) => {
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

      const userRole = authService.authUser()?.role?.toLowerCase();
      console.log('ProfileGuard check - User role:', userRole);

      // Allow both users and vendors to access profile
      if (userRole === 'user' || userRole === 'vendor') {
        return true;
      }

      // Admin should go to admin dashboard
      if (userRole === 'admin') {
        return router.parseUrl('/admin');
      }

      return router.parseUrl('/login');
    })
  );
};
