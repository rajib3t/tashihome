import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';
import { PaginationMeta } from '../../../../services/api/api-response.model';
import { HostService } from '../../../../services/host/host-service';
import {
  ConvertHostRequestPayload,
  HostRequest,
  HostRequestMessage,
  HostRequestQuery,
  HostRequestStatus,
  UpdateHostRequestStatusPayload,
} from '../../../../services/host/host.model';
import { PageBreadcrumb } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb';
import { Card } from '../../../../shared/components/ui/card/card';
import { Modal } from '../../../../shared/components/ui/modal/modal';
import { Pagination } from '../../../../shared/components/ui/pagination/pagination';
import { PROPERTY_TYPES_LABELS } from '../../../../services/property/property.model';

import { TableLoaderComponent } from '../../../../shared/components/ui/table-loader/table-loader.component';

@Component({
  selector: 'app-host-management',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    PageBreadcrumb,
    Card,
    Modal,
    Pagination,
    TableLoaderComponent,
  ],
  templateUrl: './host-management.html',
  styleUrl: './host-management.css',
})
export class HostManagement implements OnInit, OnDestroy {
  private readonly hostService = inject(HostService);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  public readonly propertyTypeLabels = PROPERTY_TYPES_LABELS;

  // List State
  readonly requests = signal<HostRequest[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string>('');
  readonly successMessage = signal<string>('');
  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(10);
  readonly sortOrder = signal<'desc' | 'asc'>('desc');
  meta: PaginationMeta = { total: 0, page: 1, size: 10 };
  readonly pageSizeOptions = [10, 20, 30, 50];

  // Active status filter tab
  readonly activeStatusTab = signal<string>('');

  // Search & Filter Form
  readonly searchForm = this.fb.group({
    query: [''],
    city: [''],
    property_type: [''],
    status: [''],
  });

  // Detail & Conversation Modal State
  readonly isDetailModalOpen = signal<boolean>(false);
  readonly selectedRequest = signal<HostRequest | null>(null);
  readonly isLoadingDetail = signal<boolean>(false);
  readonly detailError = signal<string>('');

  // Conversation Note Form
  readonly messageForm = this.fb.group({
    message: ['', [Validators.required, Validators.minLength(2)]],
    is_internal: [false],
  });
  readonly isSendingMessage = signal<boolean>(false);
  readonly messageError = signal<string>('');

  // Status Change Modal State
  readonly isStatusModalOpen = signal<boolean>(false);
  readonly requestToUpdateStatus = signal<HostRequest | null>(null);
  readonly targetStatus = signal<HostRequestStatus>('under_review');
  readonly statusNotes = signal<string>('');
  readonly isUpdatingStatus = signal<boolean>(false);
  readonly statusError = signal<string>('');

  // Convert to Vendor Modal State
  readonly isConvertModalOpen = signal<boolean>(false);
  readonly requestToConvert = signal<HostRequest | null>(null);
  readonly isConverting = signal<boolean>(false);
  readonly convertError = signal<string>('');
  readonly convertSuccess = signal<string>('');

  readonly convertForm = this.fb.group({
    company_name: ['', [Validators.required, Validators.minLength(2)]],
    company_email: ['', [Validators.required, Validators.email]],
    company_phone: ['', [Validators.required]],
    address_line1: ['', [Validators.required]],
    address_line2: [''],
    postal_code: ['', [Validators.required]],
    country: ['India', [Validators.required]],
    temporary_password: ['', [Validators.required, Validators.minLength(8)]],
  });

  private messageTimeout: any = null;

  // KPI Metrics computed from current items
  readonly metrics = computed(() => {
    const list = this.requests();
    const total = this.meta.total || list.length;
    const pending = list.filter((r) => r.status === 'pending').length;
    const underReview = list.filter((r) => r.status === 'under_review').length;
    const approved = list.filter((r) => r.status === 'approved').length;
    const rejected = list.filter((r) => r.status === 'rejected').length;
    const converted = list.filter((r) => r.status === 'converted' || !!r.converted_user_id).length;

    return { total, pending, underReview, approved, rejected, converted };
  });

  ngOnInit(): void {
    this.loadHostRequests();

    this.route.queryParams.subscribe((params) => {
      const requestId = params['id']?.trim() || params['request_id']?.trim() || params['public_id']?.trim();
      if (requestId) {
        this.openRequestById(requestId);
      }
    });
  }

  public openRequestById(id: string): void {
    const list = this.requests();
    const found = list.find((r) => String(r.id) === String(id) || r.public_id === id);
    if (found) {
      this.openDetailModal(found);
    } else {
      // Direct fetch by ID/public_id and open detail modal
      this.isLoadingDetail.set(true);
      this.detailError.set('');
      this.messageError.set('');
      this.messageForm.reset({ message: '', is_internal: false });
      this.isDetailModalOpen.set(true);

      this.hostService.admin
        .getHostRequestById(id)
        .pipe(
          finalize(() => {
            this.isLoadingDetail.set(false);
            this.cdr.markForCheck();
          }),
          catchError((err) => {
            const msg = this.hostService.extractApiErrorMessage(err) || 'Failed to fetch latest application details.';
            this.detailError.set(msg);
            return of(null);
          })
        )
        .subscribe((res: any) => {
          if (res?.data) {
            this.selectedRequest.set(res.data);
            this.updateRequestInList(res.data);
          }
        });
    }
  }

  ngOnDestroy(): void {
    if (this.messageTimeout) clearTimeout(this.messageTimeout);
  }

  // ── Load Data ─────────────────────────────────────────────────────────────
  public loadHostRequests(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    const formVal = this.searchForm.value;
    const queryParams: HostRequestQuery = {
      page: this.currentPage(),
      size: this.pageSize(),
      sortBy: 'created_at',
      sortOrder: this.sortOrder(),
      search: {
        query: formVal.query || '',
        city: formVal.city || '',
        property_type: formVal.property_type || '',
        status: this.activeStatusTab() || formVal.status || '',
      },
    };

    this.hostService.admin
      .getHostRequests(queryParams)
      .pipe(
        finalize(() => {
          this.isLoading.set(false);
          this.cdr.markForCheck();
        }),
        catchError((err) => {
          const msg = this.hostService.extractApiErrorMessage(err) || 'Failed to load host applications.';
          this.errorMessage.set(msg);
          return of({ data: [], total: 0, page: 1, size: this.pageSize() });
        })
      )
      .subscribe((res: any) => {
        const data = res?.data || [];
        this.requests.set(data);
        this.meta = {
          total: res?.total ?? (res?.meta?.total || data.length),
          page: res?.page ?? this.currentPage(),
          size: res?.size ?? this.pageSize(),
        };
      });
  }

  // ── Filters & Search ───────────────────────────────────────────────────────
  public onSearch(): void {
    const formStatus = this.searchForm.get('status')?.value || '';
    if (formStatus) {
      this.activeStatusTab.set(formStatus);
    }
    this.currentPage.set(1);
    this.loadHostRequests();
  }

  public onReset(): void {
    this.searchForm.reset({ query: '', city: '', property_type: '', status: '' });
    this.activeStatusTab.set('');
    this.currentPage.set(1);
    this.loadHostRequests();
  }

  public onStatusTabChange(status: string): void {
    this.activeStatusTab.set(status);
    this.searchForm.patchValue({ status });
    this.currentPage.set(1);
    this.loadHostRequests();
  }

  public onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadHostRequests();
  }

  public onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
    this.loadHostRequests();
  }

  public toggleSort(): void {
    this.sortOrder.update((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    this.loadHostRequests();
  }

  // ── View Application Details & Conversation Trail ─────────────────────────
  public openDetailModal(req: HostRequest): void {
    this.selectedRequest.set(req);
    this.detailError.set('');
    this.messageError.set('');
    this.messageForm.reset({ message: '', is_internal: false });
    this.isDetailModalOpen.set(true);

    // Fetch fresh full request with messages
    this.fetchRequestDetails(req.id);
  }

  public closeDetailModal(): void {
    this.isDetailModalOpen.set(false);
    this.selectedRequest.set(null);
    this.clearQueryParams();
  }

  private clearQueryParams(): void {
    if (this.route.snapshot.queryParamMap.keys.length > 0) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {},
        replaceUrl: true,
      });
    }
  }

  private fetchRequestDetails(id: string): void {
    this.isLoadingDetail.set(true);
    this.hostService.admin
      .getHostRequestById(id)
      .pipe(
        finalize(() => {
          this.isLoadingDetail.set(false);
          this.cdr.markForCheck();
        }),
        catchError((err) => {
          const msg = this.hostService.extractApiErrorMessage(err) || 'Failed to fetch latest application details.';
          this.detailError.set(msg);
          return of(null);
        })
      )
      .subscribe((res: any) => {
        if (res?.data) {
          this.selectedRequest.set(res.data);
          // Update in main list as well
          this.updateRequestInList(res.data);
        }
      });
  }

  // ── Add Conversation Note / Message ────────────────────────────────────────
  public onSendMessage(): void {
    const current = this.selectedRequest();
    if (!current || this.messageForm.invalid) {
      this.messageForm.markAllAsTouched();
      return;
    }

    this.isSendingMessage.set(true);
    this.messageError.set('');

    const payload = {
      message: (this.messageForm.get('message')?.value || '').trim(),
      is_internal: !!this.messageForm.get('is_internal')?.value,
    };

    this.hostService.admin
      .addMessage(current.id, payload)
      .pipe(
        finalize(() => {
          this.isSendingMessage.set(false);
          this.cdr.markForCheck();
        }),
        catchError((err) => {
          const msg = this.hostService.extractApiErrorMessage(err) || 'Failed to add conversation note.';
          this.messageError.set(msg);
          return of(null);
        })
      )
      .subscribe((res: any) => {
        if (res) {
          this.messageForm.reset({ message: '', is_internal: false });
          // Re-fetch conversation trail
          this.fetchRequestDetails(current.id);
        }
      });
  }

  // ── Status Update Modal & Actions ──────────────────────────────────────────
  public openStatusModal(req: HostRequest, defaultStatus: HostRequestStatus = 'under_review'): void {
    this.requestToUpdateStatus.set(req);
    this.targetStatus.set(defaultStatus);
    this.statusNotes.set('');
    this.statusError.set('');
    this.isStatusModalOpen.set(true);
  }

  public closeStatusModal(): void {
    this.isStatusModalOpen.set(false);
    this.requestToUpdateStatus.set(null);
  }

  public onConfirmStatusUpdate(): void {
    const req = this.requestToUpdateStatus();
    if (!req) return;

    this.isUpdatingStatus.set(true);
    this.statusError.set('');

    const payload: UpdateHostRequestStatusPayload = {
      status: this.targetStatus(),
      notes: this.statusNotes().trim() || undefined,
    };

    this.hostService.admin
      .updateStatus(req.id, payload)
      .pipe(
        finalize(() => {
          this.isUpdatingStatus.set(false);
          this.cdr.markForCheck();
        }),
        catchError((err) => {
          const msg = this.hostService.extractApiErrorMessage(err) || 'Failed to update application status.';
          this.statusError.set(msg);
          return of(null);
        })
      )
      .subscribe((res: any) => {
        if (res) {
          const updated = res?.data || { ...req, status: this.targetStatus() };
          this.updateRequestInList(updated);
          if (this.selectedRequest()?.id === req.id) {
            this.selectedRequest.set(updated);
          }
          this.closeStatusModal();
          this.closeDetailModal();
          this.showFlashMessage(`Application status updated to ${this.formatStatus(this.targetStatus())}.`);
        }
      });
  }

  // ── Convert to Vendor Modal & Flow ─────────────────────────────────────────
  public openConvertModal(req: HostRequest): void {
    this.requestToConvert.set(req);
    this.convertError.set('');
    this.convertSuccess.set('');

    // Prepopulate vendor conversion form
    const generatedPass = this.generateSecurePassword();
    this.convertForm.reset({
      company_name: req.company_name || req.property_name || req.full_name,
      company_email: req.email || '',
      company_phone: req.phone || '',
      address_line1: req.address || '',
      address_line2: req.city || '',
      postal_code: '734101',
      country: 'India',
      temporary_password: generatedPass,
    });

    this.isConvertModalOpen.set(true);
  }

  public closeConvertModal(): void {
    this.isConvertModalOpen.set(false);
    this.requestToConvert.set(null);
  }

  public generateRandomPassword(): void {
    const pass = this.generateSecurePassword();
    this.convertForm.patchValue({ temporary_password: pass });
  }

  public onConfirmConvert(): void {
    const req = this.requestToConvert();
    if (!req || this.convertForm.invalid) {
      this.convertForm.markAllAsTouched();
      return;
    }

    this.isConverting.set(true);
    this.convertError.set('');
    this.convertSuccess.set('');

    const formVal = this.convertForm.value;
    const payload: ConvertHostRequestPayload = {
      company_name: (formVal.company_name || '').trim(),
      company_email: (formVal.company_email || '').trim().toLowerCase(),
      company_phone: (formVal.company_phone || '').trim(),
      address_line1: (formVal.address_line1 || '').trim(),
      address_line2: (formVal.address_line2 || '').trim(),
      postal_code: (formVal.postal_code || '').trim(),
      country: (formVal.country || 'India').trim(),
      temporary_password: (formVal.temporary_password || '').trim(),
    };

    this.hostService.admin
      .convertToVendor(req.id, payload)
      .pipe(
        finalize(() => {
          this.isConverting.set(false);
          this.cdr.markForCheck();
        }),
        catchError((err) => {
          const msg = this.hostService.extractApiErrorMessage(err) || 'Failed to convert application to Host Vendor.';
          this.convertError.set(msg);
          return of(null);
        })
      )
      .subscribe((res: any) => {
        if (res) {
          const updated = {
            ...req,
            status: 'converted',
            converted_user_id: res?.data?.vendor_id || res?.data?.id || 'converted',
          };
          this.updateRequestInList(updated);
          if (this.selectedRequest()?.id === req.id) {
            this.selectedRequest.set(updated);
          }
          this.convertSuccess.set('Application successfully converted to Host (Vendor) account!');
          setTimeout(() => {
            this.closeConvertModal();
            this.showFlashMessage('Host successfully converted to Vendor account.');
          }, 1400);
          this.closeConvertModal();
          this.closeDetailModal();
          this.showFlashMessage('Host successfully converted to Vendor account.');
        }
      });
  }

  // ── Helper Utilities ───────────────────────────────────────────────────────
  private updateRequestInList(updated: HostRequest): void {
    this.requests.update((list) =>
      list.map((item) => (item.id === updated.id ? { ...item, ...updated } : item))
    );
  }

  private showFlashMessage(msg: string): void {
    this.successMessage.set(msg);
    if (this.messageTimeout) clearTimeout(this.messageTimeout);
    this.messageTimeout = setTimeout(() => {
      this.successMessage.set('');
    }, 4000);
  }

  private generateSecurePassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
    let pass = 'Tashi#';
    for (let i = 0; i < 6; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  }

  public formatStatus(status?: string): string {
    if (!status) return 'Pending';
    switch (status.toLowerCase()) {
      case 'under_review':
        return 'Under Review';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      case 'converted':
        return 'Converted to Vendor';
      case 'pending':
      default:
        return 'Pending';
    }
  }

  public getStatusBadgeClass(status?: string): string {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20';
      case 'under_review':
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20';
      case 'rejected':
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/20';
      case 'converted':
        return 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-500/10 dark:text-teal-300 dark:border-teal-500/20';
      case 'pending':
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20';
    }
  }

  public getPropertyTypeLabel(type?: string): string {
    if (!type) return 'Home Stay';
    return this.propertyTypeLabels[type] || type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  }
}
