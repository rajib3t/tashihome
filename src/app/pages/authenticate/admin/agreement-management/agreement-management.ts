import { Component, OnInit, inject, signal, DestroyRef} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { PageBreadcrumb } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb';
import { Card } from '../../../../shared/components/ui/card/card';
import { Modal } from '../../../../shared/components/ui/modal/modal';
import { Pagination } from '../../../../shared/components/ui/pagination/pagination';
import { AgreementService } from '../../../../services/agreement/agreement-service';
import { SettingsService } from '../../../../services/settings/settings-service';
import { UserService } from '../../../../services/user/user-service';
import { PaginationMeta } from '../../../../services/api/api-response.model';
import {
  AgreementStatus,
  VendorAgreementItem,
} from '../../../../core/models/agreement.model';
import { AgreementTemplateItem } from '../../../../core/models/agreement-template.model';
import { AgreementTemplateComponent } from './agreement-template/agreement-template.component';
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
    AgreementTemplateComponent,
  ],
  templateUrl: './agreement-management.html',
  styleUrl: './agreement-management.css',
})
export class AgreementManagement implements OnInit {
  private readonly agreementService = inject(AgreementService);
  private readonly settingsService = inject(SettingsService);
  private readonly userService = inject(UserService);
  private readonly fb = inject(FormBuilder);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);

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

  // Tabs: 'agreements' | 'templates'
  public readonly activeTab = signal<'agreements' | 'templates'>('agreements');

  // Action modals
  public readonly isSendModalOpen = signal<boolean>(false);
  public readonly isSending = signal<boolean>(false);
  public readonly sendError = signal<string | null>(null);

  // Duplicate Prevention & Version Management
  public readonly isDuplicateBlocked = signal<boolean>(false);
  public readonly hasPendingAgreement = signal<boolean>(false);
  public readonly hasSignedAgreement = signal<boolean>(false);
  public readonly pendingAgreementForSelectedVendor = signal<any | null>(null);
  public readonly signedAgreementForSelectedVendor = signal<any | null>(null);
  public readonly checkingVendorStatus = signal<boolean>(false);
  public readonly vendorPreviousAgreements = signal<VendorAgreementItem[]>([]);
  public readonly isAmendmentMode = signal<boolean>(false);
  public readonly suggestedNextVersion = signal<string>('1.0');


  public readonly isResendModalOpen = signal<boolean>(false);
  public readonly isResending = signal<boolean>(false);
  public readonly resendError = signal<string | null>(null);
  public readonly selectedAgreement = signal<VendorAgreementItem | null>(null);

  public readonly isCancelModalOpen = signal<boolean>(false);
  public readonly isCancelling = signal<boolean>(false);
  public readonly cancelError = signal<string | null>(null);

  public readonly isDetailModalOpen = signal<boolean>(false);

  // PDF Preview & Silent Download State
  public readonly isPreviewModalOpen = signal<boolean>(false);
  public readonly isPreviewLoading = signal<boolean>(false);
  public readonly previewError = signal<string | null>(null);
  public readonly previewPdfUrl = signal<SafeResourceUrl | null>(null);
  public readonly previewAgreementTitle = signal<string>('');
  public readonly downloadingId = signal<string | null>(null);
  private currentPreviewBlob: Blob | null = null;
  private currentPreviewBlobUrl: string | null = null;

  // Vendors list for Send Agreement modal
  public readonly vendorsList = signal<User[]>([]);
  public readonly loadingVendors = signal<boolean>(false);

  // Available templates for Send Agreement modal
  public readonly availableTemplates = signal<AgreementTemplateItem[]>([]);
  public readonly loadingTemplates = signal<boolean>(false);

  public readonly sendAgreementForm = this.fb.group({
    vendor_id: ['', [Validators.required]],
    template_id: [''],
    commission_percentage: [this.settingsService.commissionPercentage(), [Validators.required, Validators.min(0), Validators.max(100)]],
    valid_days: [7, [Validators.required, Validators.min(1), Validators.max(90)]],
    version: ['1.0', [Validators.required]],
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
  public openSendModal(
    preselectedVendorId?: string,
    isAmendment: boolean = false,
    customVersion?: string
  ): void {
    const defaultValidity = this.settingsService.agreementDefaultValidityDays() || 7;
    this.isAmendmentMode.set(isAmendment);
    this.sendError.set(null);
    this.isDuplicateBlocked.set(false);
    this.pendingAgreementForSelectedVendor.set(null);

    const vendorIdStr = preselectedVendorId ? String(preselectedVendorId) : '';

    this.sendAgreementForm.reset({
      vendor_id: vendorIdStr,
      template_id: '',
      commission_percentage: this.settingsService.commissionPercentage(),
      valid_days: defaultValidity,
      version: customVersion || '1.0',
      custom_notes: '',
    });

    if (vendorIdStr) {
      this.checkVendorAgreements(vendorIdStr, customVersion);
    }

    this.isSendModalOpen.set(true);
    this.loadTemplatesForModal();

    if (this.vendorsList().length === 0) {
      this.loadVendors(vendorIdStr);
    }
  }


  public openAmendmentModal(item: VendorAgreementItem): void {
    const currentVerNum = parseFloat(String(item.version || '1.0').replace(/[^0-9.]/g, '')) || 1.0;
    const nextVer = `${(Math.floor(currentVerNum) + 1)}.0`;

    // 1. Resolve vendorId safely from multiple possible fields
    let vendorId = item.vendor?.id || (item as any).vendor_id;
    if (!vendorId && item.signer_email) {
      const matched = this.vendorsList().find(
        (v) => v.email?.toLowerCase() === item.signer_email?.toLowerCase()
      );
      if (matched) {
        vendorId = matched.id;
      }
    }

    // 2. Ensure vendor is present in vendorsList right away so <option> is immediately present
    if (item.vendor && item.vendor.id) {
      const exists = this.vendorsList().some(
        (v) => String(v.id) === String(item.vendor.id)
      );
      if (!exists) {
        this.vendorsList.update((list) => [
          {
            id: String(item.vendor.id),
            full_name: item.vendor.full_name || item.signer_name || 'Host Vendor',
            email: item.vendor.email || item.signer_email || '',
            phone: item.vendor.phone || item.signer_phone || '',
          } as any,
          ...list,
        ]);
      }
    } else if (vendorId && (item.signer_name || item.signer_email)) {
      const exists = this.vendorsList().some(
        (v) => String(v.id) === String(vendorId)
      );
      if (!exists) {
        this.vendorsList.update((list) => [
          {
            id: String(vendorId),
            full_name: item.signer_name || 'Host Vendor',
            email: item.signer_email || '',
            phone: item.signer_phone || '',
          } as any,
          ...list,
        ]);
      }
    }

    this.openSendModal(vendorId ? String(vendorId) : undefined, true, nextVer);
    this.sendAgreementForm.patchValue({
      vendor_id: vendorId ? String(vendorId) : '',
      commission_percentage: item.commission_percentage || this.settingsService.commissionPercentage(),
      version: nextVer,
      custom_notes: `Terms amendment v${nextVer} (Supersedes previous v${item.version || '1.0'})`,
    });
  }

  public onVendorSelectChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const vendorId = target.value;
    this.checkVendorAgreements(vendorId);
  }

  public checkVendorAgreements(vendorId: string, explicitVersion?: string): void {
    if (!vendorId) {
      this.isDuplicateBlocked.set(false);
      this.hasPendingAgreement.set(false);
      this.hasSignedAgreement.set(false);
      this.pendingAgreementForSelectedVendor.set(null);
      this.signedAgreementForSelectedVendor.set(null);
      this.vendorPreviousAgreements.set([]);
      this.isAmendmentMode.set(false);
      this.suggestedNextVersion.set('1.0');
      this.sendError.set(null);
      return;
    }

    this.checkingVendorStatus.set(true);
    this.sendError.set(null);

    this.agreementService
      .getVendorAgreementStatus(vendorId)
      .pipe(finalize(() => this.checkingVendorStatus.set(false)))
      .subscribe({
        next: (status) => {
          const pending = status?.pending_agreement || null;
          const signed = status?.signed_agreement || null;

          this.hasPendingAgreement.set(!!status?.has_pending);
          this.pendingAgreementForSelectedVendor.set(pending);

          this.hasSignedAgreement.set(!!status?.has_signed);
          this.signedAgreementForSelectedVendor.set(signed);

          // We do not block the admin! The backend auto-voids old pending agreements on submit.
          this.isDuplicateBlocked.set(false);

          if (explicitVersion) {
            this.suggestedNextVersion.set(explicitVersion);
            this.isAmendmentMode.set(true);
            this.sendAgreementForm.patchValue({ version: explicitVersion });
          } else if (status?.has_signed) {
            const nextVer = status?.suggested_next_version || '2.0';
            this.suggestedNextVersion.set(nextVer);
            this.isAmendmentMode.set(true);
            this.sendAgreementForm.patchValue({
              version: nextVer,
              custom_notes: `Amendment v${nextVer} (Supersedes v${signed?.version || '1.0'} upon execution)`,
            });
          } else if (status?.has_pending) {
            const curVer = pending?.version || '1.0';
            this.suggestedNextVersion.set(curVer);
            this.isAmendmentMode.set(false);
            this.sendAgreementForm.patchValue({ version: curVer });
          } else {
            this.suggestedNextVersion.set('1.0');
            this.isAmendmentMode.set(false);
            this.sendAgreementForm.patchValue({ version: '1.0' });
          }
        },
        error: () => {
          this.hasPendingAgreement.set(false);
          this.hasSignedAgreement.set(false);
        },
      });
  }

  public resendPendingFromModal(): void {
    const pending = this.pendingAgreementForSelectedVendor();
    if (!pending) return;

    this.isSending.set(true);
    this.agreementService
      .resendAgreement(pending.id)
      .pipe(finalize(() => this.isSending.set(false)))
      .subscribe({
        next: () => {
          this.successMessage.set(`Pending agreement invitation (v${pending.version || '1.0'}) successfully resent to host.`);
          this.closeSendModal();
          this.loadAgreements();
        },
        error: (err) => {
          const msg = this.agreementService.extractApiErrorMessage(err) || 'Failed to resend agreement.';
          this.sendError.set(msg);
        },
      });
  }

  public cancelPendingFromModal(): void {
    const pending = this.pendingAgreementForSelectedVendor();
    if (!pending) return;

    if (!confirm(`Are you sure you want to cancel pending agreement v${pending.version || '1.0'}? This will invalidate the existing signing token.`)) {
      return;
    }

    this.isSending.set(true);
    this.agreementService
      .cancelAgreement(pending.id)
      .pipe(finalize(() => this.isSending.set(false)))
      .subscribe({
        next: () => {
          this.successMessage.set(`Pending agreement v${pending.version || '1.0'} was cancelled.`);
          this.loadAgreements();
          const vendorId = this.sendAgreementForm.get('vendor_id')?.value;
          if (vendorId) {
            this.checkVendorAgreements(vendorId);
          }
        },
        error: (err) => {
          const msg = this.agreementService.extractApiErrorMessage(err) || 'Failed to cancel agreement.';
          this.sendError.set(msg);
        },
      });
  }

  public closeSendModal(): void {
    this.isSendModalOpen.set(false);
    this.isDuplicateBlocked.set(false);
    this.hasPendingAgreement.set(false);
    this.hasSignedAgreement.set(false);
    this.pendingAgreementForSelectedVendor.set(null);
    this.signedAgreementForSelectedVendor.set(null);
    this.isAmendmentMode.set(false);
    this.sendError.set(null);
  }


  private loadVendors(preselectedId?: string): void {
    this.loadingVendors.set(true);
    this.userService
      .getVendors({ page: 1, size: 100 })
      .pipe(finalize(() => this.loadingVendors.set(false)))
      .subscribe({
        next: (res) => {
          const fetched = res.data || [];
          const targetId = preselectedId || this.sendAgreementForm.get('vendor_id')?.value;
          const currentSelectedVendor = this.vendorsList().find(
            (v) => String(v.id) === String(targetId)
          );
          if (
            currentSelectedVendor &&
            !fetched.some((v) => String(v.id) === String(currentSelectedVendor.id))
          ) {
            this.vendorsList.set([currentSelectedVendor, ...fetched]);
          } else {
            this.vendorsList.set(fetched);
          }

          if (targetId) {
            this.sendAgreementForm.patchValue({ vendor_id: String(targetId) });
          }
        },
        error: () => {
          // Fallback or leave empty
        },
      });
  }

  private loadTemplatesForModal(): void {
    this.loadingTemplates.set(true);
    this.agreementService
      .getAgreementTemplates({ status: 'active', size: 100 })
      .pipe(finalize(() => this.loadingTemplates.set(false)))
      .subscribe({
        next: (res) => {
          const list = res?.data || [];
          this.availableTemplates.set(list);
          const def = list.find((t) => t.is_default);
          if (def && !this.sendAgreementForm.get('template_id')?.value) {
            this.sendAgreementForm.patchValue({ template_id: def.id });
          }
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

    const { vendor_id, template_id, commission_percentage, valid_days, version, custom_notes } =
      this.sendAgreementForm.getRawValue();

    if (!vendor_id) return;

    const hadPending = this.hasPendingAgreement();

    this.isSending.set(true);
    this.sendError.set(null);

    const fullNotes = version && !custom_notes?.includes(`v${version}`)
      ? `[Agreement Version: v${version}] ${custom_notes || ''}`.trim()
      : custom_notes || undefined;

    this.agreementService
      .sendAgreementToVendor(vendor_id, {
        commission_percentage: Number(commission_percentage) || this.settingsService.commissionPercentage(),
        valid_days: Number(valid_days) || 7,
        version: version || '1.0',
        custom_notes: fullNotes,
        template_id: template_id || undefined,
      })
      .pipe(finalize(() => this.isSending.set(false)))
      .subscribe({
        next: (res) => {
          this.successMessage.set(
            hadPending
              ? `New agreement (v${version || '1.0'}) dispatched successfully! Previous pending invitation was superseded.`
              : (res?.message || `Host Partnership Agreement (v${version || '1.0'}) sent successfully to host!`)
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

  public getPdfUrl(item: VendorAgreementItem): string {
    return item.pdf_file_url || this.agreementService.getSignedPdfUrl(item.id);
  }

  public previewPdf(item: VendorAgreementItem): void {
    this.selectedAgreement.set(item);
    this.previewAgreementTitle.set(item.title || `Agreement #${item.id.slice(0, 8)}`);
    this.previewError.set(null);
    this.cleanupPreviewBlob();
    this.isPreviewModalOpen.set(true);
    this.isPreviewLoading.set(true);

    const url = this.getPdfUrl(item);
    this.agreementService.fetchPdfBlob(url, item.id).subscribe({
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

  public closePreviewModal(): void {
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

  public downloadCurrentPreview(): void {
    const item = this.selectedAgreement();
    if (this.currentPreviewBlob && item) {
      const filename = `TashiHome-Agreement-${item.id.slice(0, 8)}.pdf`;
      this.agreementService.downloadBlob(this.currentPreviewBlob, filename);
    } else if (item) {
      this.downloadPdf(item);
    }
  }

  public downloadPdf(item: VendorAgreementItem): void {
    const url = this.getPdfUrl(item);
    this.downloadingId.set(item.id);
    const filename = `TashiHome-Agreement-${item.id.slice(0, 8)}.pdf`;

    this.agreementService
      .fetchPdfBlob(url, item.id)
      .pipe(finalize(() => this.downloadingId.set(null)))
      .subscribe({
        next: (blob) => {
          this.agreementService.downloadBlob(blob, filename);
        },
        error: (err) => {
          const msg =
            this.agreementService.extractApiErrorMessage(err) ||
            'Unable to download agreement PDF. Please try again.';
          this.errorMessage.set(msg);
        },
      });
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

