import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiResponse, PaginatedResponse } from '../api/api-response.model';
import { ApiService } from '../api/api-service';
import { Amenity, AmenityQuery } from './amenity-model';

@Injectable({ providedIn: 'root' })
export class AmenityService {
  private readonly apiService = inject(ApiService);

  public extractApiErrorMessage(error: any): string | null {
    return this.apiService.extractApiErrorMessage(error);
  }
  private buildQueryParams(params: AmenityQuery = {}): Record<string, string | number> {
    const search = params.search ?? {};
    const queryParams: Record<string, string | number> = {
      page: params.page ?? 1,
      size: params.size ?? 10,
    };

    const name = search.name?.trim();
    const status = search.status?.trim();

    if (name) queryParams['name'] = name;
    if (status) queryParams['status'] = status;
    if (params.sortBy?.trim()) queryParams['sortBy'] = params.sortBy.trim();
    if (params.sortOrder) queryParams['sortOrder'] = params.sortOrder;
    if (params.scope?.trim()) queryParams['scope'] = params.scope.trim();
    if (params.vendor_id?.trim()) queryParams['vendor_id'] = params.vendor_id.trim();

    return queryParams;
  }

  // ================= ADMIN APIs =================
  public readonly admin = {
    create: (data: FormData): Observable<ApiResponse<Amenity>> => {
      return this.apiService.protectedPost<ApiResponse<Amenity>>('/admin/amenities/', data).pipe(
        map((response) => response.data),
        catchError(this.apiService.passthroughError)
      );
    },

    getAmenities: (params: AmenityQuery = {}): Observable<PaginatedResponse<Amenity>> => {
      const queryParams = this.buildQueryParams(params);
      return this.apiService.protectedGet<PaginatedResponse<Amenity>>('/admin/amenities/', { params: queryParams }).pipe(
        map((response) => response.data),
        catchError(this.apiService.passthroughError)
      );
    },

    getAmenityById: (id: string): Observable<ApiResponse<Amenity>> => {
      return this.apiService.protectedGet<ApiResponse<Amenity>>(`/admin/amenities/${id}`).pipe(
        map((response) => response.data),
        catchError(this.apiService.passthroughError)
      );
    },

    update: (id: string, data: FormData): Observable<ApiResponse<Amenity>> => {
      return this.apiService.protectedPut<ApiResponse<Amenity>>(`/admin/amenities/${id}`, data).pipe(
        map((response) => response.data),
        catchError(this.apiService.passthroughError)
      );
    },

    statusUpdate: (id: string, status: string): Observable<ApiResponse<Amenity>> => {
      return this.apiService.protectedPatch<ApiResponse<Amenity>>(`/admin/amenities/${id}/${status}`, { status }).pipe(
        map((response) => response.data),
        catchError(this.apiService.passthroughError)
      );
    },
  };

  // ================= VENDOR APIs =================
  public readonly vendor = {
    getAmenities: (params: AmenityQuery = {}): Observable<PaginatedResponse<Amenity>> => {
      const queryParams = this.buildQueryParams(params);
      return this.apiService.protectedGet<PaginatedResponse<Amenity>>('/vendor/amenities/', { params: queryParams }).pipe(
        map((response) => response.data),
        catchError(this.apiService.passthroughError)
      );
    },

    create: (data: FormData): Observable<ApiResponse<Amenity>> => {
      return this.apiService.protectedPost<ApiResponse<Amenity>>('/vendor/amenities/', data).pipe(
        map((response) => response.data),
        catchError(this.apiService.passthroughError)
      );
    },

    update: (id: string, data: FormData): Observable<ApiResponse<Amenity>> => {
      return this.apiService.protectedPut<ApiResponse<Amenity>>(`/vendor/amenities/${id}`, data).pipe(
        map((response) => response.data),
        catchError(this.apiService.passthroughError)
      );
    },

    delete: (id: string): Observable<ApiResponse<void>> => {
      return this.apiService.protectedDelete<ApiResponse<void>>(`/vendor/amenities/${id}`).pipe(
        map((response) => response.data),
        catchError(this.apiService.passthroughError)
      );
    },

    statusUpdate: (id: string, status: string): Observable<ApiResponse<Amenity>> => {
      return this.apiService.protectedPatch<ApiResponse<Amenity>>(`/vendor/amenities/${id}/${status}`, { status }).pipe(
        map((response) => response.data),
        catchError(this.apiService.passthroughError)
      );
    },
  };
}