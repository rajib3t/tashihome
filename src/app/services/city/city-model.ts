import { Country } from "../country/country-model";

export interface CityRequest {
  name?: string;
  country_id?: string;
  image_url?: string | File | null;
  status?: string;
}

export interface City {
  name: string;
  country?:Country
  image_url: string;
  status: string;
  id: string;
}

export interface CitySearch{
    name?: string;
    country_id?: string;
    status?: string;
}

export interface CityQuery {
  page?: number;
  size?: number;
  search?: CitySearch;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
