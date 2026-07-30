export interface Amenity {
  id: string;
  name: string;
  icon_url: string;
  status: string;
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
}
