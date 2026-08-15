import { Country } from "../country/country-model";

export interface CityRequest {
  name?: string;
  country_id?: string;
  image_url?: string | File | null;
  status?: string;
  is_featured?: boolean | string;
  short_description?: string;
  tag_line?: string;
}

export interface City {
  name: string;
  country?: Country;
  image_url: string;
  is_featured: boolean | null;
  short_description: string | null;
  tag_line: string | null;
  status: string;
  id: string;
}

export interface CitySearch {
  name?: string;
  country_id?: string;
  status?: string;
  is_featured?: boolean | string;
}

export interface CityQuery {
  page?: number;
  size?: number;
  search?: CitySearch;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
