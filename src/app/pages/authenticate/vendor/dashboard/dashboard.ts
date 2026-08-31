import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { RouterModule } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';
import { DashboardService } from '../../../../services/dashboard/dashboard-service';
import {
  RecentBooking,
  TopProperty,
  VendorDashboardData,
} from '../../../../services/dashboard/dashboard.model';
import { SettingsService } from '../../../../services/settings/settings-service';
import { PageBreadcrumb } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb';
import { environment } from '../../../../../environments/environment';
@Component({
  selector: 'app-vendor-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    PageBreadcrumb,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  public readonly assetUrl = environment.assetUrl;
  private readonly dashboardService = inject(DashboardService);
  private readonly settingsService = inject(SettingsService);

  // ── States ──────────────────────────────────────────────────────────────────
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly selectedMonths = signal<number>(12);
  readonly dashboardData = signal<VendorDashboardData | null>(null);
  readonly activeBookingTab = signal<'upcoming' | 'recent'>('upcoming');
  readonly activeTrendTab = signal<'revenue' | 'bookings'>('revenue');

  readonly monthOptions = [
    { label: 'Last 3 Months', value: 3 },
    { label: 'Last 6 Months', value: 6 },
    { label: 'Last 12 Months', value: 12 },
    { label: 'Last 24 Months', value: 24 },
  ];

  // ── Computed Accessors ──────────────────────────────────────────────────────
  readonly revenueSummary = computed(() => this.dashboardData()?.revenue_summary);
  readonly bookingsSummary = computed(() => this.dashboardData()?.bookings_summary);
  readonly propertiesSummary = computed(() => this.dashboardData()?.properties_summary);
  readonly reviewsSummary = computed(() => this.dashboardData()?.reviews_summary);
  readonly occupancyToday = computed(() => this.dashboardData()?.occupancy_today);
  readonly revenueTrends = computed(() => this.dashboardData()?.revenue_trends || []);
  readonly recentBookings = computed(() => this.dashboardData()?.recent_bookings || []);
  readonly upcomingBookings = computed(() => this.dashboardData()?.upcoming_bookings || []);
  readonly topProperties = computed(() => this.dashboardData()?.top_properties || []);

  readonly propertiesByType = computed(() => {
    const byType = this.propertiesSummary()?.by_type || {};
    return Object.entries(byType).map(([type, count]) => ({ type, count }));
  });

  readonly maxRevenue = computed(() => {
    const trends = this.revenueTrends();
    if (!trends.length) return 1;
    return Math.max(...trends.map((t) => t.revenue || 0), 1);
  });

  readonly maxBookings = computed(() => {
    const trends = this.revenueTrends();
    if (!trends.length) return 1;
    return Math.max(...trends.map((t) => t.bookings_count || 0), 1);
  });

  readonly totalTrendsRevenue = computed(() => {
    return this.revenueTrends().reduce((acc, curr) => acc + (curr.revenue || 0), 0);
  });

  readonly totalTrendsBookings = computed(() => {
    return this.revenueTrends().reduce((acc, curr) => acc + (curr.bookings_count || 0), 0);
  });

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(months = this.selectedMonths()): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.dashboardService
      .getVendorDashboard(months)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        catchError((error) => {
          this.errorMessage.set(
            error?.error?.message ||
              error?.message ||
              'Unable to load vendor dashboard data. Please try again.'
          );
          return of(null);
        })
      )
      .subscribe((res) => {
        if (!res) return;
        const payload = (res.data as any)?.data !== undefined ? (res.data as any).data : res.data;
        this.dashboardData.set(payload || null);
      });
  }

  onMonthsChange(months: number): void {
    this.selectedMonths.set(months);
    this.loadDashboard(months);
  }

  refresh(): void {
    this.loadDashboard(this.selectedMonths());
  }

  // ── Helpers & Formatters ────────────────────────────────────────────────────
  formatCurrency(value?: number, currency = 'INR'): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      maximumFractionDigits: 0,
    }).format(value || 0);
  }

  formatDate(dateStr?: string | Date | null): string {
    return this.settingsService.formatDate(dateStr);
  }

  formatDateTime(dateStr?: string | Date | null): string {
    return this.settingsService.formatDateTime(dateStr);
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      pending: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/20',
      confirmed: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/20',
      checked_in: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/20',
      check_in: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/20',
      checked_out: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/20',
      check_out: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/20',
      cancelled: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/20',
      completed: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/20',
      no_show: 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700',
    };
    return map[status?.toLowerCase()] || 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  }

  getPaymentStatusClass(status: string): string {
    const map: Record<string, string> = {
      paid: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/20',
      pending: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/20',
      failed: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/20',
      refunded: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/20',
    };
    return map[status?.toLowerCase()] || 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  }

  formatStatusLabel(status: string): string {
    if (!status) return '—';
    return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  getStarArray(rating: number = 0): { filled: boolean }[] {
    const rounded = Math.round(rating);
    return Array.from({ length: 5 }, (_, i) => ({ filled: i < rounded }));
  }

  resolveAssetUrl(url?: string | null): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
      return url;
    }
    const base = this.assetUrl ? (this.assetUrl.endsWith('/') ? this.assetUrl : `${this.assetUrl}/`) : '';
    const cleanPath = url.startsWith('/') ? url.substring(1) : url;
    return `${base}${cleanPath}`;
  }
}
