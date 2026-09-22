import { Injectable, inject } from '@angular/core';
import { Observable, catchError, from, map, throwError } from 'rxjs';
import { ApiService } from '../api/api-service';
import { AuthService } from '../auth/auth-service';
import { environment } from '../../../environments/environment';
import {
  AdminCountersignPayload,
  AdminOnboardHostPayload,
  AgreementListResponse,
  AgreementResponse,
  PublicAgreementResponse,
  SendAgreementToVendorPayload,
  SignAgreementPayload,
} from '../../core/models/agreement.model';
import {
  AgreementTemplateItem,
  AgreementTemplateListResponse,
  AgreementTemplatePreviewData,
  AgreementTemplateResponse,
  CreateAgreementTemplatePayload,
  UpdateAgreementTemplatePayload,
} from '../../core/models/agreement-template.model';


@Injectable({
  providedIn: 'root',
})
export class AgreementService {
  private readonly apiService = inject(ApiService);
  private readonly authService = inject(AuthService);

  public extractApiErrorMessage(error: any): string | null {
    return this.apiService.extractApiErrorMessage(error);
  }

  /**
   * Resolves possible candidate URLs for a given PDF path, filename, or endpoint.
   * Handles direct S3 URLs, relative storage keys (e.g. 'agreements/<uuid>/file.pdf'),
   * backend asset endpoints ('/api/v1/assets/...'), and public/admin download endpoints.
   */
  public resolvePdfUrls(urlOrEndpoint: string, fallbackAgreementId?: string): string[] {
    const urls: string[] = [];
    if (!urlOrEndpoint && !fallbackAgreementId) {
      return urls;
    }

    let extractedAssetKey: string | null = null;
    let s3PresignedUrl: string | null = null;

    if (urlOrEndpoint) {
      // Check if urlOrEndpoint contains an internal storage path (e.g. agreements/{uuid}/{filename}.pdf)
      const agreementKeyMatch = urlOrEndpoint.match(/(?:^|\/)(agreements\/[^?#\s]+\.pdf)/i);
      if (agreementKeyMatch) {
        extractedAssetKey = agreementKeyMatch[1];
      }

      const isAbsolute = urlOrEndpoint.startsWith('http://') || urlOrEndpoint.startsWith('https://');
      if (isAbsolute) {
        s3PresignedUrl = urlOrEndpoint;
      } else {
        const clean = urlOrEndpoint.replace(/^\/+/, '');

        // Case 1: Already an API path (e.g. 'api/v1/...' or starts with '/api/')
        if (clean.startsWith('api/')) {
          urls.push(`/${clean}`);
        }
        // Case 2: Direct API endpoint name (public/..., admin/..., vendor/...)
        else if (clean.startsWith('public/') || clean.startsWith('admin/') || clean.startsWith('vendor/')) {
          urls.push(`${this.apiService.apiBaseUrl}/${clean}`);
        }
        // Case 3: Starts with 'assets/'
        else if (clean.startsWith('assets/')) {
          const sub = clean.replace(/^assets\//, '');
          urls.push(`${this.apiService.apiBaseUrl}/assets/${sub}`);
          if (environment.assetUrl) {
            urls.push(`${environment.assetUrl.replace(/\/$/, '')}/${sub}`);
          }
        }
        // Case 4: Relative asset path (e.g. 'agreements/57c54545-.../Host_Agreement_Edan_Monroe.pdf')
        else {
          urls.push(`${this.apiService.apiBaseUrl}/assets/${clean}`);
          if (environment.assetUrl) {
            urls.push(`${environment.assetUrl.replace(/\/$/, '')}/${clean}`);
          }
          urls.push(`${this.apiService.apiBaseUrl}/${clean}`);
        }
      }
    }

    // If an asset key (like 'agreements/...pdf') was extracted from an S3 URL or path,
    // prioritize the backend asset endpoint proxy! This avoids S3 URL exposure and MinIO CORS/auth issues.
    if (extractedAssetKey) {
      const assetProxyUrl = `${this.apiService.apiBaseUrl}/assets/${extractedAssetKey}`;
      if (!urls.includes(assetProxyUrl)) {
        urls.unshift(assetProxyUrl);
      }
      if (environment.assetUrl) {
        const directAssetUrl = `${environment.assetUrl.replace(/\/$/, '')}/${extractedAssetKey}`;
        if (!urls.includes(directAssetUrl)) {
          urls.push(directAssetUrl);
        }
      }
    }

    // Always add vendor download endpoint as a candidate
    const vendorDownloadUrl = `${this.apiService.apiBaseUrl}/vendor/agreements/download`;
    if (!urls.includes(vendorDownloadUrl)) {
      urls.push(vendorDownloadUrl);
    }

    // Try extracting agreement UUID from urlOrEndpoint if not provided explicitly
    const agreementId =
      fallbackAgreementId ||
      urlOrEndpoint?.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0];

    if (agreementId) {
      const publicPdfUrl = `${this.apiService.apiBaseUrl}/public/agreements/${agreementId}/pdf`;
      if (!urls.includes(publicPdfUrl)) {
        urls.push(publicPdfUrl);
      }
      const adminPdfUrl = `${this.apiService.apiBaseUrl}/admin/agreements/${agreementId}/download-pdf`;
      if (!urls.includes(adminPdfUrl)) {
        urls.push(adminPdfUrl);
      }
    }

    // If there was an absolute S3 presigned URL, keep it only as a last resort
    if (s3PresignedUrl && !urls.includes(s3PresignedUrl)) {
      urls.push(s3PresignedUrl);
    }

    return Array.from(new Set(urls));
  }

  /**
   * Fetches PDF binary as a Blob without exposing raw S3 URLs in the browser address bar.
   * Resolves through candidate URLs (asset endpoints, S3 presigned URLs, and fallback routes)
   * and ensures the resulting Blob has the correct 'application/pdf' MIME type.
   */
  public fetchPdfBlob(urlOrEndpoint: string, fallbackAgreementId?: string): Observable<Blob> {
    if (typeof window === 'undefined') {
      return throwError(() => new Error('Cannot fetch PDF in a non-browser environment'));
    }

    const candidateUrls = this.resolvePdfUrls(urlOrEndpoint, fallbackAgreementId);
    if (candidateUrls.length === 0) {
      return throwError(() => new Error('No valid PDF URL or agreement identifier provided'));
    }

    const token = this.authService.getToken();

    const tryFetch = async (): Promise<Blob> => {
      let lastError: Error | null = null;

      for (const fullUrl of candidateUrls) {
        try {
          const isS3Presigned =
            fullUrl.includes('AWSAccessKeyId=') ||
            fullUrl.includes('Signature=') ||
            fullUrl.includes('X-Amz-');
          const isExternalHost =
            (fullUrl.startsWith('http://') || fullUrl.startsWith('https://')) &&
            !fullUrl.includes('/api/v1/');

          const isDirectS3 = isS3Presigned || isExternalHost;

          const headers: Record<string, string> = {
            Accept: 'application/pdf, application/octet-stream, */*',
          };

          // Never send Bearer Authorization header to S3 query-signed URLs
          if (token && !isDirectS3) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          const response = await fetch(fullUrl, {
            method: 'GET',
            headers: isDirectS3 ? undefined : headers,
            credentials: isDirectS3 ? 'omit' : 'include',
          });

          if (response.ok) {
            const rawBlob = await response.blob();
            // Ensure blob has application/pdf MIME type so the iframe viewer can render it reliably
            if (rawBlob.type === 'application/pdf') {
              return rawBlob;
            }
            return new Blob([rawBlob], { type: 'application/pdf' });
          }

          lastError = new Error(`Failed to load PDF from ${fullUrl} (${response.status} ${response.statusText})`);
        } catch (err: any) {
          lastError = err instanceof Error ? err : new Error(String(err));
        }
      }

      throw lastError || new Error('Failed to load agreement PDF. File not found.');
    };

    return from(tryFetch());
  }

  /**
   * Triggers a silent browser download for a Blob with a clean filename,
   * without navigating or exposing any raw S3 URL in the browser window/tabs.
   */
  public downloadBlob(blob: Blob, filename: string): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(blobUrl);
    }, 200);
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
    size?: number;
    status?: string;
    search?: string;
  }): Observable<AgreementListResponse> {
    const queryParams: Record<string, string | number> = {};
    if (params?.page) queryParams['page'] = params.page;
    const pageSize = params?.size || params?.limit;
    if (pageSize) {
      queryParams['size'] = pageSize;
      queryParams['limit'] = pageSize;
    }
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

  /**
   * Retrieves active partnership agreement for the authenticated vendor.
   * Handles wrapped or direct responses, array lists, and fallback endpoints.
   * GET /api/v1/vendor/agreements/my-agreement -> /api/v1/vendor/agreements/active -> /api/v1/vendor/agreements
   */
  public getMyAgreement(): Observable<any> {
    return this.apiService.protectedGet<any>('/vendor/agreements/my-agreement').pipe(
      catchError(() => this.apiService.protectedGet<any>('/vendor/agreements/active')),
      catchError(() => this.apiService.protectedGet<any>('/vendor/agreements')),
      map((res) => {
        if (!res) return null;
        let payload: any = res.data !== undefined ? res.data : res;
        if (!payload) return null;

        // Unwrap if nested in data property
        if (payload.data?.data !== undefined) {
          payload = payload.data.data;
        } else if (
          payload.data !== undefined &&
          typeof payload.data === 'object' &&
          !Array.isArray(payload.data) &&
          (payload.data.id || payload.data.status || payload.data.title || payload.data.pdf_file_url || payload.data.token)
        ) {
          payload = payload.data;
        } else if (Array.isArray(payload.data)) {
          payload = payload.data;
        }

        // If the response is a list of agreements for this vendor, pick the active/signed or most recent
        if (Array.isArray(payload)) {
          if (payload.length === 0) return null;
          const signed = payload.find(
            (a: any) =>
              a.status?.toLowerCase() === 'signed' ||
              a.status?.toLowerCase() === 'active' ||
              a.status?.toLowerCase() === 'partially_signed'
          );
          return signed || payload[0];
        }

        return payload;
      }),
      catchError(this.apiService.passthroughError)
    );
  }

  /**
   * Returns authenticated download URL for the host's executed agreement PDF.
   */
  public getVendorDownloadUrl(): string {
    return `${this.apiService.apiBaseUrl}/vendor/agreements/download`;
  }

  // ── Agreement Template Management Methods ─────────────────────────────────

  /**
   * Lists all agreement templates with optional filters and pagination.
   * GET /api/v1/admin/agreement-templates
   */
  public getAgreementTemplates(params?: {
    page?: number;
    size?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Observable<AgreementTemplateListResponse> {
    const queryParams: Record<string, string | number> = {};
    if (params?.page) queryParams['page'] = params.page;
    const pageSize = params?.size || params?.limit;
    if (pageSize) {
      queryParams['size'] = pageSize;
      queryParams['limit'] = pageSize;
    }
    if (params?.status) queryParams['status'] = params.status;
    if (params?.search) queryParams['search'] = params.search;

    return this.apiService
      .protectedGet<AgreementTemplateListResponse>('/admin/agreement-templates', { params: queryParams })
      .pipe(
        map((res) => res.data),
        catchError(this.apiService.passthroughError)
      );
  }

  /**
   * Retrieves single agreement template by public_id.
   * GET /api/v1/admin/agreement-templates/{id}
   */
  public getAgreementTemplate(id: string): Observable<AgreementTemplateResponse> {
    return this.apiService
      .protectedGet<AgreementTemplateResponse>(`/admin/agreement-templates/${id}`)
      .pipe(
        map((res) => res.data),
        catchError(this.apiService.passthroughError)
      );
  }

  /**
   * Creates a new agreement template (JSON or FormData for PDF upload).
   * POST /api/v1/admin/agreement-templates
   */
  public createAgreementTemplate(
    payload: FormData | CreateAgreementTemplatePayload
  ): Observable<AgreementTemplateResponse> {
    return this.apiService
      .protectedPost<AgreementTemplateResponse>('/admin/agreement-templates', payload)
      .pipe(
        map((res) => res.data),
        catchError(this.apiService.passthroughError)
      );
  }

  /**
   * Updates an existing agreement template (JSON or FormData if replacing PDF).
   * PUT /api/v1/admin/agreement-templates/{id}
   */
  public updateAgreementTemplate(
    id: string,
    payload: FormData | UpdateAgreementTemplatePayload
  ): Observable<AgreementTemplateResponse> {
    return this.apiService
      .protectedPut<AgreementTemplateResponse>(`/admin/agreement-templates/${id}`, payload)
      .pipe(
        map((res) => res.data),
        catchError(this.apiService.passthroughError)
      );
  }

  /**
   * Archives / soft-deletes an agreement template.
   * DELETE /api/v1/admin/agreement-templates/{id}
   */
  public archiveAgreementTemplate(id: string): Observable<AgreementTemplateResponse> {
    return this.apiService
      .protectedDelete<AgreementTemplateResponse>(`/admin/agreement-templates/${id}`)
      .pipe(
        map((res) => res.data),
        catchError(this.apiService.passthroughError)
      );
  }

  /**
   * Sets the specified agreement template as active default.
   * POST /api/v1/admin/agreement-templates/{id}/set-default
   */
  public setDefaultAgreementTemplate(id: string): Observable<AgreementTemplateResponse> {
    return this.apiService
      .protectedPost<AgreementTemplateResponse>(`/admin/agreement-templates/${id}/set-default`, {})
      .pipe(
        map((res) => res.data),
        catchError(this.apiService.passthroughError)
      );
  }

  /**
   * Retrieves preview data for an agreement template.
   * GET /api/v1/admin/agreement-templates/{id}/preview
   */
  public previewAgreementTemplate(id: string): Observable<any> {
    return this.apiService
      .protectedGet<any>(`/admin/agreement-templates/${id}/preview`)
      .pipe(
        map((res) => res.data),
        catchError(this.apiService.passthroughError)
      );
  }

  /**
   * Retrieves agreement summary / status for a vendor.
   * GET /api/v1/admin/vendors/{vendor_id}/agreements/status
   */
  public getVendorAgreementStatus(vendorId: string): Observable<any> {
    return this.apiService
      .protectedGet<any>(`/admin/vendors/${vendorId}/agreements/status`)
      .pipe(
        map((res) => res.data),
        catchError(this.apiService.passthroughError)
      );
  }
}





