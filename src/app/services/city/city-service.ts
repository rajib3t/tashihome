import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from '../api/api-service';
import { ApiResponse, PaginatedResponse } from '../api/api-response.model';
import { CityQuery, CityRequest, City } from './city-model';

@Injectable({ providedIn: 'root' })
export class CityService {
  private readonly apiService = inject(ApiService);

  public extractApiErrorMessage(error: any): string | null {
    return this.apiService.extractApiErrorMessage(error);
  }
  // ================= ADMIN APIs =================
  public readonly admin = {
    createCity: (city: FormData): Observable<ApiResponse<City>> => {
      return this.apiService.protectedPost<ApiResponse<City>>('/admin/cities/', city).pipe(
        map((response) => response.data),
        catchError(this.apiService.passthroughError)
      );
    },

    getCities: (params: CityQuery = {}): Observable<PaginatedResponse<City>> => {
      const search = params.search ?? {};
      const queryParams: Record<string, string | number> = {
        page: params.page ?? 1,
        size: params.size ?? 10,
      };

      const name = search.name?.trim();
      const country_id = search.country_id?.trim();
      const status = search.status?.trim();

      if (name) queryParams['name'] = name;
      if (country_id) queryParams['country_id'] = country_id;
      if (status) queryParams['status'] = status;
      if (params.sortBy?.trim()) queryParams['sortBy'] = params.sortBy.trim();
      if (params.sortOrder) queryParams['sortOrder'] = params.sortOrder;

      return this.apiService.protectedGet<PaginatedResponse<City>>('/admin/cities/', { params: queryParams }).pipe(
        map((response) => response.data),
        catchError(this.apiService.passthroughError)
      );
    },

    updateCity: (id: string, city: Partial<CityRequest>): Observable<ApiResponse<City>> => {
      return this.apiService.protectedPut<ApiResponse<City>>(`/admin/cities/${id}`, city).pipe(
        map((response) => response.data),
        catchError(this.apiService.passthroughError)
      );
    },

    statusUpdate: (id: string, status: string): Observable<ApiResponse<City>> => {
      return this.apiService.protectedPatch<ApiResponse<City>>(`/admin/cities/${id}/${status}`, { status }).pipe(
        map((response) => response.data),
        catchError(this.apiService.passthroughError)
      );
    },
  };

  // ================= Vendor APIs =================

  public readonly vendor = {
    getCities: (params: CityQuery = {}): Observable<PaginatedResponse<City>> => {
      const search = params.search ?? {};
      const queryParams: Record<string, string | number> = {
        page: params.page ?? 1,
        size: params.size ?? 10,
      };

      const name = search.name?.trim();
      const country_id = search.country_id?.trim();
      const status = search.status?.trim();

      if (name) queryParams['name'] = name;
      if (country_id) queryParams['country_id'] = country_id;
      if (status) queryParams['status'] = status;
      if (params.sortBy?.trim()) queryParams['sortBy'] = params.sortBy.trim();
      if (params.sortOrder) queryParams['sortOrder'] = params.sortOrder;

      return this.apiService.protectedGet<PaginatedResponse<City>>('/vendor/cities/', { params: queryParams }).pipe(
        map((response) => response.data),
        catchError(this.apiService.passthroughError)
      );
    },
  }

  // ================= PUBLIC APIs =================
  public readonly public = {
    getCities: (params: CityQuery = {}): Observable<PaginatedResponse<City>> => {
      const search = params.search ?? {};
      const queryParams: Record<string, string | number | boolean> = {
        page: params.page ?? 1,
        size: params.size ?? 10,
      };

      const name = search.name?.trim();
      const country_id = search.country_id?.trim();
      const status = search.status?.trim();
      const is_featured = search.is_featured;

      if (name) queryParams['name'] = name;
      if (is_featured !== undefined) queryParams['is_featured'] = is_featured;
      if (country_id) queryParams['country_id'] = country_id;
      if (status) queryParams['status'] = status;
      if (params.sortBy?.trim()) queryParams['sortBy'] = params.sortBy.trim();
      if (params.sortOrder) queryParams['sortOrder'] = params.sortOrder;

      return this.apiService.get<PaginatedResponse<City>>('/public/cities/', { params: queryParams }).pipe(
        map((response) => response.data),
        catchError(this.apiService.passthroughError)
      );
    },
  };
}