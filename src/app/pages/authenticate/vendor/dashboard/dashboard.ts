import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { RouterModule } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { catchError, finalize, of } from 'rxjs';
import { DashboardService } from '../../../../services/dashboard/dashboard-service';
import {
  DashboardBookingItem,
  DashboardPayoutItem,
  PayoutStats,
  RecentRoomBlock,
  RoomBlockStats,
  TopPropertyItem,
  VendorDashboardData,
} from '../../../../services/dashboard/dashboard.model';
import { SettingsService } from '../../../../services/settings/settings-service';
import { AgreementService } from '../../../../services/agreement/agreement-service';
import { PageBreadcrumb } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb';
import { Modal } from '../../../../shared/components/ui/modal/modal';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-vendor-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    PageBreadcrumb,
    Modal,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit, OnDestroy {
  public readonly assetUrl = environment.assetUrl;
  private readonly dashboardService = inject(DashboardService);
  private readonly settingsService = inject(SettingsService);
  private readonly agreementService = inject(AgreementService);
  private readonly sanitizer = inject(DomSanitizer);

  // ── States ──────────────────────────────────────────────────────────────────
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly selectedMonths = signal<number>(12);
  readonly dashboardData = signal<VendorDashboardData | null>(null);
  readonly vendorAgreement = signal<any | null>(null);
  readonly activeBookingTab = signal<'upcoming' | 'recent'>('upcoming');
  readonly activeTrendTab = signal<'revenue' | 'bookings'>('revenue');
  readonly copiedKey = signal<string>('');

  // PDF Preview & Silent Download State
  readonly isPreviewModalOpen = signal<boolean>(false);
  readonly isPreviewLoading = signal<boolean>(false);
  readonly previewError = signal<string | null>(null);
  readonly previewPdfUrl = signal<SafeResourceUrl | null>(null);
  readonly previewAgreementTitle = signal<string>('Host Partnership Agreement');
  readonly isDownloadingPdf = signal<boolean>(false);
  private currentPreviewBlob: Blob | null = null;
  private currentPreviewBlobUrl: string | null = null;

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
  readonly payoutsSummary = computed<PayoutStats>(() => {
    const raw = this.dashboardData()?.payouts_summary;
    if (raw) return raw;

    const payouts = this.recentPayouts();
    const paidList = payouts.filter((p) => p.status?.toLowerCase() === 'paid');
    const procList = payouts.filter((p) => p.status?.toLowerCase() === 'processing');
    const pendList = payouts.filter((p) => p.status?.toLowerCase() === 'pending');
    const failList = payouts.filter((p) => ['failed', 'rejected', 'reversed'].includes(p.status?.toLowerCase()));
    const lastPaid = paidList[0] || payouts[0];

    const totalPaid = paidList.length ? paidList.reduce((acc, p) => acc + (p.amount || 0), 0) : (this.revenueSummary()?.total_revenue || 0);
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
  readonly reviewsSummary = computed(() => this.dashboardData()?.reviews_summary);
  readonly roomBlocksSummary = computed(() => this.dashboardData()?.room_blocks_summary);
  readonly occupancyToday = computed(() => this.dashboardData()?.occupancy_today);
  readonly revenueTrends = computed(() => this.dashboardData()?.revenue_trends || []);
  readonly recentBookings = computed(() => this.dashboardData()?.recent_bookings || []);
  readonly upcomingBookings = computed(() => this.dashboardData()?.upcoming_bookings || []);
  readonly recentPayouts = computed(() => this.dashboardData()?.recent_payouts || []);
  readonly recentRoomBlocks = computed(() => this.dashboardData()?.recent_room_blocks || []);
  readonly topProperties = computed(() => this.dashboardData()?.top_properties || []);

  readonly propertiesByType = computed(() => {
    const byType = this.propertiesSummary()?.by_type || {};
    return Object.entries(byType).map(([type, count]) => ({ type, count }));
  });

  readonly maxRevenue = computed(() => {
    const trends = this.revenueTrends();
    if (!trends.length) return 1;
    return Math.max(...trends.map((t) => t.revenue || t.gross_revenue || 0), 1);
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

  // Effective Net Earnings & Gross
  readonly netEarningsAmount = computed(() => {
    const rev = this.revenueSummary();
    if (rev?.net_revenue !== undefined) return rev.net_revenue;
    if (rev?.total_revenue !== undefined) return rev.total_revenue;
    return 0;
  });

  readonly grossEarningsAmount = computed(() => {
    const rev = this.revenueSummary();
    if (rev?.gross_revenue !== undefined) return rev.gross_revenue;
    return (rev?.total_revenue || 0) + (rev?.refunded_amount || 0);
  });

  ngOnInit(): void {
    this.loadDashboard();
    this.loadAgreement();
  }

  ngOnDestroy(): void {
    this.cleanupPreviewBlob();
  }

  loadAgreement(): void {
    this.agreementService
      .getMyAgreement()
      .pipe(catchError(() => of(null)))
      .subscribe((data) => {
        this.vendorAgreement.set(data);
      });
  }

  isAgreementSigned(status?: string | null): boolean {
    const s = status?.toLowerCase();
    return s === 'signed' || s === 'active' || s === 'fully_signed';
  }

  isAgreementPartiallySigned(status?: string | null): boolean {
    const s = status?.toLowerCase();
    return s === 'partially_signed' || s === 'pending_first_party' || s === 'pending_second_party';
  }

  isAgreementPending(status?: string | null): boolean {
    const s = status?.toLowerCase();
    return !s || s === 'pending' || s === 'draft' || s === 'sent' || this.isAgreementPartiallySigned(status);
  }

  getPdfUrl(agreement?: any): string {
    const ag = agreement || this.vendorAgreement();
    return (
      ag?.pdf_file_url ||
      ag?.pdf_download_url ||
      ag?.pdf_url ||
      ag?.file_url ||
      (ag?.id ? `/public/agreements/${ag.id}/pdf` : '') ||
      (ag?.token ? `/public/agreements/${ag.token}/pdf` : '') ||
      this.agreementService.getVendorDownloadUrl()
    );
  }

  previewPdf(agreement?: any): void {
    const ag = agreement || this.vendorAgreement();
    if (!ag) return;

    this.previewAgreementTitle.set(
      ag.title || ag.agreement_number || 'Host Partnership Agreement'
    );
    this.previewError.set(null);
    this.cleanupPreviewBlob();
    this.isPreviewModalOpen.set(true);
    this.isPreviewLoading.set(true);

    const url = this.getPdfUrl(ag);
    const fallbackId = ag?.id || ag?.token;
    this.agreementService.fetchPdfBlob(url, fallbackId).subscribe({
      next: (blob) => {
        this.currentPreviewBlob = blob;
        this.currentPreviewBlobUrl = URL.createObjectURL(blob);
        this.previewPdfUrl.set(
          this.sanitizer.bypassSecurityTrustResourceUrl(this.currentPreviewBlobUrl)
        );
        this.isPreviewLoading.set(false);
      },
      error: (err) => {
        this.isPreviewLoading.set(false);
        this.previewError.set(
          this.agreementService.extractApiErrorMessage(err) ||
            'Failed to load agreement PDF. Please try downloading directly instead.'
        );
      },
    });
  }

  closePreviewModal(): void {
    this.isPreviewModalOpen.set(false);
    this.cleanupPreviewBlob();
  }

  private cleanupPreviewBlob(): void {
    if (this.currentPreviewBlobUrl) {
      URL.revokeObjectURL(this.currentPreviewBlobUrl);
      this.currentPreviewBlobUrl = null;
    }
    this.currentPreviewBlob = null;
    this.previewPdfUrl.set(null);
  }

  downloadCurrentPreview(): void {
    const ag = this.vendorAgreement();
    const idStr = ag?.id || ag?.token || 'agreement';
    const filename = `TashiHome-Host-Agreement-${idStr.slice(0, 8)}.pdf`;
    if (this.currentPreviewBlob) {
      this.agreementService.downloadBlob(this.currentPreviewBlob, filename);
    } else {
      this.downloadPdf(ag);
    }
  }

  downloadPdf(agreement?: any): void {
    const ag = agreement || this.vendorAgreement();
    const url = this.getPdfUrl(ag);
    const fallbackId = ag?.id || ag?.token;
    const idStr = ag?.id || ag?.token || 'agreement';
    const filename = `TashiHome-Host-Agreement-${idStr.slice(0, 8)}.pdf`;
    this.isDownloadingPdf.set(true);

    this.agreementService.fetchPdfBlob(url, fallbackId).subscribe({
      next: (blob) => {
        this.isDownloadingPdf.set(false);
        this.agreementService.downloadBlob(blob, filename);
      },
      error: (err) => {
        this.isDownloadingPdf.set(false);
        const msg =
          this.agreementService.extractApiErrorMessage(err) ||
          'Failed to download agreement PDF. Please try again or contact support.';
        alert(msg);
      },
    });
  }

  getVendorAgreementDownloadUrl(): string {
    return this.agreementService.getVendorDownloadUrl();
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
        let payload: any = res;
        if (payload?.data?.data !== undefined) {
          payload = payload.data.data;
        } else if (
          payload?.data !== undefined &&
          (payload.data.bookings_summary ||
            payload.data.revenue_summary ||
            payload.data.payouts_summary ||
            payload.data.occupancy_today)
        ) {
          payload = payload.data;
        }
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
