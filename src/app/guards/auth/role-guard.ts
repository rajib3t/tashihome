import { isPlatformServer } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
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

    return authService.initializeAuth().pipe(
      map((isAuth) => {
        if (!isAuth) {
          return router.parseUrl('/login');
        }

        const userRole = authService.authUser()?.role?.toLowerCase();
        const normalizedAllowedRoles = allowedRoles.map((role) => role.toLowerCase());

        console.log('RoleGuard check - User role:', userRole, 'Allowed roles:', normalizedAllowedRoles);

        if (userRole && normalizedAllowedRoles.includes(userRole)) {
          return true;
        }

        // Redirect based on actual user role if not allowed
        if (userRole === 'admin') {
          return router.parseUrl('/admin');
        } else if (userRole === 'vendor') {
          return router.parseUrl('/profile'); // Fallback for vendors
        } else {
          return router.parseUrl('/profile'); // Default fallback
        }
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
