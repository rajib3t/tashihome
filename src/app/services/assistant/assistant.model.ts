export interface AssistantMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AssistantChatRequest {
  message: string;
  conversation_history?: AssistantMessage[];
  session_id?: string;
  guest_name?: string;
  guest_email?: string;
  guest_phone?: string;
  guest_password?: string;
}

export interface HomestayCardData {
  id: string | number; // Public UUID
  public_id?: string;
  name: string;
  slug: string;
  city?: string;
  location?: string;
  address?: string;
  base_price: number;
  currency: string;
  currency_symbol?: string;
  max_guests?: number;
  bedrooms?: number;
  bathrooms?: number;
  rating?: number;
  review_count?: number;
  cover_image?: string | null;
  property_type?: string;
}

export interface ReviewItem {
  id?: string;
  reviewer_name: string;
  rating: number;
  comment: string;
  created_at?: string;
}

export interface HomestayDetailData extends HomestayCardData {
  description?: string;
  amenities?: string[];
  house_rules?: string[];
  room_types?: PropertyRoomTypeOption[];
  rating_distribution?: Record<string, number>;
  recent_reviews?: ReviewItem[];
  host?: {
    id?: string;
    name?: string;
    avatar?: string;
    is_verified?: boolean;
  };
}

export interface SemanticSearchResult {
  id: string; // Public UUID
  name: string;
  slug: string;
  city_name?: string;
  price_per_night: number;
  type?: string;
  similarity_score?: number;
  match_percentage?: number;
  description?: string;
  amenities?: string[];
  cover_image?: string | null;
}

export interface PropertyRoomTypePriceTier {
  id?: string;
  occupancy: number; // e.g. 1, 2, 3, 4 guests
  price_per_night: number; // e.g. 1500.0, 1550.0, 1600.0
  base_price?: number;
  sale_per_night?: number;
}

export interface PropertyRoomTypeOption {
  id: string; // Public UUID
  property_room_type_id?: string;
  name: string;
  price_per_night: number;
  total_units?: number;
  capacity?: number;
  pricing_tiers?: PropertyRoomTypePriceTier[]; // Capacity / guest-wise rates (e.g. 1 Guest: ₹1,500, 2 Guests: ₹1,800)
  is_selected?: boolean;
}

export interface AvailabilityQuoteData {
  property_name: string;
  property_slug?: string;
  selected_room_type?: string;
  room_types?: PropertyRoomTypeOption[];
  applied_tier?: {
    occupancy: number;
    price_per_night: number;
    sale_per_night?: number;
  };
  num_guests?: number;
  is_available: boolean;
  available_units?: number;
  requested_rooms?: number;
  check_in_date: string;
  check_out_date: string;
  formatted_check_in_date?: string;
  formatted_check_out_date?: string;
  nights?: number;
  num_nights?: number;
  price_per_night?: number;
  base_amount?: number;
  subtotal: number;
  discount_amount?: number;
  tax_amount?: number;
  total_amount: number;
  currency: string;
  currency_symbol?: string;
}

export interface PaymentGatewayInfo {
  gateway: string; // "razorpay"
  order_id: string; // Razorpay Order ID
  key_id?: string; // Razorpay Key ID
  amount: number;
  currency: string;
  payment_url: string;
  status: 'initiated' | 'pending' | 'success' | 'failed';
}

export interface BookingConfirmationData {
  booking_reference: string;
  id?: string | number;
  booking_id?: number | string;
  public_id?: string;
  status: string;
  payment_status: string;
  property_name: string;
  room_type_name?: string;
  applied_tier?: {
    occupancy: number;
    price_per_night: number;
    sale_per_night?: number;
  };
  price_per_night?: number;
  check_in_date: string;
  check_out_date: string;
  formatted_check_in_date?: string;
  formatted_check_out_date?: string;
  num_guests: number;
  num_rooms?: number;
  total_amount: number;
  currency: string;
  currency_symbol?: string;
  guest?: {
    id?: string | number;
    full_name?: string;
    email?: string;
  };
  payment_gateway?: PaymentGatewayInfo;
}

export interface AssistantToolCall {
  tool: string;
  arguments?: Record<string, any>;
  result?: any;
  is_error?: boolean;
}

export interface AssistantPagination {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
  has_next?: boolean;
  has_prev?: boolean;
}

export interface AssistantChatData {
  reply: string;
  session_id?: string;
  intent?: string;
  action_taken?: string;
  tool_calls?: AssistantToolCall[];
  search_results?: HomestayCardData[];
  pagination?: AssistantPagination;
  availability?: AvailabilityQuoteData | null;
  booking?: BookingConfirmationData | null;
  payment?: {
    booking_reference: string;
    id: string;
    property_name?: string;
    status: string;
    payment_status: string;
    total_amount: number;
    remaining_balance: number;
    currency: string;
    currency_symbol?: string;
    payment_gateway: PaymentGatewayInfo;
  };
  user?: any;
  suggested_actions?: string[];
}

export interface SuggestionItem {
  title: string;
  prompt: string;
  category?: string;
}

export interface AssistantCheckoutRequest {
  property_id: string;
  room_type_id?: string;
  check_in_date: string;
  check_out_date: string;
  num_guests: number;
  num_rooms?: number;
  special_requests?: string;
  guest_name?: string;
  guest_email?: string;
  guest_phone?: string;
  guest_password?: string;
}

export interface ChatMessageItem {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  data?: AssistantChatData;
  isLoading?: boolean;
}
