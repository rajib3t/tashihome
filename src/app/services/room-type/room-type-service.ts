import { inject, Service } from '@angular/core';
import { catchError, map, Observable } from 'rxjs';
import { ApiResponse, PaginatedResponse } from '../api/api-response.model';
import { ApiService } from '../api/api-service';
import { RoomType, RoomTypeQuery, RoomTypeRequest } from './room-type-model';

@Service()
export class RoomTypeService {
  public readonly apiService = inject(ApiService);

  public create(data: RoomTypeRequest): Observable<ApiResponse<RoomType>> {
    return this.apiService.protectedPost<ApiResponse<RoomType>>('/admin/room-types/', data).pipe(
      map(response => response.data),
      catchError(this.apiService.passthroughError)
    );
  }

  public getRoomTypes(params: RoomTypeQuery): Observable<PaginatedResponse<RoomType>> {
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

    return this.apiService.protectedGet<PaginatedResponse<RoomType>>('/admin/room-types/', { params: queryParams }).pipe(
      map(response => response.data),
      catchError(this.apiService.passthroughError)
    );
  }

  public update(id: string, data: RoomTypeRequest): Observable<ApiResponse<RoomType>> {
    return this.apiService.protectedPut<ApiResponse<RoomType>>(`/admin/room-types/${id}`, data).pipe(
      map(response => response.data),
      catchError(this.apiService.passthroughError)
    );
  }

  public statusUpdate(id: string, status: string): Observable<ApiResponse<RoomType>> {
    return this.apiService.protectedPatch<ApiResponse<RoomType>>(`/admin/room-types/${id}/${status}`, { status }).pipe(
      map(response => response.data),
      catchError(this.apiService.passthroughError)
    );
  }
}
