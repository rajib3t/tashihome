import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from '../api/api-service';
import { ApiResponse } from '../api/api-response.model';
import {
  AdminDashboardData,
  AdminDashboardSummaryData,
  VendorDashboardData,
  VendorDashboardSummaryData,
} from './dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly apiService = inject(ApiService);

  public extractApiErrorMessage(error: any): string | null {
    return this.apiService.extractApiErrorMessage(error);
  }

  // ── Admin Endpoints ─────────────────────────────────────────────────────────
  public getAdminDashboard(months: number = 12): Observable<ApiResponse<AdminDashboardData>> {
    return this.apiService
      .protectedGet<ApiResponse<AdminDashboardData>>('/admin/dashboard', {
        params: { months },
      })
      .pipe(
        map((res) => res.data),
        catchError(this.apiService.passthroughError)
      );
  }

  public getAdminDashboardSummary(): Observable<ApiResponse<AdminDashboardSummaryData>> {
    return this.apiService
      .protectedGet<ApiResponse<AdminDashboardSummaryData>>('/admin/dashboard/summary')
      .pipe(
        map((res) => res.data),
        catchError(this.apiService.passthroughError)
      );
  }

  // ── Vendor Endpoints ────────────────────────────────────────────────────────
  public getVendorDashboard(months: number = 12): Observable<ApiResponse<VendorDashboardData>> {
    return this.apiService
      .protectedGet<ApiResponse<VendorDashboardData>>('/vendor/dashboard', {
        params: { months },
      })
      .pipe(
        map((res) => res.data),
        catchError(this.apiService.passthroughError)
      );
  }

  public getVendorDashboardSummary(): Observable<ApiResponse<VendorDashboardSummaryData>> {
    return this.apiService
      .protectedGet<ApiResponse<VendorDashboardSummaryData>>('/vendor/dashboard/summary')
      .pipe(
        map((res) => res.data),
        catchError(this.apiService.passthroughError)
      );
  }

  // ── Sub-namespaces for convenience & consistency ────────────────────────────
  public readonly admin = {
    getDashboard: (months: number = 12) => this.getAdminDashboard(months),
    getSummary: () => this.getAdminDashboardSummary(),
  };

  public readonly vendor = {
    getDashboard: (months: number = 12) => this.getVendorDashboard(months),
    getSummary: () => this.getVendorDashboardSummary(),
  };
}

