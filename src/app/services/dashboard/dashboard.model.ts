export interface BookingsSummary {
  total: number;
  pending: number;
  confirmed: number;
  checked_in: number;
  checked_out: number;
  cancelled: number;
  completed: number;
  no_show: number;
}

export interface RevenueSummary {
  total_revenue: number;
  pending_revenue: number;
  refunded_amount: number;
  currency: string;
}

export interface PropertiesSummary {
  total: number;
  active: number;
  draft: number;
  inactive: number;
  archived: number;
  featured: number;
  by_type: Record<string, number>;
}

export interface UsersSummary {
  total: number;
  active: number;
  inactive: number;
  suspended: number;
  by_role: Record<string, number>;
  pending_hosts: number;
}

export interface RefundsSummary {
  total_requests: number;
  pending: number;
  approved: number;
  rejected: number;
  total_amount_refunded: number;
}

export interface OccupancyToday {
  today_check_ins: number;
  today_check_outs: number;
  active_guests: number;
}

export interface ReviewsSummary {
  total_reviews: number;
  average_rating: number;
}

export interface RevenueTrend {
  month: string;
  revenue: number;
  bookings_count: number;
}

export interface RecentBooking {
  id: string;
  booking_reference: string;
  guest_name: string;
  guest_email: string;
  property_name: string;
  property_slug: string;
  check_in_date: string;
  check_out_date: string;
  num_guests: number;
  num_rooms: number;
  total_amount: number;
  currency: string;
  status: string;
  payment_status: string;
  created_at: string;
}

export interface RecentHostRequest {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  property_name: string;
  property_type: string;
  city: string;
  status: string;
  created_at: string;
}

export interface RecentUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
}

export interface TopProperty {
  id: string;
  name: string;
  slug: string;
  city: string;
  type: string;
  price_per_night: number;
  image_url: string;
  total_bookings: number;
  total_revenue: number;
  average_rating: number;
}

export interface AdminDashboardData {
  bookings_summary: BookingsSummary;
  revenue_summary: RevenueSummary;
  properties_summary: PropertiesSummary;
  users_summary: UsersSummary;
  refunds_summary: RefundsSummary;
  occupancy_today: OccupancyToday;
  revenue_trends: RevenueTrend[];
  recent_bookings: RecentBooking[];
  recent_host_requests: RecentHostRequest[];
  recent_users: RecentUser[];
  top_properties: TopProperty[];
}

export interface AdminDashboardSummaryData {
  bookings_summary: BookingsSummary;
  revenue_summary: RevenueSummary;
  properties_summary: PropertiesSummary;
  users_summary: UsersSummary;
  refunds_summary: RefundsSummary;
  occupancy_today: OccupancyToday;
}

export interface VendorDashboardData {
  bookings_summary: BookingsSummary;
  revenue_summary: RevenueSummary;
  properties_summary: PropertiesSummary;
  reviews_summary: ReviewsSummary;
  occupancy_today: OccupancyToday;
  revenue_trends: RevenueTrend[];
  recent_bookings: RecentBooking[];
  upcoming_bookings: RecentBooking[];
  top_properties: TopProperty[];
}

export interface VendorDashboardSummaryData {
  bookings_summary: BookingsSummary;
  revenue_summary: RevenueSummary;
  properties_summary: PropertiesSummary;
  reviews_summary: ReviewsSummary;
  occupancy_today: OccupancyToday;
}

