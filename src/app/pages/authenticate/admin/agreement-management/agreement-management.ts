import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PageBreadcrumb } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb';
import { Card } from '../../../../shared/components/ui/card/card';
import { Modal } from '../../../../shared/components/ui/modal/modal';
import { Pagination } from '../../../../shared/components/ui/pagination/pagination';
import { AgreementService } from '../../../../services/agreement/agreement-service';
import { UserService } from '../../../../services/user/user-service';
import { PaginationMeta } from '../../../../services/api/api-response.model';
import {
  AgreementStatus,
  VendorAgreementItem,
} from '../../../../core/models/agreement.model';
import { User } from '../../../../services/user/user.model';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-agreement-management',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    PageBreadcrumb,
    Card,
    Modal,
    Pagination,
  ],
  templateUrl: './agreement-management.html',
  styleUrl: './agreement-management.css',
})
export class AgreementManagement implements OnInit {
  private readonly agreementService = inject(AgreementService);
  private readonly userService = inject(UserService);
  private readonly fb = inject(FormBuilder);

  public readonly agreements = signal<VendorAgreementItem[]>([]);
  public readonly isLoading = signal<boolean>(false);
  public readonly errorMessage = signal<string | null>(null);
  public readonly successMessage = signal<string | null>(null);

  // Pagination
  public readonly currentPage = signal<number>(1);
  public readonly pageSize = signal<number>(10);
  public readonly totalItems = signal<number>(0);
  public meta: PaginationMeta = {
    page: 1,
    size: 10,
    total: 0,
  };
  public readonly pageSizeOptions = [10, 20, 50];

  // Search & Filters
  public readonly searchForm = this.fb.group({
    search: [''],
    status: [''],
  });

  // Action modals
  public readonly isSendModalOpen = signal<boolean>(false);
  public readonly isSending = signal<boolean>(false);
  public readonly sendError = signal<string | null>(null);

  public readonly isResendModalOpen = signal<boolean>(false);
  public readonly isResending = signal<boolean>(false);
  public readonly resendError = signal<string | null>(null);
  public readonly selectedAgreement = signal<VendorAgreementItem | null>(null);

  public readonly isCancelModalOpen = signal<boolean>(false);
  public readonly isCancelling = signal<boolean>(false);
  public readonly cancelError = signal<string | null>(null);

  public readonly isDetailModalOpen = signal<boolean>(false);

  // Vendors list for Send Agreement modal
  public readonly vendorsList = signal<User[]>([]);
  public readonly loadingVendors = signal<boolean>(false);

  public readonly sendAgreementForm = this.fb.group({
    vendor_id: ['', [Validators.required]],
    commission_percentage: [10.0, [Validators.required, Validators.min(0), Validators.max(100)]],
    valid_days: [7, [Validators.required, Validators.min(1), Validators.max(90)]],
    custom_notes: [''],
  });

  ngOnInit(): void {
    this.loadAgreements();
  }

  public loadAgreements(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const filterVal = this.searchForm.getRawValue();
    this.agreementService
      .getAgreements({
        page: this.currentPage(),
        limit: this.pageSize(),
        status: filterVal.status || undefined,
        search: filterVal.search?.trim() || undefined,
      })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (res) => {
          this.agreements.set(res.data || []);
          const total = res.meta?.total || (res.data ? res.data.length : 0);
          this.totalItems.set(total);
          this.meta = {
            page: res.meta?.page || this.currentPage(),
            size: res.meta?.limit || res.meta?.size || this.pageSize(),
            total: total,
          };
        },
        error: (err) => {
          const msg =
            this.agreementService.extractApiErrorMessage(err) ||
            err?.error?.message ||
            'Unable to load host agreements.';
          this.errorMessage.set(msg);
          this.agreements.set([]);
        },
      });
  }

  public onSearch(): void {
    this.currentPage.set(1);
    this.loadAgreements();
  }

  public onReset(): void {
    this.searchForm.reset({ search: '', status: '' });
    this.currentPage.set(1);
    this.loadAgreements();
  }

  public onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadAgreements();
  }

  public onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
    this.loadAgreements();
  }

  // ── Send Agreement to Existing Vendor Modal ────────────────────────────────
  public openSendModal(preselectedVendorId?: string): void {
    this.sendAgreementForm.reset({
      vendor_id: preselectedVendorId || '',
      commission_percentage: 10.0,
      valid_days: 7,
      custom_notes: '',
    });
    this.sendError.set(null);
    this.isSendModalOpen.set(true);

    if (this.vendorsList().length === 0) {
      this.loadVendors();
    }
  }

  public closeSendModal(): void {
    this.isSendModalOpen.set(false);
  }

  private loadVendors(): void {
    this.loadingVendors.set(true);
    this.userService
      .getVendors({ page: 1, size: 100 })
      .pipe(finalize(() => this.loadingVendors.set(false)))
      .subscribe({
        next: (res) => {
          this.vendorsList.set(res.data || []);
        },
        error: () => {
          // Fallback or leave empty
        },
      });
  }

  public submitSendAgreement(): void {
    if (this.sendAgreementForm.invalid) {
      this.sendAgreementForm.markAllAsTouched();
      return;
    }

    const { vendor_id, commission_percentage, valid_days, custom_notes } =
      this.sendAgreementForm.getRawValue();

    if (!vendor_id) return;

    this.isSending.set(true);
    this.sendError.set(null);

    this.agreementService
      .sendAgreementToVendor(vendor_id, {
        commission_percentage: Number(commission_percentage) || 10.0,
        valid_days: Number(valid_days) || 7,
        custom_notes: custom_notes || undefined,
      })
      .pipe(finalize(() => this.isSending.set(false)))
      .subscribe({
        next: (res) => {
          this.successMessage.set(
            res?.message || 'Host Partnership Agreement sent successfully to vendor!'
          );
          this.closeSendModal();
          this.loadAgreements();
        },
        error: (err) => {
          const msg =
            this.agreementService.extractApiErrorMessage(err) ||
            err?.error?.message ||
            'Failed to send agreement to vendor. Please check details and retry.';
          this.sendError.set(msg);
        },
      });
  }

  // ── Resend Agreement ───────────────────────────────────────────────────────
  public openResendModal(item: VendorAgreementItem): void {
    this.selectedAgreement.set(item);
    this.resendError.set(null);
    this.isResendModalOpen.set(true);
  }

  public closeResendModal(): void {
    this.isResendModalOpen.set(false);
    this.selectedAgreement.set(null);
  }

  public confirmResend(): void {
    const ag = this.selectedAgreement();
    if (!ag) return;

    this.isResending.set(true);
    this.resendError.set(null);

    this.agreementService
      .resendAgreement(ag.id)
      .pipe(finalize(() => this.isResending.set(false)))
      .subscribe({
        next: () => {
          this.successMessage.set(`Agreement invitation resent to ${ag.vendor?.email || 'vendor'}.`);
          this.closeResendModal();
          this.loadAgreements();
        },
        error: (err) => {
          const msg =
            this.agreementService.extractApiErrorMessage(err) ||
            err?.error?.message ||
            'Failed to resend agreement.';
          this.resendError.set(msg);
        },
      });
  }

  // ── Cancel Agreement ───────────────────────────────────────────────────────
  public openCancelModal(item: VendorAgreementItem): void {
    this.selectedAgreement.set(item);
    this.cancelError.set(null);
    this.isCancelModalOpen.set(true);
  }

  public closeCancelModal(): void {
    this.isCancelModalOpen.set(false);
    this.selectedAgreement.set(null);
  }

  public confirmCancel(): void {
    const ag = this.selectedAgreement();
    if (!ag) return;

    this.isCancelling.set(true);
    this.cancelError.set(null);

    this.agreementService
      .cancelAgreement(ag.id)
      .pipe(finalize(() => this.isCancelling.set(false)))
      .subscribe({
        next: () => {
          this.successMessage.set('Agreement cancelled successfully.');
          this.closeCancelModal();
          this.loadAgreements();
        },
        error: (err) => {
          const msg =
            this.agreementService.extractApiErrorMessage(err) ||
            err?.error?.message ||
            'Failed to cancel agreement.';
          this.cancelError.set(msg);
        },
      });
  }

  // ── View Details Modal ─────────────────────────────────────────────────────
  public openDetailModal(item: VendorAgreementItem): void {
    this.selectedAgreement.set(item);
    this.isDetailModalOpen.set(true);
  }

  public closeDetailModal(): void {
    this.isDetailModalOpen.set(false);
    this.selectedAgreement.set(null);
  }

  public downloadPdf(item: VendorAgreementItem): void {
    if (item.pdf_file_url) {
      window.open(item.pdf_file_url, '_blank');
    } else {
      window.open(this.agreementService.getSignedPdfUrl(item.id), '_blank');
    }
  }

  public getStatusBadgeClass(status: AgreementStatus): string {
    switch (status) {
      case 'signed':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800';
      case 'partially_signed':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200 dark:border-purple-800';
      case 'viewed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800';
      case 'sent':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800';
      case 'expired':
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
      case 'declined':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 border border-rose-200 dark:border-rose-800';
      case 'cancelled':
        return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    }
  }

  // ── Countersign Agreement (Party 1) ─────────────────────────────────────────
  public readonly isCountersigning = signal<boolean>(false);
  public readonly countersignError = signal<string | null>(null);

  public countersign(item: VendorAgreementItem): void {
    this.isCountersigning.set(true);
    this.countersignError.set(null);

    this.agreementService
      .countersignAgreement(item.id, {})
      .pipe(finalize(() => this.isCountersigning.set(false)))
      .subscribe({
        next: () => {
          this.successMessage.set('Agreement successfully countersigned as Platform Operator!');
          this.loadAgreements();
          if (this.isDetailModalOpen()) {
            this.closeDetailModal();
          }
        },
        error: (err) => {
          const msg =
            this.agreementService.extractApiErrorMessage(err) ||
            err?.error?.message ||
            'Failed to countersign agreement.';
          this.countersignError.set(msg);
          alert(msg);
        },
      });
  }
}

