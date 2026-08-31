export type StaffRole = 'admin' | 'staff';

export interface StaffUser {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  status: string; // 'active' | 'inactive'
  role: StaffRole;
  is_profile_image_url?: string;
  is_subscribed?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateStaffDTO {
  full_name: string;
  email: string;
  phone: string;
  password?: string;
  role: StaffRole;
  is_subscribed?: boolean;
}

export interface UpdateStaffDTO {
  full_name?: string;
  email?: string;
  phone?: string;
  role?: StaffRole;
  is_subscribed?: boolean;
}

export interface UpdateStaffStatusDTO {
  status: 'active' | 'inactive' | string;
}

export interface StaffSearch {
  name?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  role?: StaffRole | string;
  status?: string;
}

export interface StaffQuery {
  page?: number;
  size?: number;
  search?: StaffSearch;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

