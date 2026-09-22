import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, computed, DestroyRef} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, catchError, of } from 'rxjs';
import { PageBreadcrumb } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb';
import { Card } from '../../../../shared/components/ui/card/card';
import { Modal } from '../../../../shared/components/ui/modal/modal';
import { Pagination, PaginationMeta } from '../../../../shared/components/ui/pagination/pagination';
import { TaxService } from '../../../../services/tax/tax-service';
import { TaxItem, TaxCreatePayload, TaxUpdatePayload, TaxQueryFilters, TaxStatus, TaxType } from '../../../../services/tax/tax.model';

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

import { TableLoaderComponent } from '../../../../shared/components/ui/table-loader/table-loader.component';

@Component({
  selector: 'app-tax-management',
  imports: [CommonModule, PageBreadcrumb, Card, ReactiveFormsModule, Modal, Pagination, TableLoaderComponent],
  templateUrl: './tax-management.html',
  styleUrl: './tax-management.css',
})
export class TaxManagement implements OnInit {
  private readonly fb = inject(FormBuilder);
  public readonly taxService = inject(TaxService);
  private readonly destroyRef = inject(DestroyRef);

  // Table Data & State
  public readonly taxes = signal<TaxItem[]>([]);
  public readonly isLoading = signal<boolean>(false);
  public readonly errorMessage = signal<string>('');
  public readonly currentPage = signal<number>(1);
  public readonly pageSize = signal<number>(10);
  public readonly totalItems = signal<number>(0);
  public readonly pageSizeOptions = [10, 20, 50];
  public meta: PaginationMeta = {
    total: 0,
    page: 1,
    size: 10,
  };

  // Search & Filter Form
  public readonly filterForm: FormGroup = this.fb.group({
    search: [''],
    status: [''],
  });

  // Modal States
  public isCreateModalOpen = signal<boolean>(false);
  public isEditModalOpen = signal<boolean>(false);
  public isDeleteModalOpen = signal<boolean>(false);
  public isStatusModalOpen = signal<boolean>(false);

  // Processing States
  public isSubmitting = signal<boolean>(false);
  public modalErrorMessage = signal<string | null>(null);

  // Selected Records
  public selectedTax = signal<TaxItem | null>(null);
  public taxToDelete = signal<TaxItem | null>(null);
  public taxToToggleStatus = signal<TaxItem | null>(null);

  // Stats computed from loaded taxes
  public readonly defaultTaxItem = computed(() => {
    return this.taxes().find((t) => t.is_default) || this.taxService.defaultTax();
  });

  public readonly activeTaxesCount = computed(() => {
    return this.taxes().filter((t) => t.status === 'active').length;
  });

  public readonly primaryGSTIN = computed(() => {
    const def = this.defaultTaxItem();
    if (def?.gst_number) return def.gst_number;
    const withGst = this.taxes().find((t) => t.gst_number);
    return withGst?.gst_number || '27ABCDE1234F1Z5';
  });

  public readonly primarySAC = computed(() => {
    const def = this.defaultTaxItem();
    return def?.hsn_sac_code || '996311';
  });

  // Tax Form for Create / Edit
  public readonly taxForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    code: ['', [Validators.required, Validators.pattern(/^[A-Z0-9_-]+$/)]],
    rate: [12.0, [Validators.required, Validators.min(0), Validators.max(100)]],
    tax_type: ['percentage' as TaxType, [Validators.required]],
    is_inclusive: [false],
    is_default: [false],
    gst_number: ['', [Validators.pattern(GSTIN_REGEX)]],
    legal_name: [''],
    address: [''],
    hsn_sac_code: ['996311'],
    cgst_rate: [6.0, [Validators.min(0), Validators.max(100)]],
    sgst_rate: [6.0, [Validators.min(0), Validators.max(100)]],
    igst_rate: [12.0, [Validators.min(0), Validators.max(100)]],
    description: [''],
    status: ['active' as TaxStatus, [Validators.required]],
  });

  ngOnInit(): void {
    this.loadTaxes();
  }

  public loadTaxes(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    const filterVal = this.filterForm.getRawValue();
    const query: TaxQueryFilters = {
      page: this.currentPage(),
      size: this.pageSize(),
      search: filterVal.search?.trim() || undefined,
      status: filterVal.status?.trim() || undefined,
    };

    this.taxService.admin
      .getTaxes(query)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        catchError((err) => {
          const msg = this.taxService.extractApiErrorMessage(err);
          this.errorMessage.set(msg || 'Unable to load tax configurations from server.');
          this.taxes.set([]);
          this.totalItems.set(0);
          this.meta = {
            total: 0,
            page: this.currentPage(),
            size: this.pageSize(),
          };
          return of(null);
        })
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        if (!res) return;
        const list = Array.isArray(res.data)
          ? res.data
          : (res as any)?.data?.data && Array.isArray((res as any).data.data)
          ? (res as any).data.data
          : Array.isArray((res as any)?.data)
          ? (res as any).data
          : [];

        this.taxes.set(list);
        const total = res.meta?.total ?? (res as any)?.data?.meta?.total ?? list.length;
        this.totalItems.set(total);
        if (res.meta) {
          this.meta = {
            total: res.meta.total,
            page: res.meta.page,
            size: res.meta.size,
          };
        } else {
          this.meta = {
            total,
            page: this.currentPage(),
            size: this.pageSize(),
          };
        }
      });
  }

  public onSearch(): void {
    this.currentPage.set(1);
    this.loadTaxes();
  }

  public onReset(): void {
    this.filterForm.reset({ search: '', status: '' });
    this.currentPage.set(1);
    this.loadTaxes();
  }

  public onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadTaxes();
  }

  public onPageSizeChange(pageSize: number): void {
    this.pageSize.set(pageSize);
    this.currentPage.set(1);
    this.loadTaxes();
  }

  // Auto split CGST and SGST when Total Rate changes
  public onRateChange(rateVal: string | number): void {
    const rate = Number(rateVal) || 0;
    const half = Math.round((rate / 2) * 100) / 100;
    this.taxForm.patchValue({
      cgst_rate: half,
      sgst_rate: half,
      igst_rate: rate,
    });
  }

  public onCodeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const formatted = input.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    this.taxForm.patchValue({ code: formatted }, { emitEvent: false });
  }

  // Create Modal Actions
  public openCreateModal(): void {
    this.selectedTax.set(null);
    this.taxForm.reset({
      name: '',
      code: '',
      rate: 12.0,
      tax_type: 'percentage',
      is_inclusive: false,
      is_default: false,
      gst_number: '',
      legal_name: 'Tashi Homes Hospitality Private Limited',
      address: '',
      hsn_sac_code: '996311',
      cgst_rate: 6.0,
      sgst_rate: 6.0,
      igst_rate: 12.0,
      description: '',
      status: 'active',
    });
    this.modalErrorMessage.set(null);
    this.isCreateModalOpen.set(true);
  }

  public closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
    this.modalErrorMessage.set(null);
  }

  public onSubmitCreate(): void {
    if (this.taxForm.invalid) {
      this.taxForm.markAllAsTouched();
      this.modalErrorMessage.set('Please check all required fields and correct format errors.');
      return;
    }

    this.isSubmitting.set(true);
    this.modalErrorMessage.set(null);

    const formVal = this.taxForm.getRawValue();
    const payload: TaxCreatePayload = {
      name: formVal.name?.trim(),
      code: formVal.code?.trim().toUpperCase(),
      rate: Number(formVal.rate),
      tax_type: formVal.tax_type,
      is_inclusive: !!formVal.is_inclusive,
      is_default: !!formVal.is_default,
      gst_number: formVal.gst_number?.trim() || undefined,
      legal_name: formVal.legal_name?.trim() || undefined,
      address: formVal.address?.trim() || undefined,
      hsn_sac_code: formVal.hsn_sac_code?.trim() || undefined,
      cgst_rate: formVal.cgst_rate != null ? Number(formVal.cgst_rate) : undefined,
      sgst_rate: formVal.sgst_rate != null ? Number(formVal.sgst_rate) : undefined,
      igst_rate: formVal.igst_rate != null ? Number(formVal.igst_rate) : undefined,
      description: formVal.description?.trim() || undefined,
      status: formVal.status,
    };

    this.taxService.admin
      .create(payload)
      .pipe(
        finalize(() => this.isSubmitting.set(false)),
        catchError((err) => {
          const msg = this.taxService.extractApiErrorMessage(err);
          this.modalErrorMessage.set(msg || 'Failed to create tax rule on server.');
          return of(null);
        })
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        if (res) {
          this.closeCreateModal();
          this.loadTaxes();
        }
      });
  }

  // Edit Modal Actions
  public openEditModal(tax: TaxItem): void {
    this.selectedTax.set(tax);
    this.taxForm.reset({
      name: tax.name,
      code: tax.code,
      rate: tax.rate,
      tax_type: tax.tax_type || 'percentage',
      is_inclusive: !!tax.is_inclusive,
      is_default: !!tax.is_default,
      gst_number: tax.gst_number || '',
      legal_name: tax.legal_name || '',
      address: tax.address || '',
      hsn_sac_code: tax.hsn_sac_code || '996311',
      cgst_rate: tax.cgst_rate ?? Math.round((tax.rate / 2) * 100) / 100,
      sgst_rate: tax.sgst_rate ?? Math.round((tax.rate / 2) * 100) / 100,
      igst_rate: tax.igst_rate ?? tax.rate,
      description: tax.description || '',
      status: tax.status || 'active',
    });
    this.modalErrorMessage.set(null);
    this.isEditModalOpen.set(true);
  }

  public closeEditModal(): void {
    this.isEditModalOpen.set(false);
    this.selectedTax.set(null);
    this.modalErrorMessage.set(null);
  }

  public onSubmitEdit(): void {
    const tax = this.selectedTax();
    if (!tax) return;

    if (this.taxForm.invalid) {
      this.taxForm.markAllAsTouched();
      this.modalErrorMessage.set('Please check all required fields and correct format errors.');
      return;
    }

    this.isSubmitting.set(true);
    this.modalErrorMessage.set(null);

    const formVal = this.taxForm.getRawValue();
    const payload: TaxUpdatePayload = {
      name: formVal.name?.trim(),
      code: formVal.code?.trim().toUpperCase(),
      rate: Number(formVal.rate),
      tax_type: formVal.tax_type,
      is_inclusive: !!formVal.is_inclusive,
      is_default: !!formVal.is_default,
      gst_number: formVal.gst_number?.trim() || undefined,
      legal_name: formVal.legal_name?.trim() || undefined,
      address: formVal.address?.trim() || undefined,
      hsn_sac_code: formVal.hsn_sac_code?.trim() || undefined,
      cgst_rate: formVal.cgst_rate != null ? Number(formVal.cgst_rate) : undefined,
      sgst_rate: formVal.sgst_rate != null ? Number(formVal.sgst_rate) : undefined,
      igst_rate: formVal.igst_rate != null ? Number(formVal.igst_rate) : undefined,
      description: formVal.description?.trim() || undefined,
      status: formVal.status,
    };

    this.taxService.admin
      .update(tax.id, payload)
      .pipe(
        finalize(() => this.isSubmitting.set(false)),
        catchError((err) => {
          const msg = this.taxService.extractApiErrorMessage(err);
          this.modalErrorMessage.set(msg || 'Failed to update tax rule on server.');
          return of(null);
        })
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        if (res) {
          this.closeEditModal();
          this.loadTaxes();
        }
      });
  }

  // Toggle Status Modal Actions
  public openStatusModal(tax: TaxItem): void {
    this.taxToToggleStatus.set(tax);
    this.modalErrorMessage.set(null);
    this.isStatusModalOpen.set(true);
  }

  public closeStatusModal(): void {
    this.isStatusModalOpen.set(false);
    this.taxToToggleStatus.set(null);
    this.modalErrorMessage.set(null);
  }

  public confirmStatusToggle(): void {
    const tax = this.taxToToggleStatus();
    if (!tax) return;

    const nextStatus: TaxStatus = tax.status === 'active' ? 'inactive' : 'active';
    this.isSubmitting.set(true);
    this.modalErrorMessage.set(null);

    this.taxService.admin
      .statusUpdate(tax.id, nextStatus)
      .pipe(
        finalize(() => this.isSubmitting.set(false)),
        catchError((err) => {
          const msg = this.taxService.extractApiErrorMessage(err);
          this.modalErrorMessage.set(msg || `Failed to update tax status on server.`);
          return of(null);
        })
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        if (res) {
          this.closeStatusModal();
          this.loadTaxes();
        }
      });
  }

  // Delete Modal Actions
  public openDeleteModal(tax: TaxItem): void {
    this.taxToDelete.set(tax);
    this.modalErrorMessage.set(null);
    this.isDeleteModalOpen.set(true);
  }

  public closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.taxToDelete.set(null);
    this.modalErrorMessage.set(null);
  }

  public confirmDelete(hard: boolean = false): void {
    const tax = this.taxToDelete();
    if (!tax) return;

    this.isSubmitting.set(true);
    this.modalErrorMessage.set(null);

    this.taxService.admin
      .delete(tax.id, hard)
      .pipe(
        finalize(() => this.isSubmitting.set(false)),
        catchError((err) => {
          const msg = this.taxService.extractApiErrorMessage(err);
          this.modalErrorMessage.set(msg || 'Failed to delete tax rule on server.');
          return of(null);
        })
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        if (res) {
          this.closeDeleteModal();
          this.loadTaxes();
        }
      });
  }

  public getSerialNumber(index: number): number {
    const page = this.currentPage() || 1;
    const size = this.pageSize() || 10;
    return (page - 1) * size + index + 1;
  }
}
