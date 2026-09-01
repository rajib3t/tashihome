import { PropertyAsset } from '../property/property.model';

export interface CheckAvailabilityRequest {
  property_id: string;
  check_in_date: string; // YYYY-MM-DD
  check_out_date: string; // YYYY-MM-DD
  room_type_id?: string | null;
  num_rooms?: number;
  num_guests?: number;
}

export interface RoomTypeAvailability {
  property_room_type_id?: string;
  room_type_id: string;
  room_type_name?: string;
  total_units: number;
  booked_units: number;
  blocked_units: number;
  available_units: number;
  is_available: boolean;
}

export interface PricingQuoteItem {
  date: string;
  base_price: number;
  is_weekend: boolean;
}

export interface BookingQuote {
  nights: number;
  num_rooms: number;
  num_guests: number;
  base_price_per_night: number;
  subtotal: number;
  tax_amount: number;
  cleaning_fee: number;
  service_fee: number;
  discount_amount: number;
  total_amount: number;
  currency: string;
  nightly_breakdown?: PricingQuoteItem[];
}

export interface CheckAvailabilityResponseData {
  available?: boolean;
  is_available?: boolean;
  available_units?: number;
  available_rooms?: number;
  total_units?: number;
  booked_units?: number;
  blocked_units?: number;
  requested_rooms?: number;
  quote?: BookingQuote | null;
  room_types_availability?: RoomTypeAvailability[];
  price_per_night?: number;
  sale_price_per_night?: number;
  num_nights?: number;
  total_price?: number;
  total_amount?: number;
  deposit?: number;
  deposit_amount?: number;
  currency?: string;
  room_type_id?: string;
  property_id?: string;
  message?: string;
  [key: string]: any;
}

export interface CreateBookingRequest {
  property_id: string;
  check_in_date: string; // YYYY-MM-DD
  check_out_date: string; // YYYY-MM-DD
  room_type_id: string;
  num_guests: number;
  num_rooms: number;
  special_requests?: string;
}

export interface CancelBookingRequest {
  reason?: string;
  cancellation_reason?: string;
  [key: string]: any;
}

export interface BookingPaymentRequest {
  payment_method: string;
  amount: number;
  transaction_id: string;
  gateway: string; // e.g. 'internal', 'razorpay', 'manual', 'cash'
}

export interface RazorpayOrderResponse {
  id?: string;
  order_id?: string;
  amount?: number;
  currency?: string;
  receipt?: string;
  status?: string;
  key?: string;
  key_id?: string;
  razorpay_key?: string;
  notes?: Record<string, any>;
  [key: string]: any;
}

export interface RazorpayVerifyRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface BookingGuest {
  id: string;
  full_name: string;
  email: string;
  phone: string;
}

export interface BookingProperty {
  id: string;
  name: string;
  slug: string;
  address?: string;
  price_per_night?: number;
  sale_per_night?: number;
  currency?: string;
  property_assets?: PropertyAsset[];
  cover_image?: PropertyAsset | null;
  feature_image?: PropertyAsset | null;
  city?: { name: string };
  location?: { name: string };
  [key: string]: any;
}

export interface BookingRoomType {
  id: string;
  name: string;
  capacity: number;
}

export interface BookingCancellationPolicy {
  id: string;
  name: string;
  description: string;
  refund_tiers?: string;
}

export interface BookingPayment {
  id: string;
  amount: number;
  currency: string;
  payment_method: string;
  gateway: string;
  transaction_id: string;
  status: string;
  refunded_amount?: number;
  paid_at?: string;
  created_at?: string;
}

export interface BookingRefundRequest {
  id: string;
  amount: number;
  reason: string;
  status: string;
  approved_at?: string;
  created_at?: string;
}

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'checked_in'
  | 'checked_out'
  | 'cancelled'
  | 'no_show'
  | 'completed'
  | string;

export interface BookingData {
  id: string;
  booking_reference?: string;
  booking_number?: string;
  reference_number?: string;
  property_id?: string;
  check_in_date: string;
  check_out_date: string;
  num_guests: number;
  num_rooms: number;
  price_per_night: number;
  discount_amount?: number;
  tax_amount?: number;
  total_amount: number;
  total_price?: number;
  currency: string;
  status: BookingStatus;
  payment_status: string;
  special_requests?: string;
  cancellation_reason?: string;
  cancelled_at?: string | null;
  created_at: string;
  updated_at?: string;
  guest?: BookingGuest;
  property?: BookingProperty;
  room_type?: BookingRoomType;
  cancellation_policy?: BookingCancellationPolicy;
  payments?: BookingPayment[];
  refund_requests?: BookingRefundRequest[];
  [key: string]: any;
}

export interface BookingQuery {
  page?: number;
  size?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  status?: string;
  payment_status?: string;
  check_in_date?: string;
  check_out_date?: string;
  booking_reference?: string;
  [key: string]: any;
}
