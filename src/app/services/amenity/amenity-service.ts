import { inject, Service } from '@angular/core';
import { catchError, map, Observable } from 'rxjs';
import { ApiResponse, PaginatedResponse } from '../api/api-response.model';
import { ApiService } from '../api/api-service';
import { Amenity, AmenityQuery } from './amenity-model';

@Service()
export class AmenityService {
  public readonly apiService = inject(ApiService);

  public create(data: FormData): Observable<ApiResponse<Amenity>> {
    return this.apiService.protectedPost<ApiResponse<Amenity>>('/amenities/', data).pipe(
      map(response => response.data),
      catchError(this.apiService.passthroughError)
    );
  }

  public getAmenities(params: AmenityQuery): Observable<PaginatedResponse<Amenity>> {
    const search = params.search ?? {};
    const queryParams: Record<string, string | number> = {
      page: params.page ?? 1,
      size: params.size ?? 10,
    };

    const name = search.name?.trim();
    const status = search.status?.trim();

    if (name) {
      queryParams['name'] = name;
    }

    if (status) {
      queryParams['status'] = status;
    }

    if (params.sortBy?.trim()) {
      queryParams['sortBy'] = params.sortBy.trim();
    }

    if (params.sortOrder) {
      queryParams['sortOrder'] = params.sortOrder;
    }

    return this.apiService.protectedGet<PaginatedResponse<Amenity>>('/amenities/', { params: queryParams }).pipe(
      map(response => response.data),
      catchError(this.apiService.passthroughError)
    );
  }

  public update(id: string, data: FormData): Observable<ApiResponse<Amenity>> {
    return this.apiService.protectedPut<ApiResponse<Amenity>>(`/amenities/${id}`, data).pipe(
      map(response => response.data),
      catchError(this.apiService.passthroughError)
    );
  }

  public statusUpdate(id: string, status: string): Observable<ApiResponse<Amenity>> {
    return this.apiService.protectedPatch<ApiResponse<Amenity>>(`/amenities/${id}/${status}`, { status }).pipe(
      map(response => response.data),
      catchError(this.apiService.passthroughError)
    );
  }
}
