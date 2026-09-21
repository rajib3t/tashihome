export interface Facility {
  id: string;
  name: string;
  icon_url: string;
  status: string;
  is_global: boolean;
  vendor_id?: string | null;
}


export interface FacilitySearch{
    name?: string;
    status?: string;
}

export interface FacilityQuery {
  page?: number;
  size?: number;
  search?: FacilitySearch;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  scope?: 'global' | 'vendor' | 'vendor_combined' | 'all' | string;
  vendor_id?: string;
}