import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { catchError, finalize, of } from 'rxjs';
import { PaginationMeta } from '../../../../services/api/api-response.model';
import { RefundRequest, RefundStatus } from '../../../../services/refund/refund.model';
import { RefundService } from '../../../../services/refund/refund-service';
import { SettingsService } from '../../../../services/settings/settings-service';
import { PageBreadcrumb } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb';
import { Card } from '../../../../shared/components/ui/card/card';
import { Modal } from '../../../../shared/components/ui/modal/modal';
import { Pagination } from '../../../../shared/components/ui/pagination/pagination';

export type RefundAction = 'approved' | 'rejected' | 'process';

import { TableLoaderComponent } from '../../../../shared/components/ui/table-loader/table-loader.component';

@Component({
  selector: 'app-refund-management',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PageBreadcrumb,
    Card,
    Modal,
    Pagination,
    TableLoaderComponent,
  ],
  templateUrl: './refund-management.html',
  styleUrl: './refund-management.css',
})
export class RefundManagement implements OnInit, OnDestroy {
  private readonly refundsApi = inject(RefundService);
  private readonly settings = inject(SettingsService);
  private readonly fb = inject(FormBuilder);

  // List & State
  readonly refunds = signal<RefundRequest[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly currentPage = signal(1);
  readonly pageSize = signal(10);
  readonly sortOrder = signal<'desc' | 'asc'>('desc');
  meta: PaginationMeta = { total: 0, page: 1, size: 10 };
  readonly pageSizeOptions = [10, 20, 30, 50];

  // Quick filter tab
  readonly activeStatusTab = signal<'' | RefundStatus>('');

  // Search & Filter Form
  readonly searchForm = this.fb.group({
    status: [''],
    booking_id: [''],
  });

  // Action Modal State (Approve / Reject / Process)
  readonly isActionModalOpen = signal(false);
  readonly refundToAction = signal<RefundRequest | null>(null);
  readonly pendingAction = signal<RefundAction | null>(null);
  readonly isSubmitting = signal(false);
  readonly actionError = signal('');

  // Detail Modal State
  readonly isDetailModalOpen = signal(false);
  readonly selectedRefund = signal<RefundRequest | null>(null);

  // Copy Feedback State
  readonly copiedId = signal<string | null>(null);
  private copyTimeout: any = null;
  private messageTimeout: any = null;

  readonly statuses: RefundStatus[] = ['pending', 'approved', 'rejected', 'processed'];

  // Metrics / KPI signals computed from currently loaded batch
  readonly metrics = computed(() => {
    const list = this.refunds();
    const total = this.meta.total || list.length;
    const pending = list.filter((r) => r.status === 'pending').length;
    const approved = list.filter((r) => r.status === 'approved').length;
    const processed = list.filter((r) => r.status === 'processed').length;
    const totalProcessedAmount = list
      .filter((r) => r.status === 'processed')
      .reduce((sum, r) => sum + (r.amount || 0), 0);

    return { total, pending, approved, processed, totalProcessedAmount };
  });

  ngOnInit(): void {
    this.loadRefunds();
  }

  ngOnDestroy(): void {
    if (this.copyTimeout) clearTimeout(this.copyTimeout);
    if (this.messageTimeout) clearTimeout(this.messageTimeout);
  }

  // ── Search & Filter ────────────────────────────────────────────────────────
  onSearch(): void {
    const currentFormStatus = (this.searchForm.get('status')?.value || '') as '' | RefundStatus;
    this.activeStatusTab.set(currentFormStatus);
    this.currentPage.set(1);
    this.loadRefunds();
  }

  onReset(): void {
    this.searchForm.reset({ status: '', booking_id: '' });
    this.activeStatusTab.set('');
    this.currentPage.set(1);
    this.loadRefunds();
  }

  onStatusTabChange(status: '' | RefundStatus): void {
    this.activeStatusTab.set(status);
    this.searchForm.patchValue({ status });
    this.currentPage.set(1);
    this.loadRefunds();
  }

  toggleSort(): void {
    const newOrder = this.sortOrder() === 'desc' ? 'asc' : 'desc';
    this.sortOrder.set(newOrder);
    this.loadRefunds();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadRefunds();
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
    this.loadRefunds();
  }

  // ── Detail Modal ───────────────────────────────────────────────────────────
  openDetail(refund: RefundRequest): void {
    this.selectedRefund.set(refund);
    this.isDetailModalOpen.set(true);
  }

  closeDetail(): void {
    this.isDetailModalOpen.set(false);
    this.selectedRefund.set(null);
  }

  // ── Action Modal (Approve, Reject, Process) ─────────────────────────────────
  openAction(refund: RefundRequest, action: RefundAction): void {
    this.refundToAction.set(refund);
    this.pendingAction.set(action);
    this.actionError.set('');
    this.isActionModalOpen.set(true);
  }

  closeAction(force = false): void {
    if (this.isSubmitting() && !force) return;
    this.isActionModalOpen.set(false);
    this.refundToAction.set(null);
    this.pendingAction.set(null);
    this.actionError.set('');
  }

  confirmAction(): void {
    const refund = this.refundToAction();
    const action = this.pendingAction();
    if (!refund || !action) return;

    this.isSubmitting.set(true);
    this.actionError.set('');

    if (action === 'process') {
      this.refundsApi
        .processRefund(refund.id)
        .pipe(
          finalize(() => this.isSubmitting.set(false)),
          catchError((error) => {
            this.actionError.set(
              error?.error?.message || error?.message || 'Unable to process Razorpay refund. Please try again.'
            );
            return of(null);
          })
        )
        .subscribe((response) => {
          this.isSubmitting.set(false);
          if (!response) return;

          const gateway = response.data?.razorpay_status
            ? ` (Razorpay status: ${response.data.razorpay_status})`
            : '';

          this.showSuccess(
            (response.message || 'Razorpay refund processed successfully.') + gateway
          );

          if (this.selectedRefund()?.id === refund.id) {
            this.selectedRefund.update((curr) =>
              curr ? { ...curr, status: 'processed' } : null
            );
          }

          this.closeAction(true);
          this.closeDetail();
          this.loadRefunds();
        });
    } else {
      this.refundsApi
        .updateStatus(refund.id, action)
        .pipe(
          finalize(() => this.isSubmitting.set(false)),
          catchError((error) => {
            this.actionError.set(
              error?.error?.message || error?.message || 'Unable to update refund status. Please try again.'
            );
            return of(null);
          })
        )
        .subscribe((response) => {
          this.isSubmitting.set(false);
          if (!response) return;

          this.showSuccess(
            response.message || `${this.actionLabel(action)} successfully.`
          );

          if (this.selectedRefund()?.id === refund.id) {
            this.selectedRefund.update((curr) =>
              curr ? { ...curr, status: action } : null
            );
          }

          this.closeAction(true);
          this.closeDetail();
          this.loadRefunds();
        });
    }
  }

  actionLabel(action: RefundAction): string {
    switch (action) {
      case 'process':
        return 'Process Razorpay Refund';
      case 'approved':
        return 'Approve Refund';
      case 'rejected':
        return 'Reject Refund';
      default:
        return 'Confirm Action';
    }
  }

  // ── Clipboard Copy ─────────────────────────────────────────────────────────
  copyToClipboard(text: string, idKey: string): void {
    if (!navigator?.clipboard) return;
    navigator.clipboard.writeText(text).then(() => {
      this.copiedId.set(idKey);
      if (this.copyTimeout) clearTimeout(this.copyTimeout);
      this.copyTimeout = setTimeout(() => this.copiedId.set(null), 2000);
    });
  }

  // ── Formatters & Helpers ───────────────────────────────────────────────────
  getSerialNumber(index: number): number {
    return (this.currentPage() - 1) * this.meta.size + index + 1;
  }

  formatCurrency(value?: number, currency = 'INR'): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      maximumFractionDigits: 2,
    }).format(value || 0);
  }

  formatDateTime(value?: string | null): string {
    return value ? this.settings.formatDateTime(value) : '—';
  }

  statusClass(status: string): string {
    const classes: Record<string, string> = {
      pending:
        'bg-amber-50 text-amber-700 border border-amber-200/60 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20',
      approved:
        'bg-blue-50 text-blue-700 border border-blue-200/60 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20',
      rejected:
        'bg-rose-50 text-rose-700 border border-rose-200/60 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/20',
      processed:
        'bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20',
    };
    return (
      classes[status] ||
      'bg-slate-50 text-slate-700 border border-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:border-slate-700'
    );
  }

  statusDotClass(status: string): string {
    const dots: Record<string, string> = {
      pending: 'bg-amber-500',
      approved: 'bg-blue-500',
      rejected: 'bg-rose-500',
      processed: 'bg-emerald-500',
    };
    return dots[status] || 'bg-slate-400';
  }

  dismissAlert(): void {
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  private showSuccess(msg: string): void {
    this.successMessage.set(msg);
    if (this.messageTimeout) clearTimeout(this.messageTimeout);
    this.messageTimeout = setTimeout(() => this.successMessage.set(''), 6000);
  }

  private loadRefunds(): void {
    const filters = this.searchForm.getRawValue();
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.refundsApi
      .getRefunds({
        page: this.currentPage(),
        size: this.pageSize(),
        sort_order: this.sortOrder(),
        status: (filters.status || undefined) as RefundStatus | undefined,
        booking_id: filters.booking_id?.trim() || undefined,
      })
      .pipe(
        finalize(() => this.isLoading.set(false)),
        catchError((error) => {
          this.errorMessage.set(
            error?.error?.message || error?.message || 'Unable to load refund requests.'
          );
          this.refunds.set([]);
          return of(null);
        })
      )
      .subscribe((response) => {
        if (!response) return;
        this.refunds.set(response.data || []);
        this.meta = response.meta || {
          total: response.data?.length || 0,
          page: this.currentPage(),
          size: this.pageSize(),
        };
      });
  }
}
