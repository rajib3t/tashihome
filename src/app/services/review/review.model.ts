export type ReviewStatus = 'pending' | 'published' | 'hidden' | 'flagged' | 'rejected';

export interface ReviewGuest {
  id: string;
  full_name: string;
  is_profile_image_url?: string | null;
  email?: string;
}

export interface ReviewProperty {
  id: string;
  name: string;
  slug: string;
}

export interface ReviewBooking {
  id: string;
  booking_reference: string;
  check_in_date?: string;
  check_out_date?: string;
}

export interface ReviewData {
  id: string;
  rating: number;
  comment: string;
  host_reply?: string | null;
  host_replied_at?: string | null;
  status: ReviewStatus;
  created_at: string;
  updated_at?: string;
  guest?: ReviewGuest;
  property?: ReviewProperty;
  booking?: ReviewBooking;
}

export interface RatingDistribution {
  [rating: string]: number | undefined;
  '1'?: number;
  '2'?: number;
  '3'?: number;
  '4'?: number;
  '5'?: number;
}

export interface ReviewSummary {
  average_rating: number;
  total_reviews: number;
  rating_distribution: RatingDistribution;
}

export interface PublicPropertyReviewsResponseData {
  data: ReviewData[];
  meta: {
    pagination: {
      total: number;
      page: number;
      page_size: number;
      pages: number;
    };
    summary: ReviewSummary;
  };
}

export interface SubmitReviewRequest {
  booking_id?: string;
  booking_reference?: string;
  rating: number;
  comment: string;
}

export interface UpdateReviewRequest {
  rating?: number;
  comment?: string;
}

export interface HostReplyRequest {
  host_reply: string;
}

export interface AdminReviewStatusRequest {
  status: ReviewStatus;
}

export interface ReviewQuery {
  page?: number;
  page_size?: number;
  sort_order?: 'asc' | 'desc';
  status?: ReviewStatus;
  property_id?: string;
  search?: string;
}

