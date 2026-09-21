import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiResponse, PaginatedResponse } from '../api/api-response.model';
import { ApiService } from '../api/api-service';
import { RoomType, RoomTypeQuery, RoomTypeRequest } from './room-type-model';

@Injectable({ providedIn: 'root' })
export class RoomTypeService {
  private readonly apiService = inject(ApiService);
  public extractApiErrorMessage(error: any): string | null {
    return this.apiService.extractApiErrorMessage(error);
  }
  private buildQueryParams(params: RoomTypeQuery = {}): Record<string, string | number> {
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
    create: (data: RoomTypeRequest): Observable<ApiResponse<RoomType>> => {
      return this.apiService.protectedPost<ApiResponse<RoomType>>('/admin/room-types/', data).pipe(
        map((response) => response.data),
        catchError(this.apiService.passthroughError)
      );
    },

    getRoomTypes: (params: RoomTypeQuery = {}): Observable<PaginatedResponse<RoomType>> => {
      const queryParams = this.buildQueryParams(params);
      return this.apiService.protectedGet<PaginatedResponse<RoomType>>('/admin/room-types/', { params: queryParams }).pipe(
        map((response) => response.data),
        catchError(this.apiService.passthroughError)
      );
    },

    getRoomTypeById: (id: string): Observable<ApiResponse<RoomType>> => {
      return this.apiService.protectedGet<ApiResponse<RoomType>>(`/admin/room-types/${id}`).pipe(
        map((response) => response.data),
        catchError(this.apiService.passthroughError)
      );
    },

    update: (id: string, data: RoomTypeRequest): Observable<ApiResponse<RoomType>> => {
      return this.apiService.protectedPut<ApiResponse<RoomType>>(`/admin/room-types/${id}`, data).pipe(
        map((response) => response.data),
        catchError(this.apiService.passthroughError)
      );
    },

    statusUpdate: (id: string, status: string): Observable<ApiResponse<RoomType>> => {
      return this.apiService.protectedPatch<ApiResponse<RoomType>>(`/admin/room-types/${id}/${status}`, { status }).pipe(
        map((response) => response.data),
        catchError(this.apiService.passthroughError)
      );
    },
  };

  // ================= VENDOR APIs =================
  public readonly vendor = {
    getRoomTypes: (params: RoomTypeQuery = {}): Observable<PaginatedResponse<RoomType>> => {
      const queryParams = this.buildQueryParams(params);
      return this.apiService.protectedGet<PaginatedResponse<RoomType>>('/vendor/room-types/', { params: queryParams }).pipe(
        map((response) => response.data),
        catchError(this.apiService.passthroughError)
      );
    },

    create: (data: RoomTypeRequest): Observable<ApiResponse<RoomType>> => {
      return this.apiService.protectedPost<ApiResponse<RoomType>>('/vendor/room-types/', data).pipe(
        map((response) => response.data),
        catchError(this.apiService.passthroughError)
      );
    },

    update: (id: string, data: RoomTypeRequest): Observable<ApiResponse<RoomType>> => {
      return this.apiService.protectedPut<ApiResponse<RoomType>>(`/vendor/room-types/${id}`, data).pipe(
        map((response) => response.data),
        catchError(this.apiService.passthroughError)
      );
    },

    delete: (id: string): Observable<ApiResponse<void>> => {
      return this.apiService.protectedDelete<ApiResponse<void>>(`/vendor/room-types/${id}`).pipe(
        map((response) => response.data),
        catchError(this.apiService.passthroughError)
      );
    },

    statusUpdate: (id: string, status: string): Observable<ApiResponse<RoomType>> => {
      return this.apiService.protectedPatch<ApiResponse<RoomType>>(`/vendor/room-types/${id}/${status}`, { status }).pipe(
        map((response) => response.data),
        catchError(this.apiService.passthroughError)
      );
    },
  };
}