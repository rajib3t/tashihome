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

function buildPropertyQueryParams(query?: PropertyQuery): Record<string, string | number | boolean> {
  const search = query?.search ?? {};
  const queryParams: Record<string, string | number | boolean> = {
    page: query?.page ?? 1,
    size: query?.size ?? 10,
  };

  const name = search.name?.trim();
  const type = search.type?.trim();
  const city = search.city?.trim();
  const city_id = search.city_id?.trim();
  const location = search.location?.trim();
  const location_id = search.location_id?.trim();
  const status = search.status?.trim();
  const is_featured = search.is_featured;

  if (name) queryParams['name'] = name;
  if (type) queryParams['type'] = type;
  if (city) queryParams['city'] = city;
  if (city_id) queryParams['city_id'] = city_id;
  if (location) queryParams['location'] = location;
  if (location_id) queryParams['location_id'] = location_id;
  if (status) queryParams['status'] = status;
  if (is_featured !== undefined) queryParams['is_featured'] = is_featured;

  if (query?.sortBy?.trim()) {
    queryParams['sortBy'] = query.sortBy.trim();
  }
  if (query?.sortOrder) {
    queryParams['sortOrder'] = query.sortOrder;
  }

  return queryParams;
}

@Injectable({ providedIn: 'root' })
export class PropertyService {
  private readonly apiService = inject(ApiService);

  public extractApiErrorMessage(error: any): string | null {
    return this.apiService.extractApiErrorMessage(error);
  }
  // ================= ADMIN APIs =================
  public readonly admin = {
    getProperties: (query?: PropertyQuery): Observable<PaginatedResponse<PropertyData>> => {
      const queryParams = buildPropertyQueryParams(query);
      return this.apiService.protectedGet<PaginatedResponse<PropertyData>>('/admin/properties', { params: queryParams }).pipe(
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
      const queryParams = buildPropertyQueryParams(query);
      return this.apiService.protectedGet<PaginatedResponse<PropertyData>>('/vendor/properties/', { params: queryParams }).pipe(
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
      const queryParams = buildPropertyQueryParams(params);
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
