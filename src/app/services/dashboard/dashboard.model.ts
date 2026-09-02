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

export type BookingStats = BookingsSummary;

export interface RevenueSummary {
  total_revenue: number;
  gross_revenue?: number;
  net_revenue?: number;
  pending_revenue: number;
  refunded_amount: number;
  total_refunded?: number;
  currency: string;
}

export type RevenueStats = RevenueSummary;

export interface PayoutStats {
  total_payouts: number;
  total_paid_amount: number;
  pending_payout_amount: number;
  processing_payout_amount: number;
  failed_payout_amount: number;
  pending_count: number;
  processing_count: number;
  paid_count: number;
  failed_count: number;
  last_payout_date: string | null;
  last_payout_amount: number | null;
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

export type PropertyStats = PropertiesSummary;

export interface UsersSummary {
  total: number;
  active: number;
  inactive: number;
  suspended: number;
  by_role: Record<string, number>;
  pending_hosts: number;
}

export type UserStats = UsersSummary;

export interface RefundsSummary {
  total_requests: number;
  pending: number;
  approved: number;
  processed?: number;
  rejected: number;
  total_amount_refunded: number;
}

export type RefundStats = RefundsSummary;

export interface OccupancyToday {
  today_check_ins: number;
  today_check_outs: number;
  active_guests: number;
  blocked_units_today?: number;
}

export interface RoomBlockStats {
  total: number;
  active: number;
  upcoming: number;
  past: number;
  total_units_blocked_today: number;
}

export type RoomBlocksSummary = RoomBlockStats;

export interface RecentRoomBlock {
  id: string;
  property_name: string | null;
  property_slug: string | null;
  room_type_name: string | null;
  block_start_date: string; // YYYY-MM-DD
  block_end_date: string;   // YYYY-MM-DD
  units_blocked: number;
  reason: string | null;
  created_by_name: string | null;
  created_at: string | null;
}

export type DashboardRoomBlockItem = RecentRoomBlock;

export interface ReviewsSummary {
  total_reviews: number;
  average_rating: number;
}

export type ReviewStats = ReviewsSummary;

export interface RevenueTrend {
  month: string; // YYYY-MM
  revenue: number;
  gross_revenue?: number;
  refunded?: number;
  bookings_count: number;
}

export type RevenueTrendItem = RevenueTrend;

export interface RecentBooking {
  id: string;
  booking_reference: string;
  guest_name: string | null;
  guest_email: string | null;
  property_name: string | null;
  property_slug: string | null;
  check_in_date: string;
  check_out_date: string;
  num_guests: number;
  num_rooms: number;
  total_amount: number;
  currency: string;
  status: string;
  payment_status: string;
  created_at: string | null;
}

export type DashboardBookingItem = RecentBooking;

export interface DashboardPayoutItem {
  id: string;
  vendor_name?: string | null;
  vendor_email?: string | null;
  amount: number;             // Net payout amount
  gross_amount: number | null;// Total booking gross in period
  commission_amount: number | null; // Platform commission deducted
  currency: string;
  period_start: string;       // YYYY-MM-DD
  period_end: string;         // YYYY-MM-DD
  status: 'pending' | 'processing' | 'paid' | 'failed' | 'reversed' | 'rejected' | 'cancelled' | string;
  mode: string | null;        // NEFT, IMPS, RTGS, UPI
  utr: string | null;         // Bank UTR transfer reference
  notes: string | null;
  paid_at: string | null;
  created_at: string | null;
}

export interface DashboardRefundItem {
  id: string;
  booking_reference: string | null;
  guest_name: string | null;
  guest_email: string | null;
  property_name: string | null;
  amount: number;
  reason: string | null;
  status: string;
  razorpay_refund_id: string | null;
  approved_at: string | null;
  created_at: string | null;
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

export type DashboardHostRequestItem = RecentHostRequest;

export interface RecentUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
}

export type DashboardUserItem = RecentUser;

export interface TopProperty {
  id: string;
  name: string;
  slug: string | null;
  city: string | null;
  type: string | null;
  price_per_night: number;
  image_url: string | null;
  total_bookings: number;
  total_revenue: number;
  average_rating: number;
}

export type TopPropertyItem = TopProperty;

export interface AdminDashboardData {
  bookings_summary: BookingsSummary;
  revenue_summary: RevenueSummary;
  properties_summary: PropertiesSummary;
  users_summary: UsersSummary;
  refunds_summary: RefundsSummary;
  payouts_summary?: PayoutStats;
  room_blocks_summary?: RoomBlockStats;
  occupancy_today: OccupancyToday;
  revenue_trends: RevenueTrend[];
  recent_bookings: RecentBooking[];
  recent_host_requests: RecentHostRequest[];
  recent_users: RecentUser[];
  recent_refund_requests?: DashboardRefundItem[];
  recent_payouts?: DashboardPayoutItem[];
  recent_room_blocks?: RecentRoomBlock[];
  top_properties: TopProperty[];
}

export interface AdminDashboardSummaryData {
  bookings_summary: BookingsSummary;
  revenue_summary: RevenueSummary;
  properties_summary: PropertiesSummary;
  users_summary: UsersSummary;
  refunds_summary: RefundsSummary;
  payouts_summary?: PayoutStats;
  room_blocks_summary?: RoomBlockStats;
  occupancy_today: OccupancyToday;
}

export type AdminSummaryData = AdminDashboardSummaryData;

export interface AdminDashboardResponse {
  status: string;
  message: string;
  data: AdminDashboardData;
}

export interface AdminSummaryResponse {
  status: string;
  message: string;
  data: AdminSummaryData;
}

export interface VendorDashboardData {
  bookings_summary: BookingsSummary;
  revenue_summary: RevenueSummary;
  properties_summary: PropertiesSummary;
  payouts_summary?: PayoutStats;
  reviews_summary: ReviewsSummary;
  room_blocks_summary?: RoomBlockStats;
  occupancy_today: OccupancyToday;
  revenue_trends: RevenueTrend[];
  recent_bookings: RecentBooking[];
  upcoming_bookings: RecentBooking[];
  recent_payouts?: DashboardPayoutItem[];
  recent_room_blocks?: RecentRoomBlock[];
  top_properties: TopProperty[];
}

export interface VendorDashboardSummaryData {
  bookings_summary: BookingsSummary;
  revenue_summary: RevenueSummary;
  properties_summary: PropertiesSummary;
  payouts_summary?: PayoutStats;
  reviews_summary: ReviewsSummary;
  room_blocks_summary?: RoomBlockStats;
  occupancy_today: OccupancyToday;
}

export type VendorSummaryData = VendorDashboardSummaryData;

export interface VendorDashboardResponse {
  status: string;
  message: string;
  data: VendorDashboardData;
}

export interface VendorSummaryResponse {
  status: string;
  message: string;
  data: VendorSummaryData;
}

export interface PublicStatItem {
  key: 'homes' | 'states' | 'verified' | 'rating' | string;
  target: number;
  current?: number;
  suffix?: string | null;
  decimals?: number;
  label: string;
}

export interface PublicStatsData {
  total_homes: number;
  total_destinations: number;
  verified_percent: number;
  average_rating: number;
  total_reviews: number;
  stats: PublicStatItem[];
}

export interface PublicStatsResponse {
  status: string;
  message: string;
  data: PublicStatsData;
}
