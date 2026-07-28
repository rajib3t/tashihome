import { Country } from "../country/country-model";

export interface CityRequest {

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