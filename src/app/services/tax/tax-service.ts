import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, of, tap } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiResponse, PaginatedResponse } from '../api/api-response.model';
import { ApiService } from '../api/api-service';
import { TaxItem, TaxCreatePayload, TaxUpdatePayload, TaxQueryFilters, TaxStatus } from './tax.model';

@Injectable({ providedIn: 'root' })
export class TaxService {
  private readonly apiService = inject(ApiService);

  #defaultTax = signal<TaxItem | null>(null);
  public readonly defaultTax = computed(() => this.#defaultTax());

  public extractApiErrorMessage(error: any): string | null {
    return this.apiService.extractApiErrorMessage(error);
  }

  private buildQueryParams(filters: TaxQueryFilters = {}): Record<string, string | number | boolean> {
    const params: Record<string, string | number | boolean> = {
      page: filters.page ?? 1,
      size: filters.size ?? 10,
    };

    if (filters.search?.trim()) {
      params['search'] = filters.search.trim();
    }
    if (filters.status) {
      params['status'] = filters.status;
    }
    if (typeof filters.is_default === 'boolean') {
      params['is_default'] = filters.is_default;
    }

    return params;
  }

  // ================= ADMIN APIs =================
  public readonly admin = {
    getTaxes: (filters: TaxQueryFilters = {}): Observable<PaginatedResponse<TaxItem>> => {
      const params = this.buildQueryParams(filters);
      return this.apiService.protectedGet<PaginatedResponse<TaxItem>>('/admin/taxes/', { params }).pipe(
        map((response) => response.data),
        catchError(this.apiService.passthroughError)
      );
    },

    getTaxById: (id: string): Observable<ApiResponse<TaxItem>> => {
      return this.apiService.protectedGet<ApiResponse<TaxItem>>(`/admin/taxes/${id}`).pipe(
        map((response) => response.data),
        catchError(this.apiService.passthroughError)
      );
    },

    create: (payload: TaxCreatePayload): Observable<ApiResponse<TaxItem>> => {
      return this.apiService.protectedPost<ApiResponse<TaxItem>>('/admin/taxes/', payload).pipe(
        map((response) => response.data),
        catchError(this.apiService.passthroughError)
      );
    },

    update: (id: string, payload: TaxUpdatePayload): Observable<ApiResponse<TaxItem>> => {
      return this.apiService.protectedPut<ApiResponse<TaxItem>>(`/admin/taxes/${id}`, payload).pipe(
        map((response) => response.data),
        catchError(this.apiService.passthroughError)
      );
    },

    statusUpdate: (id: string, status: TaxStatus): Observable<ApiResponse<TaxItem>> => {
      return this.apiService.protectedPatch<ApiResponse<TaxItem>>(`/admin/taxes/${id}/status`, { status }).pipe(
        map((response) => response.data),
        catchError(this.apiService.passthroughError)
      );
    },

    delete: (id: string, hard: boolean = false): Observable<ApiResponse<any>> => {
      return this.apiService.protectedDelete<ApiResponse<any>>(`/admin/taxes/${id}?hard=${hard}`).pipe(
        map((response) => response.data),
        catchError(this.apiService.passthroughError)
      );
    },
  };

  // ================= PUBLIC APIs =================
  public readonly public = {
    getTaxes: (): Observable<ApiResponse<TaxItem[]>> => {
      return this.apiService.get<ApiResponse<TaxItem[]>>('/public/taxes').pipe(
        map((response) => response.data),
        catchError(this.apiService.passthroughError)
      );
    },

    getDefaultTax: (): Observable<ApiResponse<TaxItem>> => {
      return this.apiService.get<ApiResponse<TaxItem>>('/public/taxes/default').pipe(
        map((response) => response.data),
        tap((res) => {
          if (res?.data) {
            this.#defaultTax.set(res.data);
          }
        }),
        catchError((err) => {
          // If public default tax endpoint fails or returns null, set sensible fallback
          return this.apiService.passthroughError(err);
        })
      );
    },
  };

  public loadDefaultTax(): Observable<TaxItem | null> {
    return this.public.getDefaultTax().pipe(
      map((res) => res.data ?? null),
      catchError(() => {
        // Sensible fallback: Standard 12% GST
        const fallbackTax: TaxItem = {
          id: 'default-gst-12',
          name: 'Standard GST',
          code: 'GST_12',
          rate: 12.0,
          tax_type: 'percentage',
          is_inclusive: false,
          is_default: true,
          cgst_rate: 6.0,
          sgst_rate: 6.0,
          igst_rate: 12.0,
          hsn_sac_code: '996311',
          status: 'active',
        };
        this.#defaultTax.set(fallbackTax);
        return of(fallbackTax);
      })
    );
  }
}

