export interface RoomType {
  id: string;
  name: string;
  capacity: number;
  status: string;
  is_global: boolean;
  vendor_id?: string | null;
}

export interface RoomTypeSearch {
  name?: string;
  status?: string;
}

export interface RoomTypeQuery {
  page?: number;
  size?: number;
  search?: RoomTypeSearch;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  scope?: 'global' | 'vendor' | 'vendor_combined' | 'all' | string;
  vendor_id?: string;
}

export interface RoomTypeRequest {
  name: string;
  capacity: number;
  vendor_id?: string | null;
}

