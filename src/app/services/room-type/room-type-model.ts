export interface RoomType {
  id: string;
  name: string;
  capacity: number;
  status: string;
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
}

export interface RoomTypeRequest {
  name: string;
  capacity: number;
}
