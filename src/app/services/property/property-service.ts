import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { PropertyDTO, PropertyQuery, PropertyMediaUploadResponse, PropertyUpdateRequest, CreatePropertyRequest, PropertyData } from './property.model';
import { ApiResponse, PaginatedResponse } from '../api/api-response.model';
import { inject } from '@angular/core';
import { ApiService } from '../api/api-service';
import { catchError, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PropertyService {

  public readonly apiService: ApiService = inject(ApiService);
  

  getProperties(query?: PropertyQuery): Observable<PaginatedResponse<PropertyData>> {
    return this.apiService.protectedGet<PaginatedResponse<PropertyData>>('/properties', { params: query }).pipe(
      map((response) => response.data),
      catchError(this.apiService.passthroughError)
    );
  }




  createProperty(property: CreatePropertyRequest): Observable<ApiResponse<PropertyData>> {
    return this.apiService.protectedPost<ApiResponse<PropertyData>>('/properties/', property).pipe(
      map((response) => response.data),
      catchError(this.apiService.passthroughError)
    );
  }

  uploadPropertyMedia(id: string, formData: FormData): Observable<ApiResponse<PropertyMediaUploadResponse>> {
    return this.apiService.protectedUpload<ApiResponse<PropertyMediaUploadResponse>>(`/properties/${id}/media`, formData).pipe(
      map((response) => response.data),
      catchError(this.apiService.passthroughError)
    );
  }

  getPropertyById(id: string): Observable<ApiResponse<PropertyData>> {
    return this.apiService.protectedGet<ApiResponse<PropertyData>>(`/properties/${id}`).pipe(
      map((response) => response.data),
      catchError(this.apiService.passthroughError)
    );
  }
  updateProperty(id: string, property: PropertyUpdateRequest): Observable<ApiResponse<PropertyData>> {
    return this.apiService.protectedPut<ApiResponse<PropertyData>>(`/properties/${id}`, property).pipe(
      map((response) => response.data),
      catchError(this.apiService.passthroughError)
    );
  }

  deletePropertyAsset(propertyId: string, assetId: string): Observable<ApiResponse<void>> {
    return this.apiService.protectedDelete<void>(`/properties/${propertyId}/assets/${assetId}`).pipe(
      catchError(this.apiService.passthroughError)
    );
  }



  public getPublicProperties(params: PropertyQuery): Observable<PaginatedResponse<Partial<PropertyData>>> {
     const search = params.search ?? {};
        const queryParams: Record<string, string | number | boolean> = {
            page: params.page ?? 1,
            size: params.size ?? 10,
        };

        const city = search.city?.trim();
        const location = search.location?.trim();
        const is_featured = search.is_featured;
        const status = search.status?.trim();

        if (city) {
            queryParams['city_id'] = city;
        }

        if (location) {
            queryParams['location_id'] = location;
        }

        if (status) {
            queryParams['status'] = status;
        }

        if (is_featured !== undefined) {
            queryParams['is_featured'] = is_featured;
        }

    return this.apiService.get<PaginatedResponse<Partial<PropertyData>>>('/public/properties/', { params: queryParams }).pipe(
      map((response) => response.data),
      catchError(this.apiService.passthroughError)
    );
  }

  public getPublicPropertyBySlug(slug: string): Observable<ApiResponse<Partial<PropertyData>>> {
    return this.apiService.get<ApiResponse<Partial<PropertyData>>>(`/public/properties/${slug}`).pipe(
      map((response) => response.data),
      catchError(this.apiService.passthroughError)
    );
  }

}

