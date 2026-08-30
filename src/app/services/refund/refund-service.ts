import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map } from 'rxjs';
import { ApiResponse, PaginatedResponse } from '../api/api-response.model';
import { ApiService } from '../api/api-service';
import { ProcessRefundResult, RefundQuery, RefundRequest, RefundStatus } from './refund.model';

function queryParams(query?: RefundQuery): Record<string, string | number> {
  const params: Record<string, string | number> = { page: query?.page ?? 1, size: query?.size ?? 10, sort_order: query?.sort_order ?? 'desc' };
  if (query?.status) params['status'] = query.status;
  if (query?.booking_id?.trim()) params['booking_id'] = query.booking_id.trim();
  return params;
}

@Injectable({ providedIn: 'root' })
export class RefundService {
  private readonly api = inject(ApiService);
  getRefunds(query?: RefundQuery): Observable<PaginatedResponse<RefundRequest>> {
    return this.api.protectedGet<PaginatedResponse<RefundRequest>>('/admin/refunds/', { params: queryParams(query) })
      .pipe(map(res => res.data), catchError(this.api.passthroughError));
  }
  getRefund(id: string): Observable<ApiResponse<RefundRequest>> {
    return this.api.protectedGet<ApiResponse<RefundRequest>>('/admin/refunds/' + encodeURIComponent(id))
      .pipe(map(res => res.data), catchError(this.api.passthroughError));
  }
  updateStatus(id: string, status: Extract<RefundStatus, 'approved' | 'rejected'>): Observable<ApiResponse<RefundRequest>> {
    return this.api.protectedPatch<ApiResponse<RefundRequest>>('/admin/refunds/' + encodeURIComponent(id) + '/status', { status })
      .pipe(map(res => res.data), catchError(this.api.passthroughError));
  }
  processRefund(id: string): Observable<ApiResponse<ProcessRefundResult>> {
    return this.api.protectedPost<ApiResponse<ProcessRefundResult>>('/admin/refunds/' + encodeURIComponent(id) + '/process', {})
      .pipe(map(res => res.data), catchError(this.api.passthroughError));
  }
}
