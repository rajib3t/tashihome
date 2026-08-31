import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from '../api/api-service';
import { ApiResponse, PaginatedResponse } from '../api/api-response.model';
import {
  AddHostRequestMessagePayload,
  BecomeHostRequest,
  BecomeHostResponse,
  ConvertHostRequestPayload,
  HostRequest,
  HostRequestMessage,
  HostRequestQuery,
  UpdateHostRequestStatusPayload,
} from './host.model';

@Injectable({
  providedIn: 'root',
})
export class HostService {
  private readonly apiService = inject(ApiService);

  public extractApiErrorMessage(error: any): string | null {
    return this.apiService.extractApiErrorMessage(error);
  }

  // ================= PUBLIC =================
  public becomeHost(data: BecomeHostRequest): Observable<ApiResponse<BecomeHostResponse>> {
    return this.apiService.post<ApiResponse<BecomeHostResponse>>('/public/become-host/', data).pipe(
      map((response) => response.data),
      catchError(this.apiService.passthroughError)
    );
  }

  // ================= ADMIN HOST REQUESTS & MANAGEMENT =================
  public readonly admin = {
    getHostRequests: (params: HostRequestQuery = {}): Observable<PaginatedResponse<HostRequest>> => {
      const search = params.search ?? {};
      const queryParams: Record<string, string | number> = {
        page: params.page ?? 1,
        size: params.size ?? 10,
      };

      if (search.full_name?.trim()) queryParams['full_name'] = search.full_name.trim();
      if (search.email?.trim()) queryParams['email'] = search.email.trim();
      if (search.phone?.trim()) queryParams['phone'] = search.phone.trim();
      if (search.property_name?.trim()) queryParams['property_name'] = search.property_name.trim();
      if (search.city?.trim()) queryParams['city'] = search.city.trim();
      if (search.property_type?.trim()) queryParams['property_type'] = search.property_type.trim();
      if (search.status?.trim()) queryParams['status'] = search.status.trim();
      if (search.query?.trim()) queryParams['search'] = search.query.trim();

      if (params.sortBy?.trim()) queryParams['sort_by'] = params.sortBy.trim();
      if (params.sortOrder) queryParams['sort_order'] = params.sortOrder;

      return this.apiService
        .protectedGet<PaginatedResponse<HostRequest>>('/admin/host-requests/', { params: queryParams })
        .pipe(
          map((response) => response.data),
          catchError(this.apiService.passthroughError)
        );
    },

    getHostRequestById: (id: string): Observable<ApiResponse<HostRequest>> => {
      return this.apiService.protectedGet<ApiResponse<HostRequest>>(`/admin/host-requests/${id}`).pipe(
        map((response) => response.data),
        catchError(this.apiService.passthroughError)
      );
    },

    updateStatus: (id: string, payload: UpdateHostRequestStatusPayload): Observable<ApiResponse<HostRequest>> => {
      return this.apiService
        .protectedPatch<ApiResponse<HostRequest>>(`/admin/host-requests/${id}/status`, payload)
        .pipe(
          map((response) => response.data),
          catchError(this.apiService.passthroughError)
        );
    },

    addMessage: (id: string, payload: AddHostRequestMessagePayload): Observable<ApiResponse<HostRequestMessage>> => {
      return this.apiService
        .protectedPost<ApiResponse<HostRequestMessage>>(`/admin/host-requests/${id}/messages`, payload)
        .pipe(
          map((response) => response.data),
          catchError(this.apiService.passthroughError)
        );
    },

    convertToVendor: (id: string, payload: ConvertHostRequestPayload): Observable<ApiResponse<any>> => {
      return this.apiService
        .protectedPost<ApiResponse<any>>(`/admin/host-requests/${id}/convert`, payload)
        .pipe(
          map((response) => response.data),
          catchError(this.apiService.passthroughError)
        );
    },
  };
}
