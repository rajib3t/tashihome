import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from '../api/api-service';
import { ApiResponse, PaginatedResponse } from '../api/api-response.model';
import { LocationQuery, LocationRequest, LocationResponse } from './location-model';

@Injectable({ providedIn: 'root' })
export class LocationService {
  public readonly apiService = inject(ApiService);

  private buildQueryParams(params: LocationQuery = {}, isPublic = false): Record<string, string | number | boolean> {
    const search = params.search ?? {};
    const queryParams: Record<string, string | number | boolean> = {
      page: params.page ?? 1,
      size: params.size ?? 10,
    };

    const name = search.name?.trim();
    const city_id = search.city_id?.trim();
    const status = search.status?.trim();

    if (name) queryParams['name'] = name;
    if (city_id) queryParams['city_id'] = city_id;
    if (status) queryParams['status'] = status;
    if (params.sortBy?.trim()) queryParams['sortBy'] = params.sortBy.trim();
    if (params.sortOrder) queryParams['sortOrder'] = params.sortOrder;

    

    return queryParams;
  }

  // ================= ADMIN APIs =================
  public readonly admin = {
    createLocation: (location: LocationRequest): Observable<ApiResponse<LocationResponse>> => {
      return this.apiService.protectedPost<ApiResponse<LocationResponse>>('/admin/locations/', location).pipe(
        map((response) => response.data),
        catchError(this.apiService.passthroughError)
      );
    },

    getLocations: (params: LocationQuery = {}): Observable<PaginatedResponse<LocationResponse>> => {
      const queryParams = this.buildQueryParams(params);
      return this.apiService.protectedGet<PaginatedResponse<LocationResponse>>('/admin/locations/', { params: queryParams }).pipe(
        map((response) => response.data),
        catchError(this.apiService.passthroughError)
      );
    },

    getLocationById: (id: string): Observable<ApiResponse<LocationResponse>> => {
      return this.apiService.protectedGet<ApiResponse<LocationResponse>>(`/admin/locations/${id}`).pipe(
        map((response) => response.data),
        catchError(this.apiService.passthroughError)
      );
    },

    updateLocation: (id: string, location: Partial<LocationRequest>): Observable<ApiResponse<LocationResponse>> => {
      return this.apiService.protectedPut<ApiResponse<LocationResponse>>(`/admin/locations/${id}`, location).pipe(
        map((response) => response.data),
        catchError(this.apiService.passthroughError)
      );
    },

    statusUpdate: (id: string, status: string): Observable<ApiResponse<LocationResponse>> => {
      return this.apiService.protectedPatch<ApiResponse<LocationResponse>>(`/admin/locations/${id}/${status}`, { status }).pipe(
        map((response) => response.data),
        catchError(this.apiService.passthroughError)
      );
    },
  };
  // ================= VENDOR APIs =================
  public readonly vendor = {
    getLocations: (params: LocationQuery = {}): Observable<PaginatedResponse<LocationResponse>> => {
      const queryParams = this.buildQueryParams(params, true);
      return this.apiService.get<PaginatedResponse<LocationResponse>>('/vendor/locations/', { params: queryParams }).pipe(
        map((response) => response.data),
        catchError(this.apiService.passthroughError)
      );
    },
  }
  // ================= PUBLIC APIs =================
  
}