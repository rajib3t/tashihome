import { LocationSearch } from "../location/location-model";

export interface User {
    id: string;
    email: string;
    full_name: string;
    phone: string;
    status: string;
    role: UserRole;
    is_profile_image_url: string;
}

export type UserRole = 'user' | 'admin' | 'vendor';


export interface RequestVendor {
    full_name: string;
    email: string;
    phone: string;
}


export interface VendorSearch{
    name?: string;
    email?: string;
    phone?: string;
    status?: string;
}

export interface VendorQuery {
  page?: number;
  size?: number;
  search?: VendorSearch;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}