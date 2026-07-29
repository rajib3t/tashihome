import { City } from "../city/city-model";

export interface LocationRequest {
    name: string;
    city_id: string;
}

export interface LocationResponse {
    name: string;
    city?:City;
    status: string;
    id: string;
    
}


export interface LocationSearch{
    name?: string;
    city_id?: string;
    status?: string;
}

export interface LocationQuery {
  page?: number;
  size?: number;
  search?: LocationSearch;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}