
export interface Country {
    id: string;
    name: string;
    code: string;
    status: string;
}

export interface CountrySearch{
    name?: string;
    code?: string;
    status?: string;
}

export interface CountryQuery {
  page?: number;
  size?: number;
  search?: CountrySearch;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}



export interface CountryRequest {
    name: string;
    code: string;
    
}
