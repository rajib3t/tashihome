import { Injectable, computed, inject, signal, PLATFORM_ID, OnDestroy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Subscription } from 'rxjs';
import { NotificationApiService } from './notification-api.service';
import { NotificationSocketService } from './notification-socket.service';
import { NotificationItem, NotificationRole } from './notification.model';
import { AuthService } from '../auth/auth-service';

@Injectable({
  providedIn: 'root',
})
export class NotificationService implements OnDestroy {
  private readonly api = inject(NotificationApiService);
  private readonly socket = inject(NotificationSocketService);
  private readonly authService = inject(AuthService);
  private readonly platformId = inject(PLATFORM_ID);

  // State Signals
  private readonly notificationsSignal = signal<NotificationItem[]>([]);
  private readonly unreadCountSignal = signal<number>(0);
  private readonly loadingSignal = signal<boolean>(false);
  private readonly latestRealtimeItemSignal = signal<NotificationItem | null>(null);

  // Selectors
  public readonly notifications = this.notificationsSignal.asReadonly();
  public readonly unreadCount = this.unreadCountSignal.asReadonly();
  public readonly loading = this.loadingSignal.asReadonly();
  public readonly latestRealtimeItem = this.latestRealtimeItemSignal.asReadonly();
  public readonly hasUnread = computed(() => this.unreadCountSignal() > 0);

  private socketSub: Subscription | null = null;

  constructor() {
    // Listen for incoming live socket notifications
    this.socketSub = this.socket.notification$.subscribe((newItem) => {
      this.handleIncomingNotification(newItem);
    });

    // Auto-load when user profile / auth is confirmed
    if (isPlatformBrowser(this.platformId) && this.authService.isAuthenticated()) {
      this.loadInitial();
    }
  }

  /**
   * Fetch initial notifications and unread badge count from backend REST API.
   */
  public loadInitial(role?: NotificationRole | string): void {
    if (!this.authService.isAuthenticated()) {
      return;
    }

    this.loadingSignal.set(true);

    this.api.getNotifications({ page: 1, page_size: 20, role }).subscribe({
      next: (res) => {
        const payload = res?.data;
        let items: NotificationItem[] = [];
        let unread = 0;

        if (Array.isArray(payload)) {
          items = payload;
        } else if (payload?.data && Array.isArray(payload.data)) {
          items = payload.data;
        } else if (payload?.items && Array.isArray(payload.items)) {
          items = payload.items;
        } else if (payload?.notifications && Array.isArray(payload.notifications)) {
          items = payload.notifications;
        } else if (Array.isArray(res)) {
          items = res;
        }

        const meta = payload?.meta || (res as any)?.meta;
        if (meta?.unread_count !== undefined) {
          unread = Number(meta.unread_count);
        } else if (payload?.unread_count !== undefined) {
          unread = Number(payload.unread_count);
        } else {
          unread = items.filter((n) => !n.is_read).length;
        }

        this.notificationsSignal.set(items);
        this.unreadCountSignal.set(unread);
        this.loadingSignal.set(false);
      },
      error: (err) => {
        console.warn('Failed to load notifications:', err);
        this.loadingSignal.set(false);
      },
    });
  }

  /**
   * Reactively handle incoming real-time notifications from Socket.IO.
   */
  private handleIncomingNotification(item: NotificationItem): void {
    if (!item) return;

    // Deduplicate by ID or identical booking/host request event
    const currentList = this.notificationsSignal();
    const isDuplicate = currentList.some((n) => {
      if (n.id === item.id) return true;

      // Deduplicate booking events with same booking reference
      const itemBookingRef = item.data?.booking_reference;
      const nBookingRef = n.data?.booking_reference;
      if (n.type === item.type && itemBookingRef && nBookingRef === itemBookingRef) {
        return true;
      }

      // Deduplicate host request events with same request id or public_id
      const itemReqId = item.data?.public_id || item.data?.host_request_id;
      const nReqId = n.data?.public_id || n.data?.host_request_id;
      if (n.type === item.type && itemReqId && nReqId === itemReqId) {
        return true;
      }

      return false;
    });

    if (isDuplicate) {
      return;
    }

    // Prepend to top of notifications list
    this.notificationsSignal.update((current) => [item, ...current]);

    // Increment unread badge count
    if (!item.is_read) {
      this.unreadCountSignal.update((count) => count + 1);
    }

    // Set latest item for toast notifications
    this.latestRealtimeItemSignal.set(item);

    // Play subtle auditory chime
    this.playNotificationSound();
  }

  /**
   * Mark a specific notification as read.
   */
  public markAsRead(itemOrId: NotificationItem | string): void {
    const id = typeof itemOrId === 'string' ? itemOrId : itemOrId.id;
    const target = this.notificationsSignal().find((n) => n.id === id);

    if (target && target.is_read) {
      return;
    }

    // Optimistic UI update
    this.notificationsSignal.update((list) =>
      list.map((n) => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
    );
    this.unreadCountSignal.update((c) => Math.max(0, c - 1));

    this.api.markAsRead(id).subscribe({
      error: (err) => {
        console.warn('Failed to mark notification as read on server:', err);
      },
    });
  }

  /**
   * Mark all notifications as read.
   */
  public markAllAsRead(role?: NotificationRole | string): void {
    if (this.unreadCountSignal() === 0) {
      return;
    }

    // Optimistic UI update
    this.notificationsSignal.update((list) =>
      list.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
    );
    this.unreadCountSignal.set(0);

    this.api.markAllAsRead(role).subscribe({
      error: (err) => {
        console.warn('Failed to mark all notifications as read on server:', err);
      },
    });
  }

  /**
   * Delete a notification.
   */
  public deleteNotification(id: string): void {
    const target = this.notificationsSignal().find((n) => n.id === id);
    if (!target) return;

    this.notificationsSignal.update((list) => list.filter((n) => n.id !== id));
    if (!target.is_read) {
      this.unreadCountSignal.update((c) => Math.max(0, c - 1));
    }

    this.api.deleteNotification(id).subscribe({
      error: (err) => {
        console.warn('Failed to delete notification on server:', err);
      },
    });
  }

  /**
   * Non-blocking audio chime. Uses Web Audio API oscillator synthesis as a zero-dependency,
   * always-available chime, with fallback to audio element if available.
   */
  private playNotificationSound(): void {
    if (!isPlatformBrowser(this.platformId) || typeof window === 'undefined') {
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') {
          ctx.resume();
        }

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        // Gentle bell tone (D5 to A5 harmonic)
        osc.frequency.setValueAtTime(587.33, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.45);
      }
    } catch (_) {
      // Audio autoplay policy might silently restrict before user interaction
    }
  }

  ngOnDestroy(): void {
    if (this.socketSub) {
      this.socketSub.unsubscribe();
      this.socketSub = null;
    }
  }
}

