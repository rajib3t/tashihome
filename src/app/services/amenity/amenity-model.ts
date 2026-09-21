export interface Amenity {
  id: string;
  name: string;
  icon_url: string;
  status: string;
  is_global: boolean;
  vendor_id?: string | null;
}

export interface AmenitySearch {
  name?: string;
  status?: string;
}

export interface AmenityQuery {
  page?: number;
  size?: number;
  search?: AmenitySearch;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  scope?: 'global' | 'vendor' | 'vendor_combined' | 'all' | string;
  vendor_id?: string;
}
