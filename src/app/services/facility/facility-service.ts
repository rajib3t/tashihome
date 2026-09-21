import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiResponse, PaginatedResponse } from '../api/api-response.model';
import { ApiService } from '../api/api-service';
import { Facility, FacilityQuery } from './facility-model';

@Injectable({ providedIn: 'root' })
export class FacilityService {
  private readonly apiService = inject(ApiService);

  public extractApiErrorMessage(error: any): string | null {
    return this.apiService.extractApiErrorMessage(error);
  }
  private buildQueryParams(params: FacilityQuery = {}): Record<string, string | number> {
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
    create: (data: FormData): Observable<ApiResponse<Facility>> => {
      return this.apiService.protectedPost<ApiResponse<Facility>>('/admin/facilities/', data).pipe(
        map((response) => response.data),
        catchError(this.apiService.passthroughError)
      );
    },

    getFacilities: (params: FacilityQuery = {}): Observable<PaginatedResponse<Facility>> => {
      const queryParams = this.buildQueryParams(params);
      return this.apiService.protectedGet<PaginatedResponse<Facility>>('/admin/facilities/', { params: queryParams }).pipe(
        map((response) => response.data),
        catchError(this.apiService.passthroughError)
      );
    },

    getFacilityById: (id: string): Observable<ApiResponse<Facility>> => {
      return this.apiService.protectedGet<ApiResponse<Facility>>(`/admin/facilities/${id}`).pipe(
        map((response) => response.data),
        catchError(this.apiService.passthroughError)
      );
    },

    update: (id: string, data: FormData): Observable<ApiResponse<Facility>> => {
      return this.apiService.protectedPut<ApiResponse<Facility>>(`/admin/facilities/${id}`, data).pipe(
        map((response) => response.data),
        catchError(this.apiService.passthroughError)
      );
    },

    statusUpdate: (id: string, status: string): Observable<ApiResponse<Facility>> => {
      return this.apiService.protectedPatch<ApiResponse<Facility>>(`/admin/facilities/${id}/${status}`, { status }).pipe(
        map((response) => response.data),
        catchError(this.apiService.passthroughError)
      );
    },
  };

  // ================= VENDOR APIs =================
  public readonly vendor = {
    getFacilities: (params: FacilityQuery = {}): Observable<PaginatedResponse<Facility>> => {
      const queryParams = this.buildQueryParams(params);
      return this.apiService.protectedGet<PaginatedResponse<Facility>>('/vendor/facilities/', { params: queryParams }).pipe(
        map((response) => response.data),
        catchError(this.apiService.passthroughError)
      );
    },

    create: (data: FormData): Observable<ApiResponse<Facility>> => {
      return this.apiService.protectedPost<ApiResponse<Facility>>('/vendor/facilities/', data).pipe(
        map((response) => response.data),
        catchError(this.apiService.passthroughError)
      );
    },

    update: (id: string, data: FormData): Observable<ApiResponse<Facility>> => {
      return this.apiService.protectedPut<ApiResponse<Facility>>(`/vendor/facilities/${id}`, data).pipe(
        map((response) => response.data),
        catchError(this.apiService.passthroughError)
      );
    },

    delete: (id: string): Observable<ApiResponse<void>> => {
      return this.apiService.protectedDelete<ApiResponse<void>>(`/vendor/facilities/${id}`).pipe(
        map((response) => response.data),
        catchError(this.apiService.passthroughError)
      );
    },

    statusUpdate: (id: string, status: string): Observable<ApiResponse<Facility>> => {
      return this.apiService.protectedPatch<ApiResponse<Facility>>(`/vendor/facilities/${id}/${status}`, { status }).pipe(
        map((response) => response.data),
        catchError(this.apiService.passthroughError)
      );
    },
  };
}