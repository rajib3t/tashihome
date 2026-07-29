import { inject, Service } from '@angular/core';
import { ApiService } from '../api/api-service';
import { LocationQuery, LocationRequest, LocationResponse } from './location-model';
import { Observable } from 'rxjs';
import { map, catchError } from "rxjs/operators";
import { ApiResponse, PaginatedResponse } from '../api/api-response.model';
@Service()
export class LocationService {
    public readonly apiService = inject(ApiService);


    public createLocation(location: LocationRequest): Observable<ApiResponse<LocationResponse>> {
            return this.apiService.protectedPost<ApiResponse<LocationResponse>>('/locations/', location).pipe(
                map(response => response.data),
                catchError(this.apiService.passthroughError)
            )
        }

    public updateLocation(id: string, location: Partial<LocationRequest>): Observable<ApiResponse<LocationResponse>> {
            return this.apiService.protectedPut<ApiResponse<LocationResponse>>(`/locations/${id}`, location).pipe(
                map(response => response.data),
                catchError(this.apiService.passthroughError)
            )
        }

    public statusUpdate(id: string, status: string): Observable<ApiResponse<LocationResponse>> {
            return this.apiService.protectedPatch<ApiResponse<LocationResponse>>(`/locations/${id}/${status}`, { status }).pipe(
                map(response => response.data),
                catchError(this.apiService.passthroughError)
            )
        }

    
    public getLocations(params:LocationQuery ): Observable<PaginatedResponse<LocationResponse>> {
            const search = params.search ?? {};
            const queryParams: Record<string, string | number> = {
                page: params.page ?? 1,
                size: params.size ?? 10,
            };
    
            const name = search.name?.trim();
            const city_id = search.city_id?.trim();
            const status = search.status?.trim();
    
            if (name) {
                queryParams['name'] = name;
            }
    
            if (city_id) {
                queryParams['city_id'] = city_id;
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
    
            return this.apiService.protectedGet<PaginatedResponse<LocationResponse>>('/locations/', { params: queryParams }).pipe(
                map(response => response.data),
                catchError(this.apiService.passthroughError)
            )
        }
   
}
