import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from '../api/api-service';
import { ApiResponse, PaginatedResponse } from '../api/api-response.model';
import {
  PropertyDTO,
  PropertyQuery,
  PropertyMediaUploadResponse,
  PropertyUpdateRequest,
  CreatePropertyRequest,
  PropertyData
} from './property.model';

@Injectable({ providedIn: 'root' })
export class PropertyService {
  private readonly apiService = inject(ApiService);

  // ================= ADMIN APIs =================
  public readonly admin = {
    getProperties: (query?: PropertyQuery): Observable<PaginatedResponse<PropertyData>> => {
      return this.apiService.protectedGet<PaginatedResponse<PropertyData>>('/admin/properties', { params: query }).pipe(
        map((res) => res.data),
        catchError(this.apiService.passthroughError)
      );
    },

    getPropertyById: (id: string): Observable<ApiResponse<PropertyData>> => {
      return this.apiService.protectedGet<ApiResponse<PropertyData>>(`/admin/properties/${id}`).pipe(
        map((res) => res.data),
        catchError(this.apiService.passthroughError)
      );
    },

    createProperty: (property: CreatePropertyRequest): Observable<ApiResponse<PropertyData>> => {
      return this.apiService.protectedPost<ApiResponse<PropertyData>>('/admin/properties/', property).pipe(
        map((res) => res.data),
        catchError(this.apiService.passthroughError)
      );
    },

    updateProperty: (id: string, property: PropertyUpdateRequest): Observable<ApiResponse<PropertyData>> => {
      return this.apiService.protectedPut<ApiResponse<PropertyData>>(`/admin/properties/${id}`, property).pipe(
        map((res) => res.data),
        catchError(this.apiService.passthroughError)
      );
    },

    uploadMedia: (id: string, formData: FormData): Observable<ApiResponse<PropertyMediaUploadResponse>> => {
      return this.apiService.protectedUpload<ApiResponse<PropertyMediaUploadResponse>>(`/admin/properties/${id}/media`, formData).pipe(
        map((res) => res.data),
        catchError(this.apiService.passthroughError)
      );
    },

    deleteAsset: (propertyId: string, assetId: string): Observable<ApiResponse<void>> => {
      return this.apiService.protectedDelete<void>(`/admin/properties/${propertyId}/assets/${assetId}`).pipe(
        catchError(this.apiService.passthroughError)
      );
    }
  };

  // ================= VENDOR APIs =================
  public readonly vendor = {
    getProperties: (query?: PropertyQuery): Observable<PaginatedResponse<PropertyData>> => {
      return this.apiService.protectedGet<PaginatedResponse<PropertyData>>('/vendor/properties', { params: query }).pipe(
        map((res) => res.data),
        catchError(this.apiService.passthroughError)
      );
    },

    getPropertyById: (id: string): Observable<ApiResponse<PropertyData>> => {
      return this.apiService.protectedGet<ApiResponse<PropertyData>>(`/vendor/properties/${id}`).pipe(
        map((res) => res.data),
        catchError(this.apiService.passthroughError)
      );
    },

    createProperty: (property: CreatePropertyRequest): Observable<ApiResponse<PropertyData>> => {
      return this.apiService.protectedPost<ApiResponse<PropertyData>>('/vendor/properties/', property).pipe(
        map((res) => res.data),
        catchError(this.apiService.passthroughError)
      );
    },

    updateProperty: (id: string, property: PropertyUpdateRequest): Observable<ApiResponse<PropertyData>> => {
      return this.apiService.protectedPut<ApiResponse<PropertyData>>(`/vendor/properties/${id}`, property).pipe(
        map((res) => res.data),
        catchError(this.apiService.passthroughError)
      );
    },

    uploadMedia: (id: string, formData: FormData): Observable<ApiResponse<PropertyMediaUploadResponse>> => {
      return this.apiService.protectedUpload<ApiResponse<PropertyMediaUploadResponse>>(`/vendor/properties/${id}/media`, formData).pipe(
        map((res) => res.data),
        catchError(this.apiService.passthroughError)
      );
    },

    deleteAsset: (propertyId: string, assetId: string): Observable<ApiResponse<void>> => {
      return this.apiService.protectedDelete<void>(`/vendor/properties/${propertyId}/assets/${assetId}`).pipe(
        catchError(this.apiService.passthroughError)
      );
    }
  };

  // ================= PUBLIC APIs =================
  public readonly public = {
    getProperties: (params: PropertyQuery): Observable<PaginatedResponse<Partial<PropertyData>>> => {
      const search = params.search ?? {};
      const queryParams: Record<string, string | number | boolean> = {
        page: params.page ?? 1,
        size: params.size ?? 10,
      };

      const city = search.city?.trim();
      const location = search.location?.trim();
      const is_featured = search.is_featured;
      const status = search.status?.trim();

      if (city) queryParams['city_id'] = city;
      if (location) queryParams['location_id'] = location;
      if (status) queryParams['status'] = status;
      if (is_featured !== undefined) queryParams['is_featured'] = is_featured;

      return this.apiService.get<PaginatedResponse<Partial<PropertyData>>>('/public/properties/', { params: queryParams }).pipe(
        map((res) => res.data),
        catchError(this.apiService.passthroughError)
      );
    },

    getPropertyBySlug: (slug: string): Observable<ApiResponse<Partial<PropertyData>>> => {
      return this.apiService.get<ApiResponse<Partial<PropertyData>>>(`/public/properties/${slug}`).pipe(
        map((res) => res.data),
        catchError(this.apiService.passthroughError)
      );
    }
  };
}

