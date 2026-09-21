import { Injectable, inject, PLATFORM_ID, OnDestroy, effect } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Subject, Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth-service';
import { NotificationItem } from './notification.model';

export type SocketConnectionState = 'connected' | 'disconnected' | 'connecting' | 'error';

@Injectable({
  providedIn: 'root',
})
export class NotificationSocketService implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly authService = inject(AuthService);

  private socket: Socket | null = null;
  private currentToken: string | null = null;

  // Streams
  private readonly notificationSubject = new Subject<NotificationItem>();
  public readonly notification$: Observable<NotificationItem> = this.notificationSubject.asObservable();

  private readonly connectionStateSubject = new BehaviorSubject<SocketConnectionState>('disconnected');
  public readonly connectionState$: Observable<SocketConnectionState> = this.connectionStateSubject.asObservable();

  /** Named reference so the storage listener can be removed on destroy. */
  private readonly onStorageEvent = (event: StorageEvent): void => {
    if (event.key === 'access_token') {
      if (event.newValue) {
        this.connect(event.newValue);
      } else {
        this.disconnect();
      }
    }
  };

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.initAuthSync();

      // Automatically sync socket lifecycle with auth user state
      effect(() => {
        const user = this.authService.authUser();
        if (user) {
          const token = this.authService.getToken();
          if (token) {
            this.connect(token);
          }
        } else {
          this.disconnect();
        }
      });
    }
  }

  /**
   * Monitor auth token and automatically maintain socket connection lifecycle.
   */
  private initAuthSync(): void {
    const existingToken = this.authService.getToken();
    if (existingToken) {
      this.connect(existingToken);
    }

    // React to token changes across the session (e.g. login, refresh, logout)
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this.onStorageEvent);
    }
  }

  /**
   * Connect to Socket.IO backend with JWT authentication.
   */
  public connect(token: string): void {
    if (!isPlatformBrowser(this.platformId) || !token) {
      return;
    }

    // If already connected with the same token, no need to reconnect
    if (this.socket && this.socket.connected && this.currentToken === token) {
      return;
    }

    // If token changed while connected, update socket auth and reconnect
    if (this.socket && this.currentToken !== token) {
      this.currentToken = token;
      this.socket.auth = { token };
      if (!this.socket.connected) {
        this.socket.connect();
      }
      return;
    }

    this.disconnect();
    this.currentToken = token;
    this.connectionStateSubject.next('connecting');

    const socketUrl = environment.socketUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    const socketPath = environment.socketPath || '/socket.io';

    try {
      this.socket = io(socketUrl, {
        path: socketPath,
        transports: ['websocket', 'polling'],
        auth: { token },
        query: { token },
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 15,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 10000,
      });

      this.socket.on('connect', () => {
        this.connectionStateSubject.next('connected');
      });

      this.socket.on('disconnect', (reason) => {
        this.connectionStateSubject.next('disconnected');
      });

      this.socket.on('connect_error', (error) => {
        console.warn('[Socket.IO] Connection error:', error?.message || error);
        this.connectionStateSubject.next('error');
      });

      // Listen for real-time notification events emitted by FastAPI backend
      this.socket.on('notification', (payload: NotificationItem) => {
        if (payload) {
          this.notificationSubject.next(payload);
        }
      });
    } catch (err) {
      console.warn('[Socket.IO] Initialization error:', err);
      this.connectionStateSubject.next('error');
    }
  }

  /**
   * Disconnect cleanly from Socket.IO server.
   */
  public disconnect(): void {
    if (this.socket) {
      try {
        this.socket.removeAllListeners();
        this.socket.disconnect();
      } catch (e) {
        // ignore disconnect errors
      }
      this.socket = null;
      this.currentToken = null;
      this.connectionStateSubject.next('disconnected');
    }
  }

  /**
   * Check if socket is actively connected.
   */
  public isConnected(): boolean {
    return !!this.socket && this.socket.connected;
  }

  ngOnDestroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', this.onStorageEvent);
    }
    this.disconnect();
  }
}

