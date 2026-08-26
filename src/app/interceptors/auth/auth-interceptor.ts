import { inject } from '@angular/core';
import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn
} from '@angular/common/http';
import { throwError } from 'rxjs';
import { JwtHelperService } from '@auth0/angular-jwt';
import { catchError, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth/auth-service';

const jwtHelper = new JwtHelperService();

// Helper function to get appropriate error message
const getErrorMessage = (error: any): string => {
  const serverMessage = error.error?.detail?.message || error.error?.message;

  if (error.status === 0) {
    return 'Network error. Please check your connection.';
  } else if (error.status >= 500) {
    return serverMessage || 'Server error. Please try again later.';
  } else if (error.status === 404) {
    return serverMessage || 'Resource not found.';
  } else if (error.status === 403) {
    return serverMessage || 'Access denied.';
  } else if (error.status === 413) {
    return serverMessage || 'Uploaded file is too large. Please choose a smaller file.';
  } else if (error.status === 400 || error.status === 406) {
    // For client errors, preserve the server message
    return serverMessage || 'Bad request.';
  } else if (error.status === 409) {
    return serverMessage || 'Conflict error. Resource already exists.';
  } else if (error.status === 429) {
    return serverMessage || 'Too many requests. Please try again later.';
  } else if (error.status === 422) {
    // Handled separately below for field errors; keep a generic fallback
    return serverMessage || 'Validation error. Please check your input.';
  } else {
    return serverMessage || 'An error occurred. Please try again.';
  }
};

const extractAccessToken = (response: any): string | null => {
  return (
    response?.data?.token?.access_token ??
    response?.data?.token?.token ??
    response?.data?.token ??
    null
  );
};

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<any>, next: HttpHandlerFn) => {
  // Inject HttpClient directly to avoid circular dependency with ApiService
  const authService = inject(AuthService);

  // Don't modify headers for authentication endpoints
 if (
  req.url.includes('auth/login') || 
  req.url.includes('auth/refresh') || 
  req.url.includes('auth/register') || 
  req.url.includes('auth/forgot-password') || 
  req.url.includes('auth/reset-password') || 
  req.url.includes('auth/check-reset-password-token') ||
  req.url.includes('auth/verify-email') || 
  req.url.includes('auth/check-active-account') ||
  req.url.includes('auth/activate-account') ||
  req.url.includes('settings/fetch') ||
  req.url.includes('/public/') // Matches any URL containing /public/
) {
  console.log('AuthInterceptor: Skipping auth endpoints');
  const headers = req.headers
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

    const modifiedReq = req.clone({ headers });
    return next(modifiedReq);
  }



  // Determine if this is a protected request (check BEFORE modifying headers)
  const isProtected = req.headers.has('X-Is-Protected') ||
    req.url.includes('/protected') ||
    req.url.includes('api/') ||
    req.method !== 'GET'; // Protect all non-GET requests by default

  // Set basic headers for all requests, preserving existing ones
  let headers = req.headers
    .set('Accept', 'application/json');

  // Only set Content-Type to application/json if not FormData
  if (!(req.body instanceof FormData)) {
    headers = headers.set('Content-Type', 'application/json');
  }

  if (isProtected) {
    const token = authService.getToken();


    if (!token) {
      console.log("AuthInterceptor: No token found for protected request; returning 401 immediately");
      return throwError(() => ({
        status: 401,
        error: {
          success: false,
          message: 'Authentication token missing. Please log in again.',
          data: null,
          error: 'Authentication required'
        }
      }));
    }

    try {
      const isTokenExpired = jwtHelper.isTokenExpired(token);
      if (isTokenExpired) {

        return authService.refreshToken().pipe(
          switchMap((response) => {
            const newAccessToken = extractAccessToken(response);
            if (!newAccessToken) {
              authService.removeToken();
              return throwError(() => ({ status: 401, error: { success: false, message: 'Session expired. Please log in again.', data: null, error: 'Authentication required' } }));
            }

            authService.setToken(newAccessToken, authService.hasPersistentToken());

            const decodedToken = jwtHelper.decodeToken(newAccessToken);
            if (decodedToken && decodedToken.sub) {
              headers = headers.set('X-User-ID', decodedToken.sub);
            }
            headers = headers.set('Authorization', `Bearer ${newAccessToken}`);
            const refreshedReq = req.clone({ headers });
            return next(refreshedReq);
          }),
          catchError(() => {
            authService.removeToken();
            return throwError(() => ({ status: 401, error: { success: false, message: 'Session expired. Please log in again.', data: null, error: 'Authentication required' } }));
          })
        );
      }

      const decodedToken = jwtHelper.decodeToken(token);

      if (decodedToken && decodedToken.sub) {
        headers = headers.set('X-User-ID', decodedToken.sub);
      }
      headers = headers.set('Authorization', `Bearer ${token}`);
    } catch (error) {
      console.error('AuthInterceptor: Error decoding token for headers:', error);
    }
  }

  const clonedReq = req.clone({ headers });

  return next(clonedReq).pipe(
    catchError(error => {
      console.log("AuthInterceptor: Request failed with status:", error.status);

      // Only clear auth state for true authentication failures.
      if (error.status === 401 && isProtected) {
        console.log("AuthInterceptor: 401 on protected request; clearing session");
        authService.removeToken();
        const standardizedError = {
          status: 401,
          error: {
            success: false,
            message: 'Session expired. Please log in again.',
            data: null,
            error: 'Authentication required'
          }
        };
        return throwError(() => standardizedError);
      }


      if ((error.error?.message === 'Validation failed' && error.status === 422) || (error.error?.message === 'Validation failed' && error.status === 409)) {
        // Parse validation errors and create field-specific error messages
        const validationErrors: { [key: string]: string } = {};

        if (error.error.error && Array.isArray(error.error.error)) {
          error.error.error.forEach((errorMessage: string) => {
            // Split by colon to get field name and error message
            const colonIndex = errorMessage.indexOf(':');
            if (colonIndex !== -1) {
              const fieldName = errorMessage.substring(0, colonIndex).trim();
              const fieldError = errorMessage.substring(colonIndex + 1).trim();
              validationErrors[fieldName] = fieldError;
            }
          });
        }

        const standardizedError = {
          status: error.status || 0,
          error: {
            success: false,
            message: 'Validation failed',
            data: null,
            error: 'Validation Error',
            validationErrors: validationErrors
          }
        };
        console.log('ApiService: Handling validation errors:', standardizedError);
        return throwError(() => standardizedError);
      }

      // For non-401 errors, preserve the original error structure and message
      const standardizedError = {
        status: error.status || 0,
        error: {
          success: false,
          message: getErrorMessage(error),
          data: null,
          error: error.error || error.message || 'An unexpected error occurred'
        }
      };

      console.error("AuthInterceptor: Standardized error response:", standardizedError);
      return throwError(() => standardizedError);
    })
  );
};
