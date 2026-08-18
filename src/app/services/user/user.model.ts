import { LocationSearch } from "../location/location-model";

export interface User {
    id: string;
    email: string;
    full_name: string;
    phone: string;
    status: string;
    role: UserRole;
    is_profile_image_url: string;
    created_at: string;
}

export type UserRole = 'user' | 'admin' | 'vendor';


export interface VendorAddress {
    address_line1: string;
    address_line2?: string;
    postal_code: string;
    country: string;
}

export interface VendorCompany {
    name: string;
    email: string;
    phone: string;
    address: VendorAddress;
}

export interface RequestVendor {
    full_name: string;
    email: string;
    phone: string;
    company?: VendorCompany;
}

export interface VendorUpdateRequest extends RequestVendor {}

export interface VendorAddressDetail extends VendorAddress {
    id?: string;
}

export interface VendorCompanyDetail extends VendorCompany {
    id?: string;
    address: VendorAddressDetail;
}

export interface VendorDetail extends User {
   
    company?: VendorCompanyDetail;
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




export interface RegisterUserRequest {
    email: string;
    full_name: string;
    password: string;
    phone: string;
    is_subscriber: boolean;
    is_terms_accept: boolean;
}

export interface RegisterUserResponse {
    full_name: string;
    email: string;
    phone: string;
}

