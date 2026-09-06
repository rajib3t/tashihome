import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map } from 'rxjs';
import { ApiResponse, PaginatedResponse } from '../api/api-response.model';
import { ApiService } from '../api/api-service';
import {
  CalculateEarningsParams,
  CreateBankAccountPayload,
  CreatePayoutPayload,
  Payout,
  PayoutQueryParams,
  ProcessPayoutPayload,
  RazorpayContactResponse,
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
   * GET /api/v1/admin/payouts/
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
   * Get single payout details by ID
   * GET /api/v1/admin/payouts/{payout_id}
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
   * GET /api/v1/admin/payouts/eligible
   */
  calculateEligibleDues(params: CalculateEarningsParams): Observable<ApiResponse<VendorEarningsSummary>> {
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
   * Create a new Payout record (saved as pending)
   * POST /api/v1/admin/payouts/
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
   * POST /api/v1/admin/payouts/{payout_id}/process
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
   * POST /api/v1/admin/payouts/{payout_id}/sync
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
   * POST /api/v1/admin/payouts/{payout_id}/cancel
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
   * GET /api/v1/admin/payouts/vendors/{vendor_id}/bank-accounts
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
   * Add a new Bank Account or UPI VPA for a vendor (auto-registers on Razorpay)
   * POST /api/v1/admin/payouts/vendors/{vendor_id}/bank-accounts
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

  /**
   * Explicitly Create or Sync Vendor Razorpay Contact
   * POST /api/v1/admin/payouts/vendors/{vendor_id}/razorpay-contact
   */
  createVendorRazorpayContact(vendorId: string): Observable<ApiResponse<RazorpayContactResponse>> {
    return this.api
      .protectedPost<ApiResponse<RazorpayContactResponse>>(
        `/admin/payouts/vendors/${encodeURIComponent(vendorId)}/razorpay-contact`,
        {}
      )
      .pipe(
        map((res) => res.data),
        catchError(this.api.passthroughError)
      );
  }

  /**
   * Set a vendor bank account or UPI VPA as primary
   * PATCH /api/v1/admin/payouts/vendors/{vendor_id}/bank-accounts/{bank_account_id}/primary
   */
  setPrimaryVendorBankAccount(
    vendorId: string,
    bankAccountId: string
  ): Observable<ApiResponse<VendorBankAccount>> {
    return this.api
      .protectedPatch<ApiResponse<VendorBankAccount>>(
        `/admin/payouts/vendors/${encodeURIComponent(vendorId)}/bank-accounts/${encodeURIComponent(bankAccountId)}/primary`,
        {}
      )
      .pipe(
        map((res) => res.data),
        catchError(this.api.passthroughError)
      );
  }

  /**
   * Delete a vendor bank account or UPI VPA
   * DELETE /api/v1/admin/payouts/vendors/{vendor_id}/bank-accounts/{bank_account_id}
   */
  deleteVendorBankAccount(
    vendorId: string,
    bankAccountId: string
  ): Observable<ApiResponse<any>> {
    return this.api
      .protectedDelete<ApiResponse<any>>(
        `/admin/payouts/vendors/${encodeURIComponent(vendorId)}/bank-accounts/${encodeURIComponent(bankAccountId)}`
      )
      .pipe(
        map((res) => res.data),
        catchError(this.api.passthroughError)
      );
  }
}
