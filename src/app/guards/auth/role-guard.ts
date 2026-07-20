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

        if (userRole && normalizedAllowedRoles.includes(userRole)) {
          return true;
        }

        return router.parseUrl('/dashboard');
      })
    );
  };
};


export const adminGuard: CanActivateFn = roleGuard(['admin']);
export const vendorGuard: CanActivateFn = roleGuard(['vendor']);
export const userGuard: CanActivateFn = roleGuard(['user']);
