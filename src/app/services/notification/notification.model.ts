export enum NotificationRole {
  ADMIN = 'admin',
  VENDOR = 'vendor',
  USER = 'user',
  STAFF = 'staff',
  AGENT = 'agent',
}

export enum NotificationEventType {
  // Booking Requests
  BOOKING_REQUEST_CREATED = 'booking.request_created',
  BOOKING_CONFIRMED = 'booking.confirmed',
  BOOKING_CANCELLED = 'booking.cancelled',
  BOOKING_STATUS_CHANGED = 'booking.status_changed',

  // Host Requests
  HOST_REQUEST_SUBMITTED = 'host_request.submitted',
  HOST_REQUEST_STATUS_CHANGED = 'host_request.status_changed',
  HOST_REQUEST_CONVERTED = 'host_request.converted',
  HOST_REQUEST_MESSAGE = 'host_request.message',

  // System
  SYSTEM = 'system',
}

export interface NotificationData {
  booking_id?: number | string;
  booking_reference?: string;
  property_id?: number | string;
  property_name?: string;
  check_in_date?: string;
  check_out_date?: string;
  total_amount?: number;
  status?: string;
  new_status?: string;
  public_id?: string;
  host_request_id?: number | string;
  full_name?: string;
  city?: string;
  [key: string]: any;
}

export interface NotificationItem {
  id: string; // UUID or public_id
  role: NotificationRole | string;
  type: NotificationEventType | string;
  title: string;
  message: string;
  data?: NotificationData | null;
  is_read: boolean;
  read_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface NotificationPaginationMeta {
  total: number;
  page: number;
  size: number;
  total_pages?: number;
  unread_count: number;
}

export interface NotificationQueryParams {
  page?: number;
  page_size?: number;
  is_read?: boolean;
  role?: NotificationRole | string;
}

export interface NotificationListResponseData {
  items?: NotificationItem[];
  notifications?: NotificationItem[];
  meta?: NotificationPaginationMeta;
  unread_count?: number;
}

export interface NotificationUnreadCountData {
  unread_count: number;
}

export interface NotificationMarkAllReadData {
  updated_count: number;
}

