export interface Facility{
    id:string
    name:string
    icon_url:string
    status : string
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
}