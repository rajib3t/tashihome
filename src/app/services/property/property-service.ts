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
import { PropertySetupSteps } from './property-setup-steps.model';

function buildPropertyQueryParams(query?: PropertyQuery): Record<string, string | number | boolean> {
  const search = query?.search ?? {};
  const queryParams: Record<string, string | number | boolean> = {
    page: query?.page ?? 1,
    size: query?.size ?? 10,
  };

  const name = search.name?.trim();
  const type = search.type?.trim();
  const city = search.city?.trim();
  const city_id = (query?.city_id ?? search.city_id)?.trim();
  const city_slug = (query?.city_slug ?? search.city_slug)?.trim();
  const location = search.location?.trim();
  const location_id = (query?.location_id ?? search.location_id)?.trim();
  const location_slug = (query?.location_slug ?? search.location_slug)?.trim();
  const country = search.country?.trim();
  const country_id = (query?.country_id ?? search.country_id)?.trim();
  const country_slug = (query?.country_slug ?? search.country_slug)?.trim();
  const status = search.status?.trim();
  const is_featured = query?.is_featured !== undefined ? query.is_featured : search.is_featured;

  const min_price = query?.min_price !== undefined ? query.min_price : search.min_price;
  const max_price = query?.max_price !== undefined ? query.max_price : search.max_price;

  if (name) queryParams['name'] = name;
  if (type) queryParams['type'] = type;
  if (city) queryParams['city'] = city;
  if (city_id) queryParams['city_id'] = city_id;
  if (city_slug) queryParams['city_slug'] = city_slug;
  if (location) queryParams['location'] = location;
  if (location_id) queryParams['location_id'] = location_id;
  if (location_slug) queryParams['location_slug'] = location_slug;
  if (country) queryParams['country'] = country;
  if (country_id) queryParams['country_id'] = country_id;
  if (country_slug) queryParams['country_slug'] = country_slug;
  if (status) queryParams['status'] = status;
  if (is_featured !== undefined) queryParams['is_featured'] = is_featured;

  if (min_price !== undefined && min_price !== null && min_price !== '') {
    queryParams['min_price'] = Number(min_price);
  }
  if (max_price !== undefined && max_price !== null && max_price !== '') {
    queryParams['max_price'] = Number(max_price);
  }

  const sortBy = query?.sort_by ?? query?.sortBy;
  const sortOrder = query?.sort_order ?? query?.sortOrder;

  if (sortBy?.trim()) {
    queryParams['sort_by'] = sortBy.trim();
    queryParams['sortBy'] = sortBy.trim();
  }
  if (sortOrder) {
    queryParams['sort_order'] = sortOrder;
    queryParams['sortOrder'] = sortOrder;
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
  if (params?.city_slug?.trim()) queryParams['city_slug'] = params.city_slug.trim();
  if (params?.location_name?.trim()) queryParams['location_name'] = params.location_name.trim();
  if (params?.location?.trim()) queryParams['location'] = params.location.trim();
  if (params?.location_id?.trim()) queryParams['location_id'] = params.location_id.trim();
  if (params?.location_slug?.trim()) queryParams['location_slug'] = params.location_slug.trim();
  if (params?.country_name?.trim()) queryParams['country_name'] = params.country_name.trim();
  if (params?.country?.trim()) queryParams['country'] = params.country.trim();
  if (params?.country_id?.trim()) queryParams['country_id'] = params.country_id.trim();
  if (params?.country_slug?.trim()) queryParams['country_slug'] = params.country_slug.trim();

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
  if (params?.min_price !== undefined && params?.min_price !== null && params?.min_price !== '') queryParams['min_price'] = Number(params.min_price);
  if (params?.max_price !== undefined && params?.max_price !== null && params?.max_price !== '') queryParams['max_price'] = Number(params.max_price);
  if (params?.type?.trim()) queryParams['type'] = params.type.trim();
  if (params?.is_featured !== undefined) queryParams['is_featured'] = params.is_featured;

  if (params?.amenities) {
    queryParams['amenities'] = Array.isArray(params.amenities) ? params.amenities.join(',') : params.amenities;
  }
  if (params?.facilities) {
    queryParams['facilities'] = Array.isArray(params.facilities) ? params.facilities.join(',') : params.facilities;
  }
  if (params?.room_types) {
    queryParams['room_types'] = Array.isArray(params.room_types) ? params.room_types.join(',') : params.room_types;
  }
  if (params?.property_categories) {
    queryParams['property_categories'] = Array.isArray(params.property_categories) ? params.property_categories.join(',') : params.property_categories;
  }

  const sortBy = params?.sort_by ?? params?.sortBy;
  const sortOrder = params?.sort_order ?? params?.sortOrder;
  if (sortBy?.trim()) {
    queryParams['sort_by'] = sortBy.trim();
    queryParams['sortBy'] = sortBy.trim();
  }
  if (sortOrder) {
    queryParams['sort_order'] = sortOrder;
    queryParams['sortOrder'] = sortOrder;
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
    },

    getSetupSteps: (propertyId: string): Observable<ApiResponse<PropertySetupSteps>> => {
      return this.apiService.protectedGet<ApiResponse<PropertySetupSteps>>(`/admin/properties/${propertyId}/setup-steps`).pipe(
        map((res) => res.data),
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
    },

    getSetupSteps: (propertyId: string): Observable<ApiResponse<PropertySetupSteps>> => {
      return this.apiService.protectedGet<ApiResponse<PropertySetupSteps>>(`/vendor/properties/${propertyId}/setup-steps`).pipe(
        map((res) => res.data),
        catchError(this.apiService.passthroughError)
      );
    }
  };

  // ================= PUBLIC APIs =================
  public readonly public = {
    getProperties: (params: PropertyQuery): Observable<PaginatedResponse<Partial<PropertyData>>> => {
      const queryParams = buildPropertyQueryParams(params);
      return this.apiService.get<PaginatedResponse<Partial<PropertyData>>>('/public/properties', { params: queryParams }).pipe(
        catchError(() => this.apiService.get<PaginatedResponse<Partial<PropertyData>>>('/public/properties/', { params: queryParams })),
        catchError(() => this.apiService.get<PaginatedResponse<Partial<PropertyData>>>('/public/properties', { params: queryParams })),
        map((res) => res.data),
        catchError(this.apiService.passthroughError)
      );
    },

    searchProperties: (params?: PropertyPublicSearchParams): Observable<PaginatedResponse<Partial<PropertyData>>> => {
      const queryParams = buildPropertySearchParams(params);
      return this.apiService.get<PaginatedResponse<Partial<PropertyData>>>('/public/properties/search', { params: queryParams }).pipe(
        catchError(() => this.apiService.get<PaginatedResponse<Partial<PropertyData>>>('/public/properties/search', { params: queryParams })),
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
        catchError(() => this.apiService.get<ApiResponse<Partial<PropertyData>>>(`/public/properties/${slug}`, { params })),
        map((res) => res.data),
        catchError(this.apiService.passthroughError)
      );
    },

    checkAvailability: (payload: any): Observable<ApiResponse<any>> => {
      return this.apiService.post<ApiResponse<any>>('/public/properties/check-availability', payload).pipe(
        catchError(() => this.apiService.post<ApiResponse<any>>('/public/properties/check-availability', payload)),
        catchError(() => this.apiService.post<ApiResponse<any>>('/public/stays/check-availability', payload)),
        map((res) => res.data),
        catchError(this.apiService.passthroughError)
      );
    }
  };
}
