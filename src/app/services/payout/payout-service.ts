import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map } from 'rxjs';
import { ApiResponse, PaginatedResponse } from '../api/api-response.model';
import { ApiService } from '../api/api-service';
import {
  CreateBankAccountPayload,
  CreatePayoutPayload,
  Payout,
  PayoutQueryParams,
  ProcessPayoutPayload,
  VendorBankAccount,
  VendorEarningsSummary,
} from './payout.model';

function cleanQueryParams(query?: PayoutQueryParams): Record<string, string | number> {
  const params: Record<string, string | number> = {
    page: query?.page ?? 1,
    size: query?.size ?? 10,
    sort_order: query?.sort_order ?? 'desc',
  };

  if (query?.status) {
    params['status'] = query.status;
  }
  if (query?.vendor_id?.trim()) {
    params['vendor_id'] = query.vendor_id.trim();
  }
  if (query?.period_start?.trim()) {
    params['period_start'] = query.period_start.trim();
  }
  if (query?.period_end?.trim()) {
    params['period_end'] = query.period_end.trim();
  }
  if (query?.search?.trim()) {
    params['search'] = query.search.trim();
  }

  return params;
}

@Injectable({ providedIn: 'root' })
export class PayoutService {
  private readonly api = inject(ApiService);

  /**
   * List all payouts with pagination and filter parameters
   */
  getPayouts(query?: PayoutQueryParams): Observable<PaginatedResponse<Payout>> {
    return this.api
      .protectedGet<PaginatedResponse<Payout>>('/admin/payouts/', {
        params: cleanQueryParams(query),
      })
      .pipe(
        map((res) => res.data),
        catchError(this.api.passthroughError)
      );
  }

  /**
   * Get single payout details by public ID
   */
  getPayoutById(id: string): Observable<ApiResponse<Payout>> {
    return this.api
      .protectedGet<ApiResponse<Payout>>(`/admin/payouts/${encodeURIComponent(id)}`)
      .pipe(
        map((res) => res.data),
        catchError(this.api.passthroughError)
      );
  }

  /**
   * Calculate eligible dues and earnings summary for a vendor and settlement period
   */
  calculateEligibleDues(params: {
    vendor_id: string;
    period_start?: string;
    period_end?: string;
    commission_percentage?: number;
  }): Observable<ApiResponse<VendorEarningsSummary>> {
    const queryParams: Record<string, string | number> = {
      vendor_id: params.vendor_id.trim(),
    };
    if (params.period_start?.trim()) {
      queryParams['period_start'] = params.period_start.trim();
    }
    if (params.period_end?.trim()) {
      queryParams['period_end'] = params.period_end.trim();
    }
    if (params.commission_percentage !== undefined && params.commission_percentage !== null) {
      queryParams['commission_percentage'] = params.commission_percentage;
    }

    return this.api
      .protectedGet<ApiResponse<VendorEarningsSummary>>('/admin/payouts/eligible', {
        params: queryParams,
      })
      .pipe(
        map((res) => res.data),
        catchError(this.api.passthroughError)
      );
  }

  /**
   * Create a new Payout record (saved as pending or ready for disbursement)
   */
  createPayout(payload: CreatePayoutPayload): Observable<ApiResponse<Payout>> {
    return this.api
      .protectedPost<ApiResponse<Payout>>('/admin/payouts/', payload)
      .pipe(
        map((res) => res.data),
        catchError(this.api.passthroughError)
      );
  }

  /**
   * Process/Disburse a payout via RazorpayX
   */
  processPayout(
    payoutId: string,
    payload?: ProcessPayoutPayload
  ): Observable<ApiResponse<Payout>> {
    return this.api
      .protectedPost<ApiResponse<Payout>>(
        `/admin/payouts/${encodeURIComponent(payoutId)}/process`,
        payload || {}
      )
      .pipe(
        map((res) => res.data),
        catchError(this.api.passthroughError)
      );
  }

  /**
   * Sync payout live status and UTR directly from Razorpay
   */
  syncPayout(payoutId: string): Observable<ApiResponse<Payout>> {
    return this.api
      .protectedPost<ApiResponse<Payout>>(
        `/admin/payouts/${encodeURIComponent(payoutId)}/sync`,
        {}
      )
      .pipe(
        map((res) => res.data),
        catchError(this.api.passthroughError)
      );
  }

  /**
   * Cancel an in-system or queued payout
   */
  cancelPayout(payoutId: string): Observable<ApiResponse<Payout>> {
    return this.api
      .protectedPost<ApiResponse<Payout>>(
        `/admin/payouts/${encodeURIComponent(payoutId)}/cancel`,
        {}
      )
      .pipe(
        map((res) => res.data),
        catchError(this.api.passthroughError)
      );
  }

  /**
   * Retrieve vendor bank accounts and UPI VPAs
   */
  getVendorBankAccounts(vendorId: string): Observable<ApiResponse<VendorBankAccount[]>> {
    return this.api
      .protectedGet<ApiResponse<VendorBankAccount[]>>(
        `/admin/payouts/vendors/${encodeURIComponent(vendorId)}/bank-accounts`
      )
      .pipe(
        map((res) => res.data),
        catchError(this.api.passthroughError)
      );
  }

  /**
   * Add a new Bank Account or UPI VPA for a vendor
   */
  createVendorBankAccount(
    vendorId: string,
    payload: CreateBankAccountPayload
  ): Observable<ApiResponse<VendorBankAccount>> {
    return this.api
      .protectedPost<ApiResponse<VendorBankAccount>>(
        `/admin/payouts/vendors/${encodeURIComponent(vendorId)}/bank-accounts`,
        payload
      )
      .pipe(
        map((res) => res.data),
        catchError(this.api.passthroughError)
      );
  }
}

