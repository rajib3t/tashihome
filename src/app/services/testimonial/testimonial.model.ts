export type TestimonialStatus = 'pending' | 'approved' | 'rejected' | 'hidden';
export type TestimonialUserRole = 'user' | 'vendor';

export interface TestimonialData {
  id: string;
  name: string;
  designation?: string | null;
  avatar_url?: string | null;
  rating?: number | null;
  content: string;
  status: TestimonialStatus;
  user_role?: TestimonialUserRole;
  is_featured?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface PublicTestimonialsParams {
  is_featured?: boolean;
  user_role?: TestimonialUserRole;
  page?: number;
  page_size?: number;
  sort_order?: 'asc' | 'desc';
}

export interface SubmitTestimonialRequest {
  name?: string;
  designation?: string;
  avatar_url?: string;
  rating?: number;
  content: string;
}

export interface UpdateTestimonialRequest {
  name?: string;
  designation?: string;
  avatar_url?: string;
  rating?: number;
  content?: string;
}

export interface AdminTestimonialQuery {
  page?: number;
  page_size?: number;
  status?: TestimonialStatus;
  user_role?: TestimonialUserRole;
  is_featured?: boolean;
  search?: string;
  sort_order?: 'asc' | 'desc';
}

export interface AdminFeatureTestimonialRequest {
  is_featured: boolean;
}

export interface AdminUpdateStatusTestimonialRequest {
  status: TestimonialStatus;
}

