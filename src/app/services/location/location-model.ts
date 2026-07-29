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