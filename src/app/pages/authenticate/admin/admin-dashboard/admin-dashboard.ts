import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { RouterModule } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';
import { DashboardService } from '../../../../services/dashboard/dashboard-service';
import {
  AdminDashboardData,
  DashboardBookingItem,
  DashboardHostRequestItem,
  DashboardPayoutItem,
  DashboardRefundItem,
  DashboardUserItem,
  PayoutStats,
  RecentRoomBlock,
  RevenueTrendItem,
  RoomBlockStats,
  TopPropertyItem,
} from '../../../../services/dashboard/dashboard.model';
import { SettingsService } from '../../../../services/settings/settings-service';
import { PageBreadcrumb } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    PageBreadcrumb,
  ],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css',
})
export class AdminDashboard implements OnInit {
  public readonly assetUrl = environment.assetUrl;
  private readonly dashboardService = inject(DashboardService);
  private readonly settingsService = inject(SettingsService);

  // ── States ──────────────────────────────────────────────────────────────────
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly selectedMonths = signal<number>(12);
  readonly dashboardData = signal<AdminDashboardData | null>(null);
  readonly lastUpdated = signal<Date>(new Date());
  readonly activeTrendTab = signal<'revenue' | 'gross' | 'bookings'>('revenue');
  readonly copiedKey = signal<string>('');

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
  readonly usersSummary = computed(() => this.dashboardData()?.users_summary);
  readonly refundsSummary = computed(() => this.dashboardData()?.refunds_summary);
  readonly roomBlocksSummary = computed(() => this.dashboardData()?.room_blocks_summary);
  readonly occupancyToday = computed(() => this.dashboardData()?.occupancy_today);
  readonly revenueTrends = computed(() => this.dashboardData()?.revenue_trends || []);
  readonly recentBookings = computed(() => this.dashboardData()?.recent_bookings || []);
  readonly recentHostRequests = computed(() => this.dashboardData()?.recent_host_requests || []);
  readonly recentUsers = computed(() => this.dashboardData()?.recent_users || []);
  readonly recentRefundRequests = computed(() => this.dashboardData()?.recent_refund_requests || []);
  readonly recentPayouts = computed(() => this.dashboardData()?.recent_payouts || []);
  readonly recentRoomBlocks = computed(() => this.dashboardData()?.recent_room_blocks || []);
  readonly topProperties = computed(() => this.dashboardData()?.top_properties || []);

  readonly payoutsSummary = computed<PayoutStats>(() => {
    const raw = this.dashboardData()?.payouts_summary;
    if (raw) return raw;

    const payouts = this.recentPayouts();
    const paidList = payouts.filter((p) => p.status?.toLowerCase() === 'paid');
    const procList = payouts.filter((p) => p.status?.toLowerCase() === 'processing');
    const pendList = payouts.filter((p) => p.status?.toLowerCase() === 'pending');
    const failList = payouts.filter((p) => ['failed', 'rejected', 'reversed'].includes(p.status?.toLowerCase()));
    const lastPaid = paidList[0] || payouts[0];

    const totalPaid = paidList.length ? paidList.reduce((acc, p) => acc + (p.amount || 0), 0) : (this.revenueSummary()?.total_revenue || 0) * 0.85;
    const pendingAmt = pendList.length ? pendList.reduce((acc, p) => acc + (p.amount || 0), 0) : (this.revenueSummary()?.pending_revenue || 0);

    return {
      total_payouts: payouts.length || (paidList.length + procList.length + pendList.length),
      total_paid_amount: totalPaid,
      pending_payout_amount: pendingAmt,
      processing_payout_amount: procList.reduce((acc, p) => acc + (p.amount || 0), 0),
      failed_payout_amount: failList.reduce((acc, p) => acc + (p.amount || 0), 0),
      pending_count: pendList.length,
      processing_count: procList.length,
      paid_count: paidList.length,
      failed_count: failList.length,
      last_payout_date: lastPaid?.paid_at || lastPaid?.created_at || null,
      last_payout_amount: lastPaid?.amount || null,
      currency: this.revenueSummary()?.currency || 'INR',
    };
  });

  readonly propertiesByType = computed(() => {
    const byType = this.propertiesSummary()?.by_type || {};
    return Object.entries(byType).map(([type, count]) => ({ type, count }));
  });

  readonly usersByRole = computed(() => {
    const byRole = this.usersSummary()?.by_role || {};
    return Object.entries(byRole).map(([role, count]) => ({ role, count }));
  });

  readonly maxRevenue = computed(() => {
    const trends = this.revenueTrends();
    if (!trends.length) return 1;
    return Math.max(...trends.map((t) => Math.max(t.revenue || 0, t.gross_revenue || 0)), 1);
  });

  readonly maxBookings = computed(() => {
    const trends = this.revenueTrends();
    if (!trends.length) return 1;
    return Math.max(...trends.map((t) => t.bookings_count || 0), 1);
  });

  readonly totalTrendsRevenue = computed(() => {
    return this.revenueTrends().reduce((acc, curr) => acc + (curr.revenue || 0), 0);
  });

  readonly totalTrendsGrossRevenue = computed(() => {
    return this.revenueTrends().reduce((acc, curr) => acc + (curr.gross_revenue || curr.revenue || 0), 0);
  });

  readonly totalTrendsBookings = computed(() => {
    return this.revenueTrends().reduce((acc, curr) => acc + (curr.bookings_count || 0), 0);
  });

  // Effective Net Revenue & Gross
  readonly netRevenueAmount = computed(() => {
    const rev = this.revenueSummary();
    if (rev?.net_revenue !== undefined) return rev.net_revenue;
    if (rev?.total_revenue !== undefined) return rev.total_revenue;
    return 0;
  });

  readonly grossRevenueAmount = computed(() => {
    const rev = this.revenueSummary();
    if (rev?.gross_revenue !== undefined) return rev.gross_revenue;
    return (rev?.total_revenue || 0) + (rev?.refunded_amount || 0);
  });

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(months = this.selectedMonths()): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.dashboardService
      .getAdminDashboard(months)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        catchError((error) => {
          this.errorMessage.set(
            error?.error?.message ||
              error?.message ||
              'Unable to load admin dashboard data. Please try again.'
          );
          return of(null);
        })
      )
      .subscribe((res) => {
        if (!res) return;
        let payload: any = res;
        if (payload?.data?.data !== undefined) {
          payload = payload.data.data;
        } else if (
          payload?.data !== undefined &&
          (payload.data.bookings_summary ||
            payload.data.revenue_summary ||
            payload.data.users_summary ||
            payload.data.properties_summary)
        ) {
          payload = payload.data;
        }
        this.dashboardData.set(payload || null);
        this.lastUpdated.set(new Date());
      });
  }

  onMonthsChange(months: number): void {
    this.selectedMonths.set(months);
    this.loadDashboard(months);
  }

  refresh(): void {
    this.loadDashboard(this.selectedMonths());
  }

  copyToClipboard(text: string, key: string): void {
    if (!text) return;
    navigator.clipboard?.writeText(text).then(() => {
      this.copiedKey.set(key);
      setTimeout(() => {
        if (this.copiedKey() === key) {
          this.copiedKey.set('');
        }
      }, 2000);
    });
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
      confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/20',
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

  getPayoutStatusBadgeClass(status: string): string {
    const s = status?.toLowerCase();
    if (s === 'paid') {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/20';
    }
    if (s === 'processing') {
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/20';
    }
    if (s === 'pending') {
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/20';
    }
    if (s === 'failed' || s === 'rejected' || s === 'reversed') {
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/20';
    }
    return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  }

  getPayoutStatusDotClass(status: string): string {
    const s = status?.toLowerCase();
    if (s === 'paid') return 'bg-emerald-500';
    if (s === 'processing') return 'bg-blue-500 animate-pulse';
    if (s === 'pending') return 'bg-amber-500';
    if (s === 'failed' || s === 'rejected' || s === 'reversed') return 'bg-rose-500';
    return 'bg-slate-400';
  }

  getRefundStatusClass(status: string): string {
    const map: Record<string, string> = {
      pending: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/20',
      approved: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/20',
      processed: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/20',
      rejected: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/20',
    };
    return map[status?.toLowerCase()] || 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  }

  getUserRoleClass(role: string): string {
    const map: Record<string, string> = {
      admin: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/20',
      vendor: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/20',
      host: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/20',
      staff: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/20',
      customer: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/20',
      user: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/20',
    };
    return map[role?.toLowerCase()] || 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  }

  getHostStatusClass(status: string): string {
    const map: Record<string, string> = {
      pending: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/20',
      approved: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/20',
      rejected: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/20',
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

  getRoomBlockStatus(startDate?: string | null, endDate?: string | null): 'active' | 'upcoming' | 'past' {
    if (!startDate || !endDate) return 'past';
    const s = startDate.split('T')[0];
    const e = endDate.split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    if (e < today) return 'past';
    if (s <= today && e >= today) return 'active';
    return 'upcoming';
  }

  getRoomBlockStatusBadgeClass(status: string): string {
    const s = status?.toLowerCase();
    if (s === 'active') {
      return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50';
    }
    if (s === 'upcoming') {
      return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
  }

  calculateNights(startDate?: string | null, endDate?: string | null): number {
    if (!startDate || !endDate) return 0;
    const s = new Date(startDate.split('T')[0]);
    const e = new Date(endDate.split('T')[0]);
    const diffDays = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
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
