import { computed, inject, NgZone, PLATFORM_ID, Service, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../api/api-service';
import { User } from '../user/user.model';
import { ForgotPasswordRequest, LoginRequest, LoginResponse, RefreshTokenResponseData, ResetPasswordRequest } from './auth.model';
import { ApiResponse } from '../api/api-response.model';
import { catchError, finalize, map, Observable, of, tap, throwError } from 'rxjs';
import { UserService } from '../user/user-service';

export const ACCESS_TOKEN = 'access_token';
export const AUTH_USER_KEY = 'auth_user';
export const REFRESH_ENDPOINT = '/auth/refresh-token';
const passthroughError = (error: unknown) => throwError(() => error);

interface AuthSyncMessage {
    type: 'LOGIN' | 'LOGOUT' | 'USER_UPDATED';
    user?: User | null;
    token?: string | null;
}

const getStorage = (rememberMe = true): Storage | null => {
    if (typeof window === 'undefined') {
        return null;
    }
    // Always use localStorage so authentication is shared across tabs in the same browser
    return localStorage;
};

const removeTokenFromBothStores = () => {
    if (typeof window === 'undefined') {
        return;
    }

    localStorage.removeItem(ACCESS_TOKEN);
    localStorage.removeItem(AUTH_USER_KEY);
    sessionStorage.removeItem(ACCESS_TOKEN);
    sessionStorage.removeItem(AUTH_USER_KEY);
};

@Service()
export class AuthService {
    public readonly apiService = inject(ApiService);
    public readonly userService = inject(UserService);
    private readonly platformId = inject(PLATFORM_ID);
    private readonly router = inject(Router);
    private readonly ngZone = inject(NgZone);

    #authUser = signal<User | null>(null);
    authUser = computed(() => this.#authUser());

    private broadcastChannel: BroadcastChannel | null = null;

    /** Named reference so the storage listener can be removed on destroy. */
    private readonly onStorageEvent = (event: StorageEvent): void => {
        if (event.key === ACCESS_TOKEN) {
            this.ngZone.run(() => {
                if (event.newValue) {
                    const cachedUser = this.getUser();
                    this.handleCrossTabAuthEvent({
                        type: 'LOGIN',
                        user: cachedUser,
                        token: event.newValue
                    });
                } else {
                    this.handleCrossTabAuthEvent({ type: 'LOGOUT' });
                }
            });
        } else if (event.key === AUTH_USER_KEY) {
            this.ngZone.run(() => {
                if (event.newValue) {
                    try {
                        const updatedUser = JSON.parse(event.newValue) as User;
                        this.handleCrossTabAuthEvent({
                            type: 'USER_UPDATED',
                            user: updatedUser
                        });
                    } catch {
                        // ignore parse error
                    }
                } else {
                    this.handleCrossTabAuthEvent({ type: 'LOGOUT' });
                }
            });
        }
    };

    constructor() {
        const cachedUser = this.getUser();
        if (cachedUser) {
            this.#authUser.set(cachedUser);
        }
        this.initCrossTabSync();
    }

    /**
     * Initializes cross-tab session synchronization using BroadcastChannel and window storage events.
     */
    private initCrossTabSync() {
        if (!isPlatformBrowser(this.platformId) || typeof window === 'undefined') {
            return;
        }

        // Initialize BroadcastChannel if supported
        if ('BroadcastChannel' in window) {
            try {
                this.broadcastChannel = new BroadcastChannel('tashihome_auth_channel');
                this.broadcastChannel.onmessage = (event: MessageEvent<AuthSyncMessage>) => {
                    if (event.data?.type) {
                        this.ngZone.run(() => {
                            this.handleCrossTabAuthEvent(event.data);
                        });
                    }
                };
            } catch (e) {
                console.warn('BroadcastChannel initialization failed, fallback to storage events', e);
            }
        }

        // Fallback and companion: storage events for cross-tab updates
        window.addEventListener('storage', this.onStorageEvent);
    }

    ngOnDestroy(): void {
        if (typeof window !== 'undefined') {
            window.removeEventListener('storage', this.onStorageEvent);
        }
        if (this.broadcastChannel) {
            this.broadcastChannel.close();
            this.broadcastChannel = null;
        }
    }

    /**
     * Broadcasts authentication state changes to all other tabs.
     */
    private broadcastAuthChange(payload: AuthSyncMessage) {
        if (!isPlatformBrowser(this.platformId) || typeof window === 'undefined') {
            return;
        }

        if (this.broadcastChannel) {
            try {
                this.broadcastChannel.postMessage(payload);
            } catch (e) {
                console.warn('Failed to broadcast auth state change', e);
            }
        }
    }

    /**
     * Handles auth events arriving from other tabs.
     */
    private handleCrossTabAuthEvent(event: AuthSyncMessage) {
        if (event.type === 'LOGIN') {
            const user = event.user || this.getUser();
            if (user) {
                this.#authUser.set(user);
                this.handleCrossTabLoginRedirect(user);
            } else {
                this.fetchMe().subscribe({
                    next: (fetchedUser) => {
                        this.handleCrossTabLoginRedirect(fetchedUser);
                    },
                    error: () => {}
                });
            }
        } else if (event.type === 'LOGOUT') {
            this.#authUser.set(null);
            removeTokenFromBothStores();
            this.handleCrossTabLogoutRedirect();
        } else if (event.type === 'USER_UPDATED' && event.user) {
            this.#authUser.set(event.user);
        }
    }

    /**
     * If tab was on a guest page (e.g. /login), redirect to role dashboard when logged in from another tab.
     */
    private handleCrossTabLoginRedirect(user?: User | null) {
        const currentUrl = this.router.url;
        const isGuestRoute = ['/login', '/register', '/forgot-password', '/password-reset', '/activate-account']
            .some(route => currentUrl === route || currentUrl.startsWith(route + '/') || currentUrl.startsWith(route + '?'));

        if (isGuestRoute) {
            const role = (user?.role || this.authUser()?.role)?.toLowerCase();
            if (role === 'admin' || role === 'staff') {
                this.router.navigate(['/admin']);
            } else if (role === 'vendor') {
                this.router.navigate(['/vendor']);
            } else {
                this.router.navigate(['/profile']);
            }
        }
    }

    /**
     * If tab was on a protected page, redirect to /login when logged out from another tab.
     */
    private handleCrossTabLogoutRedirect() {
        const currentUrl = this.router.url;
        const isProtectedRoute = ['/admin', '/vendor', '/user', '/profile']
            .some(route => currentUrl === route || currentUrl.startsWith(route + '/') || currentUrl.startsWith(route + '?'));

        if (isProtectedRoute) {
            this.router.navigate(['/login']);
        }
    }

    public login(
        data: LoginRequest
    ): Observable<ApiResponse<LoginResponse>> {
        return this.apiService.post<ApiResponse<LoginResponse>>('/auth/login', data).pipe(
            map(response => response.data),
            tap(response => {
                const user = response.data.user;
                const token = response.data.token.token;
                this.#authUser.set(user);
                this.setToken(token, data.rememberMe ?? true);
                this.setUser(user);
                this.broadcastAuthChange({
                    type: 'LOGIN',
                    user,
                    token
                });
            }),
            catchError(this.apiService.passthroughError)
        );
    }

    public fetchMe() {
        return this.userService.getUserProfile().pipe(
            map((response) => response.data),
            tap((user) => {
                this.#authUser.set(user);
                this.setUser(user);
            }),
            catchError((error) => {
                console.error('Error fetching profile:', error);
                this.#authUser.set(null);
                this.removeToken();
                return throwError(() => error);
            })
        );
    }

    public setToken(token: string, rememberMe = true) {
        const storage = getStorage(rememberMe);
        storage?.setItem(ACCESS_TOKEN, token);
    }

    public setUser(user: User) {
        if (typeof window === 'undefined') {
            return;
        }
        try {
            localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
        } catch (e) {
            console.error('Failed to cache user in localStorage', e);
        }
    }

    public updateCurrentUser(user: User) {
        this.#authUser.set(user);
        this.setUser(user);
        this.broadcastAuthChange({
            type: 'USER_UPDATED',
            user
        });
    }

    public getUser(): User | null {
        if (typeof window === 'undefined') {
            return null;
        }
        const userStr = localStorage.getItem(AUTH_USER_KEY);
        if (!userStr) {
            return null;
        }
        try {
            return JSON.parse(userStr) as User;
        } catch {
            return null;
        }
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
        this.#authUser.set(null);
        this.broadcastAuthChange({ type: 'LOGOUT' });
    }

    public isAuthenticated(): boolean {
        return !!this.#authUser() || !!this.getToken();
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
     * This method is called when the app starts to check and refresh tokens if needed
     */
    public initializeAuth(): Observable<boolean> {
        const token = this.getToken();
        if (!token) {
            console.log('No auth token found, user needs to login');
            this.#authUser.set(null);
            this.removeToken();
            return of(false);
        }

        // Pre-populate with cached user for immediate UI responsiveness without flashing
        const cachedUser = this.getUser();
        if (cachedUser && !this.#authUser()) {
            this.#authUser.set(cachedUser);
        }

        // Token exists — fetch current user profile to validate it
        return this.fetchMe().pipe(
            map(() => true),
            catchError(() => of(false))
        );
    }

    public getCookie(name: string) {
        return document.cookie.split("; ").find(row => row.startsWith(name + "="))?.split("=")[1];
    }

    public logout(): Observable<ApiResponse<any>> {
        return this.apiService.protectedPost<ApiResponse<any>>('/auth/logout', {}).pipe(
            map(response => response.data),
            finalize(() => {
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
