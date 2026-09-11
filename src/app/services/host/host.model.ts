export interface BecomeHostRequest {
  full_name: string;
  email: string;
  phone: string;
  company_name?: string;
  property_name: string;
  property_type: string;
  city: string;
  address: string;
  expected_rooms: number;
  notes?: string;
}

export interface BecomeHostResponse {
  success?: boolean;
  message?: string;
  data?: any;
}

export type HostRequestStatus = 'pending' | 'under_review' | 'approved' | 'rejected' | 'converted';

export interface HostRequestMessage {
  id: string;
  sender_id?: string;
  sender_name?: string;
  sender_role?: string;
  message: string;
  is_internal: boolean;
  created_at: string;
}

export interface HostRequest {
  id: string;
  public_id?: string;
  user_id?: string;
  full_name: string;
  email: string;
  phone: string;
  company_name?: string;
  property_name: string;
  property_type: string;
  city: string;
  address: string;
  expected_rooms: number;
  notes?: string;
  status: HostRequestStatus | string;
  reviewed_by?: string;
  reviewed_at?: string;
  converted_user_id?: string;
  created_at: string;
  updated_at?: string;
  messages?: HostRequestMessage[];
}

export interface HostRequestSearch {
  full_name?: string;
  email?: string;
  phone?: string;
  property_name?: string;
  city?: string;
  property_type?: string;
  status?: string;
  query?: string;
}

export interface HostRequestQuery {
  search?: HostRequestSearch;
  page?: number;
  size?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AddHostRequestMessagePayload {
  message: string;
  is_internal?: boolean;
}

export interface UpdateHostRequestStatusPayload {
  status: HostRequestStatus | string;
  notes?: string;
}

export interface ConvertHostRequestPayload {
  company_name: string;
  company_email: string;
  company_phone: string;
  address_line1: string;
  address_line2?: string;
  postal_code: string;
  country: string;
  temporary_password?: string;
}
