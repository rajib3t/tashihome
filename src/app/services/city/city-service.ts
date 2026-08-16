import { inject, Service } from '@angular/core';
import { ApiService } from '../api/api-service';
import { map, Observable, catchError } from 'rxjs';
import { ApiResponse, PaginatedResponse } from '../api/api-response.model';
import { CityQuery, CityRequest } from './city-model';
import { City } from './city-model';

@Service()
export class CityService {
    public apiService = inject(ApiService)



    public createCity(city: FormData): Observable<ApiResponse<City>> {
        return this.apiService.protectedPost<ApiResponse<City>>('/cities/', city).pipe(
            map(response => response.data),
            catchError(this.apiService.passthroughError)
        )
    }

    public getCities(params: CityQuery): Observable<PaginatedResponse<City>> {
        const search = params.search ?? {};
        const queryParams: Record<string, string | number> = {
            page: params.page ?? 1,
            size: params.size ?? 10,
        };

        const name = search.name?.trim();
        const country_id = search.country_id?.trim();
        const status = search.status?.trim();

        if (name) {
            queryParams['name'] = name;
        }

        if (country_id) {
            queryParams['country_id'] = country_id;
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

        return this.apiService.protectedGet<PaginatedResponse<City>>('/cities/', { params: queryParams }).pipe(
            map(response => response.data),
            catchError(this.apiService.passthroughError)
        )
    }

    public updateCity(id: string, city: Partial<CityRequest>): Observable<ApiResponse<City>> {
        return this.apiService.protectedPut<ApiResponse<City>>(`/cities/${id}`, city).pipe(
            map(response => response.data),
            catchError(this.apiService.passthroughError)
        )
    }

    public statusUpdate(id: string, status: string): Observable<ApiResponse<City>> {
        return this.apiService.protectedPatch<ApiResponse<City>>(`/cities/${id}/${status}`, { status }).pipe(
            map(response => response.data),
            catchError(this.apiService.passthroughError)
        )
    }

    public getPublicCities(params: CityQuery): Observable<PaginatedResponse<City>> {
        const search = params.search ?? {};
        const queryParams: Record<string, string | number | boolean> = {
            page: params.page ?? 1,
            size: params.size ?? 10,
        };

        const name = search.name?.trim();
        const country_id = search.country_id?.trim();
        const status = search.status?.trim();
        const is_featured = search.is_featured;

        if (name) {
            queryParams['name'] = name;
        }
        if (is_featured !== undefined) {
            queryParams['is_featured'] = is_featured;
        }

        if (country_id) {
            queryParams['country_id'] = country_id;
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

        return this.apiService.get<PaginatedResponse<City>>('/public/cities/', { params: queryParams }).pipe(
            map(response => response.data),
            catchError(this.apiService.passthroughError)
        )
    }

}
