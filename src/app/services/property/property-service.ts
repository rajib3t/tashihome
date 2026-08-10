import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { PropertyDTO, PropertyItem, PropertyQuery, PropertyMediaUploadResponse, PropertyUpdateRequest, CreatePropertyRequest, PropertyData } from './property.model';
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

  getPropertyById(id: string): Observable<ApiResponse<PropertyData>> {
    return this.apiService.protectedGet<ApiResponse<PropertyData>>(`/properties/${id}`).pipe(
      map((response) => response.data),
      catchError(this.apiService.passthroughError)
    );
  }
  updateProperty(id: number, property: PropertyUpdateRequest): Observable<ApiResponse<PropertyItem>> {
    return this.apiService.protectedPut<ApiResponse<PropertyItem>>(`/properties/${id}`, property).pipe(
      map((response) => response.data),
      catchError(this.apiService.passthroughError)
    );
  }

  uploadPropertyMedia(id: string | number, formData: FormData): Observable<ApiResponse<PropertyMediaUploadResponse>> {
    return this.apiService.protectedUpload<ApiResponse<PropertyMediaUploadResponse>>(`/properties/${id}/media`, formData).pipe(
      map((response) => response.data),
      catchError(this.apiService.passthroughError)
    );
  }
}
