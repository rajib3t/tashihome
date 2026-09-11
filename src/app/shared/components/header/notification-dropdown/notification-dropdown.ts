import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Dropdown } from '../../ui/dropdown/dropdown';
import { NotificationService } from '../../../../services/notification/notification.service';
import { NotificationItem, NotificationEventType } from '../../../../services/notification/notification.model';
import { AuthService } from '../../../../services/auth/auth-service';

@Component({
  selector: 'app-notification-dropdown',
  imports: [CommonModule, RouterModule, Dropdown],
  templateUrl: './notification-dropdown.html',
  styleUrl: './notification-dropdown.css',
})
export class NotificationDropdown {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  public readonly notificationService = inject(NotificationService);

  public isOpen = false;

  // Signals exposed to template
  public readonly notifications = this.notificationService.notifications;
  public readonly unreadCount = this.notificationService.unreadCount;
  public readonly hasUnread = this.notificationService.hasUnread;
  public readonly loading = this.notificationService.loading;

  public toggleDropdown(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.notificationService.loadInitial();
    }
  }

  public closeDropdown(): void {
    this.isOpen = false;
  }

  public markAllAsRead(event?: Event): void {
    event?.stopPropagation();
    this.notificationService.markAllAsRead();
  }

  public handleNotificationClick(notif: NotificationItem): void {
    this.notificationService.markAsRead(notif);
    this.closeDropdown();

    const role = (notif.role || this.authService.authUser()?.role || '').toLowerCase();
    const data = notif.data;

    if (notif.type.startsWith('booking.')) {
      const bookingRef = data?.booking_reference;
      const bookingId = data?.booking_id;
      const queryParams: Record<string, any> = {};
      if (bookingRef) queryParams['booking_reference'] = bookingRef;
      if (bookingId) queryParams['booking_id'] = bookingId;

      if (role === 'vendor') {
        this.router.navigate(['/vendor/booking-management'], { queryParams });
      } else if (role === 'admin' || role === 'staff') {
        this.router.navigate(['/admin/booking-management'], { queryParams });
      } else {
        this.router.navigate(['/user/trips'], { queryParams });
      }
    } else if (notif.type.startsWith('host_request.')) {
      const requestId = data?.public_id || data?.host_request_id;
      const queryParams: Record<string, any> = {};
      if (requestId) queryParams['id'] = requestId;

      if (role === 'admin' || role === 'staff') {
        this.router.navigate(['/admin/host-management'], { queryParams });
      }
    }
  }

  public formatTimeAgo(timestamp?: string): string {
    if (!timestamp) return '';
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMinutes = Math.floor(diffMs / 60000);

      if (diffMinutes < 1) return 'Just now';
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  }

  public getEventBadgeClass(type: string): string {
    switch (type) {
      case NotificationEventType.BOOKING_REQUEST_CREATED:
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case NotificationEventType.BOOKING_CONFIRMED:
      case NotificationEventType.HOST_REQUEST_CONVERTED:
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case NotificationEventType.BOOKING_CANCELLED:
        return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400';
      case NotificationEventType.HOST_REQUEST_SUBMITTED:
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      default:
        return 'bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400';
    }
  }
}
