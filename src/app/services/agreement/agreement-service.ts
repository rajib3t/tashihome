import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map } from 'rxjs';
import { ApiService } from '../api/api-service';
import {
  AdminCountersignPayload,
  AdminOnboardHostPayload,
  AgreementListResponse,
  AgreementResponse,
  PublicAgreementResponse,
  SendAgreementToVendorPayload,
  SignAgreementPayload,
} from '../../core/models/agreement.model';

@Injectable({
  providedIn: 'root',
})
export class AgreementService {
  private readonly apiService = inject(ApiService);

  public extractApiErrorMessage(error: any): string | null {
    return this.apiService.extractApiErrorMessage(error);
  }

  // ── Admin Methods ──────────────────────────────────────────────────────────

  /**
   * Onboards a new host with optional automatic agreement generation and dispatch.
   * POST /api/v1/admin/vendors/onboard
   */
  public onboardHost(payload: AdminOnboardHostPayload): Observable<any> {
    return this.apiService.protectedPost<any>('/admin/vendors/onboard', payload).pipe(
      map((res) => res.data),
      catchError(this.apiService.passthroughError)
    );
  }

  /**
   * Sends or generates a new partnership agreement for an existing registered vendor.
   * POST /api/v1/admin/vendors/{vendor_id}/agreements/send
   */
  public sendAgreementToVendor(
    vendorId: string,
    payload: SendAgreementToVendorPayload
  ): Observable<AgreementResponse> {
    return this.apiService
      .protectedPost<AgreementResponse>(`/admin/vendors/${vendorId}/agreements/send`, payload)
      .pipe(
        map((res) => res.data),
        catchError(this.apiService.passthroughError)
      );
  }

  /**
   * Lists all host partnership agreements with optional filters and pagination.
   * GET /api/v1/admin/agreements
   */
  public getAgreements(params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Observable<AgreementListResponse> {
    const queryParams: Record<string, string | number> = {};
    if (params?.page) queryParams['page'] = params.page;
    if (params?.limit) queryParams['limit'] = params.limit;
    if (params?.status) queryParams['status'] = params.status;
    if (params?.search) queryParams['search'] = params.search;

    return this.apiService
      .protectedGet<AgreementListResponse>('/admin/agreements', { params: queryParams })
      .pipe(
        map((res) => res.data),
        catchError(this.apiService.passthroughError)
      );
  }

  /**
   * Resends agreement email and renews token expiration window.
   * POST /api/v1/admin/agreements/{agreement_id}/resend
   */
  public resendAgreement(agreementId: string): Observable<AgreementResponse> {
    return this.apiService
      .protectedPost<AgreementResponse>(`/admin/agreements/${agreementId}/resend`, {})
      .pipe(
        map((res) => res.data),
        catchError(this.apiService.passthroughError)
      );
  }

  /**
   * Revokes or cancels an agreement invitation.
   * DELETE /api/v1/admin/agreements/{agreement_id}
   */
  public cancelAgreement(agreementId: string): Observable<any> {
    return this.apiService.protectedDelete<any>(`/admin/agreements/${agreementId}`).pipe(
      map((res) => res.data),
      catchError(this.apiService.passthroughError)
    );
  }

  /**
   * Countersigns an agreement as Platform Operator (Party 1) if not already signed.
   * POST /api/v1/admin/agreements/{agreement_id}/countersign
   */
  public countersignAgreement(
    agreementId: string,
    payload: AdminCountersignPayload = {}
  ): Observable<AgreementResponse> {
    return this.apiService
      .protectedPost<AgreementResponse>(`/admin/agreements/${agreementId}/countersign`, payload)
      .pipe(
        map((res) => res.data),
        catchError(this.apiService.passthroughError)
      );
  }

  // ── Public E-Sign Methods ──────────────────────────────────────────────────

  /**
   * Retrieves agreement terms and details using the public signing token.
   * GET /api/v1/public/agreements/{token}
   */
  public getPublicAgreement(token: string): Observable<PublicAgreementResponse> {
    return this.apiService.get<PublicAgreementResponse>(`/public/agreements/${token}`).pipe(
      map((res) => res.data),
      catchError(this.apiService.passthroughError)
    );
  }

  /**
   * Submits legal electronic signature and consents to execute agreement.
   * POST /api/v1/public/agreements/{token}/sign
   */
  public signAgreement(
    token: string,
    payload: SignAgreementPayload
  ): Observable<PublicAgreementResponse> {
    return this.apiService
      .post<PublicAgreementResponse>(`/public/agreements/${token}/sign`, payload)
      .pipe(
        map((res) => res.data),
        catchError(this.apiService.passthroughError)
      );
  }

  /**
   * Returns download URL for the signed agreement PDF.
   */
  public getSignedPdfUrl(token: string): string {
    return `${this.apiService.apiBaseUrl}/public/agreements/${token}/pdf`;
  }

  // ── Vendor (Host) Methods ──────────────────────────────────────────────────

  /**
   * Retrieves active partnership agreement for the authenticated vendor.
   * GET /api/v1/vendor/agreements/my-agreement
   */
  public getMyAgreement(): Observable<any> {
    return this.apiService.protectedGet<any>('/vendor/agreements/my-agreement').pipe(
      map((res) => res.data?.data ?? null),
      catchError(this.apiService.passthroughError)
    );
  }

  /**
   * Returns authenticated download URL for the host's executed agreement PDF.
   */
  public getVendorDownloadUrl(): string {
    return `${this.apiService.apiBaseUrl}/vendor/agreements/download`;
  }
}


