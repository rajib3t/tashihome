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
  PropertyData,
  PropertyPublicSearchParams
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

function buildPropertySearchParams(params?: PropertyPublicSearchParams): Record<string, string | number | boolean> {
  const queryParams: Record<string, string | number | boolean> = {
    page: params?.page ?? 1,
    size: params?.size ?? 10,
  };

  if (params?.search?.trim()) queryParams['search'] = params.search.trim();
  if (params?.q?.trim()) queryParams['q'] = params.q.trim();
  if (params?.region?.trim()) queryParams['region'] = params.region.trim();
  if (params?.city_name?.trim()) queryParams['city_name'] = params.city_name.trim();
  if (params?.city?.trim()) queryParams['city'] = params.city.trim();
  if (params?.city_id?.trim()) queryParams['city_id'] = params.city_id.trim();
  if (params?.location_name?.trim()) queryParams['location_name'] = params.location_name.trim();
  if (params?.location?.trim()) queryParams['location'] = params.location.trim();
  if (params?.location_id?.trim()) queryParams['location_id'] = params.location_id.trim();
  if (params?.country_name?.trim()) queryParams['country_name'] = params.country_name.trim();
  if (params?.country?.trim()) queryParams['country'] = params.country.trim();
  if (params?.country_id?.trim()) queryParams['country_id'] = params.country_id.trim();

  // Ensure dates are only sent when both exist and check_out_date > check_in_date
  if (params?.check_in_date?.trim() && params?.check_out_date?.trim()) {
    const inDate = params.check_in_date.trim();
    const outDate = params.check_out_date.trim();
    if (outDate > inDate) {
      queryParams['check_in_date'] = inDate;
      queryParams['check_out_date'] = outDate;
    }
  }

  if (params?.guests !== undefined && params?.guests !== null && params?.guests !== '') queryParams['guests'] = params.guests;
  if (params?.adults !== undefined && params?.adults !== null && params?.adults !== '') queryParams['adults'] = params.adults;
  if (params?.children !== undefined && params?.children !== null && params?.children !== '') queryParams['children'] = params.children;
  if (params?.rooms !== undefined && params?.rooms !== null && params?.rooms !== '') queryParams['rooms'] = params.rooms;
  if (params?.min_price !== undefined && params?.min_price !== null && params?.min_price !== '') queryParams['min_price'] = params.min_price;
  if (params?.max_price !== undefined && params?.max_price !== null && params?.max_price !== '') queryParams['max_price'] = params.max_price;
  if (params?.type?.trim()) queryParams['type'] = params.type.trim();
  if (params?.is_featured !== undefined) queryParams['is_featured'] = params.is_featured;
  if (params?.sortBy?.trim()) queryParams['sortBy'] = params.sortBy.trim();
  if (params?.sortOrder) queryParams['sortOrder'] = params.sortOrder;

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

    searchProperties: (params?: PropertyPublicSearchParams): Observable<PaginatedResponse<Partial<PropertyData>>> => {
      const queryParams = buildPropertySearchParams(params);
      return this.apiService.get<PaginatedResponse<Partial<PropertyData>>>('/public/properties/search', { params: queryParams }).pipe(
        map((res) => res.data),
        catchError(this.apiService.passthroughError)
      );
    },

    getPropertyBySlug: (slug: string, checkInDate?: string, checkOutDate?: string): Observable<ApiResponse<Partial<PropertyData>>> => {
      const params: Record<string, string> = {};
      if (checkInDate?.trim() && checkOutDate?.trim()) {
        params['check_in_date'] = checkInDate.trim();
        params['check_out_date'] = checkOutDate.trim();
      }
      return this.apiService.get<ApiResponse<Partial<PropertyData>>>(`/public/properties/${slug}`, { params }).pipe(
        map((res) => res.data),
        catchError(this.apiService.passthroughError)
      );
    }
  };
}
