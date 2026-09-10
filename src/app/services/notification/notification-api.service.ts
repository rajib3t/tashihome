import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from '../api/api-service';
import { ApiResponse } from '../api/api-response.model';
import {
  NotificationItem,
  NotificationQueryParams,
  NotificationRole,
  NotificationUnreadCountData,
  NotificationMarkAllReadData,
} from './notification.model';

@Injectable({
  providedIn: 'root',
})
export class NotificationApiService {
  private readonly apiService = inject(ApiService);

  /**
   * Fetch paginated list of notifications for the current authenticated user.
   */
  public getNotifications(
    params?: NotificationQueryParams
  ): Observable<ApiResponse<any>> {
    let httpParams = new HttpParams();

    if (params?.page !== undefined) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params?.page_size !== undefined) {
      httpParams = httpParams.set('page_size', params.page_size.toString());
    }
    if (params?.is_read !== undefined) {
      httpParams = httpParams.set('is_read', params.is_read.toString());
    }
    if (params?.role) {
      httpParams = httpParams.set('role', params.role);
    }

    return this.apiService.protectedGet<any>('/notifications', {
      params: httpParams,
    });
  }

  /**
   * Fetch current unread notifications count.
   */
  public getUnreadCount(role?: NotificationRole | string): Observable<ApiResponse<NotificationUnreadCountData>> {
    let httpParams = new HttpParams();
    if (role) {
      httpParams = httpParams.set('role', role);
    }

    return this.apiService.protectedGet<NotificationUnreadCountData>('/notifications/unread-count', {
      params: httpParams,
    });
  }

  /**
   * Mark a single notification as read by public ID.
   */
  public markAsRead(publicId: string): Observable<ApiResponse<NotificationItem>> {
    return this.apiService.protectedPatch<NotificationItem>(`/notifications/${publicId}/read`, {});
  }

  /**
   * Mark all notifications as read for current user.
   */
  public markAllAsRead(role?: NotificationRole | string): Observable<ApiResponse<NotificationMarkAllReadData>> {
    let httpParams = new HttpParams();
    if (role) {
      httpParams = httpParams.set('role', role);
    }

    return this.apiService.protectedPatch<NotificationMarkAllReadData>('/notifications/read-all', {}, {
      params: httpParams,
    });
  }

  /**
   * Delete a notification by public ID.
   */
  public deleteNotification(publicId: string): Observable<ApiResponse<{ id: string }>> {
    return this.apiService.protectedDelete<{ id: string }>(`/notifications/${publicId}`);
  }
}

