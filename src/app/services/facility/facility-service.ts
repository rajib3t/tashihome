import { inject, Service } from '@angular/core';
import { catchError, map, Observable } from 'rxjs';
import { ApiResponse, PaginatedResponse } from '../api/api-response.model';
import { ApiService } from '../api/api-service';
import { Facility, FacilityQuery } from './facility-model';

@Service()
export class FacilityService {
    public readonly apiService = inject(ApiService)


     public create(data: FormData): Observable<ApiResponse<Facility>> {
        return this.apiService.protectedPost<ApiResponse<Facility>>('/facilities/', data).pipe(
            map(response => response.data),
            catchError(this.apiService.passthroughError)
        )
    }


    public getFacilities(params:FacilityQuery ): Observable<PaginatedResponse<Facility>> {
        const search = params.search ?? {};
        const queryParams: Record<string, string | number> = {
            page: params.page ?? 1,
            size: params.size ?? 10,
        };

        const name = search.name?.trim();
        
        const status = search.status?.trim();

        if (name) {
            queryParams['name'] = name;
        }

        

        if (status) {
            queryParams['status'] = status;
        }

        if (params.sortBy?.trim()) {
            queryParams['sortBy'] = params.sortBy.trim();
        }

        if (params.sortOrder) {
            queryParams['sortOrder'] = params.sortOrder;
        }

        return this.apiService.protectedGet<PaginatedResponse<Facility>>('/facilities/', { params: queryParams }).pipe(
            map(response => response.data),
            catchError(this.apiService.passthroughError)
        )
    }

    public update(id: string, data: FormData): Observable<ApiResponse<Facility>> {
        return this.apiService.protectedPut<ApiResponse<Facility>>(`/facilities/${id}`, data).pipe(
            map(response => response.data),
            catchError(this.apiService.passthroughError)
        )
    }

    public statusUpdate(id: string, status: string): Observable<ApiResponse<Facility>> {
        return this.apiService.protectedPatch<ApiResponse<Facility>>(`/facilities/${id}/${status}`, { status }).pipe(
            map(response => response.data),
            catchError(this.apiService.passthroughError)
        )
    }
    
}
