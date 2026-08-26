import { computed, inject, Service, signal } from '@angular/core';
import { ApiService } from '../api/api-service';
import { User } from '../user/user.model';
import { ForgotPasswordRequest, LoginRequest, LoginResponse, RefreshTokenResponseData, ResetPasswordRequest } from './auth.model';
import { ApiResponse } from '../api/api-response.model';
import { catchError, finalize, map, Observable, of, tap, throwError } from 'rxjs';
import { UserService } from '../user/user-service';
export const ACCESS_TOKEN = 'access_token'
export const REFRESH_ENDPOINT = '/auth/refresh-token'
const passthroughError = (error: unknown) => throwError(() => error);

const getStorage = (rememberMe = true): Storage | null => {
    if (typeof window === 'undefined') {
        return null;
    }

    return rememberMe ? localStorage : sessionStorage;
};

const removeTokenFromBothStores = () => {
    if (typeof window === 'undefined') {
        return;
    }

    localStorage.removeItem(ACCESS_TOKEN);
    sessionStorage.removeItem(ACCESS_TOKEN);
};
@Service()
export class AuthService {
    public readonly apiService = inject(ApiService);
    public readonly userService = inject(UserService);

    #authUser = signal<User | null>(null);
    authUser = computed(() => this.#authUser());



    public login(
        data:LoginRequest
    ): Observable<ApiResponse<LoginResponse>> {
        return this.apiService.post<ApiResponse<LoginResponse>>('/auth/login', data).pipe(
            map(response => response.data),
            tap(response => {
                this.#authUser.set(response.data.user)
                this.setToken(response.data.token.token, data.rememberMe ?? false)
            }),
            catchError(this.apiService.passthroughError)
        )
    }

    public fetchMe() {
    return this.userService.getUserProfile().pipe(
      map((response) => response.data),
      tap((user) => {
        this.#authUser.set(user);
      }),
      catchError((error) => {
        console.error('Error fetching profile:', error);
        this.#authUser.set(null);
        return throwError(() => error);
      })
    );
  }
    public setToken(token: string, rememberMe = true) {
        const storage = getStorage(rememberMe);
        storage?.setItem(ACCESS_TOKEN, token);
    }

    public getToken(): string | null {
        if (typeof window === 'undefined') {
            return null;
        }

        return localStorage.getItem(ACCESS_TOKEN) ?? sessionStorage.getItem(ACCESS_TOKEN);
    }

    public hasPersistentToken(): boolean {
        if (typeof window === 'undefined') {
            return false;
        }

        return !!localStorage.getItem(ACCESS_TOKEN);
    }

    public removeToken() {
        removeTokenFromBothStores();
    }


    public isAuthenticated(): boolean {
        return !!this.getToken();
    }

    public refreshToken(): Observable<ApiResponse<RefreshTokenResponseData>> {
        // Backend reads refresh_token from httpOnly cookie, so send empty body
        return this.apiService.post<ApiResponse<RefreshTokenResponseData>>(REFRESH_ENDPOINT, {}).pipe(
        map(response => {
            console.log('Token refreshed successfully', response.data);
            return response.data;
        }),
        tap(response => {
            this.setToken(response.data.token, this.hasPersistentToken());
        }),
        catchError(passthroughError)
        );
    }


     /**
     * Initialize authentication on app startup
     * This method should be called when the app starts to check and refresh tokens if needed
     */
    public initializeAuth(): Observable<boolean> {
        const token = this.getToken();
        if (!token) {
        console.log('No auth token found, user needs to login');
        this.#authUser.set(null);
        return of(false);
        }

        // Token exists — fetch current user profile to validate it
       
        return this.fetchMe().pipe(
        map(() => true),
        catchError(() => of(false))
        );
    }


    public  getCookie(name : string) {
        return document.cookie.split("; ").find(row => row.startsWith(name + "="))?.split("=")[1];
    }


    public logout(): Observable<ApiResponse<any>> {
        return this.apiService.protectedPost<ApiResponse<any>>('/auth/logout', {}).pipe(
            map(response => response.data),
            finalize(() => {
                this.#authUser.set(null);
                this.removeToken();
            }),
            catchError(this.apiService.passthroughError)
        );
    }

    public forgotPassword(data: ForgotPasswordRequest): Observable<ApiResponse<unknown>> {
        return this.apiService.post<ApiResponse<unknown>>('/auth/forgot-password', data).pipe(
            map(response => response.data),
            catchError(this.apiService.passthroughError)
        );
    }

    public checkResetPasswordToken(token: string): Observable<ApiResponse<unknown>> {
        return this.apiService.get<ApiResponse<unknown>>('/auth/check-reset-password-token/' + encodeURIComponent(token)).pipe(
            map(response => response.data),
            catchError(this.apiService.passthroughError)
        );
    }

    public resetPassword(data: ResetPasswordRequest): Observable<ApiResponse<unknown>> {
        return this.apiService.post<ApiResponse<unknown>>('/auth/reset-password', data).pipe(
            map(response => response.data),
            catchError(this.apiService.passthroughError)
        );
    }

    public checkActiveAccount(token: string): Observable<ApiResponse<User>> {
        return this.apiService.get<ApiResponse<User>>(`/auth/check-active-account/${encodeURIComponent(token)}`).pipe(
            map(response => response.data),
            catchError(this.apiService.passthroughError)
        );
    }

    public activateAccount(token: string): Observable<ApiResponse<User>> {
        return this.apiService.post<ApiResponse<User>>(`/auth/activate-account/${encodeURIComponent(token)}`, {}).pipe(
            map(response => response.data),
            catchError(this.apiService.passthroughError)
        );
    }

    /** @deprecated Use checkActiveAccount for the token-validation endpoint. */
    public getActiveAccount(token: string): Observable<ApiResponse<User>> {
        return this.checkActiveAccount(token);
    }
}
