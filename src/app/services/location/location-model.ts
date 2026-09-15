import { City } from "../city/city-model";

export interface LocationRequest {
    name: string;
    city_id: string;
}

export interface LocationResponse {
    name: string;
    slug?: string;
    image_url?: string | null;
    description?: string;
    city?: City;
    status: string;
    id: string;
}

export interface LocationSearch {
    name?: string;
    slug?: string;
    city_id?: string;
    city_slug?: string;
    status?: string;
}

export interface LocationQuery {
  page?: number;
  size?: number;
  search?: LocationSearch;
  city_id?: string;
  city_slug?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}


