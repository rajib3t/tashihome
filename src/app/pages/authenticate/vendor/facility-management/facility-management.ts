import { CommonModule } from '@angular/common';
import { Component, inject, signal, DestroyRef} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, finalize, of } from 'rxjs';
import { Facility, FacilityQuery, FacilitySearch } from '../../../../services/facility/facility-model';
import { FacilityService } from '../../../../services/facility/facility-service';
import { PageBreadcrumb } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb';
import { UploadImage } from '../../../../shared/components/common/upload-image/upload-image';
import { Card } from '../../../../shared/components/ui/card/card';
import { Modal } from '../../../../shared/components/ui/modal/modal';
import { Pagination, PaginationMeta } from '../../../../shared/components/ui/pagination/pagination';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-vendor-facility-management',
  standalone: true,
  imports: [CommonModule, PageBreadcrumb, Card, ReactiveFormsModule, Modal, UploadImage, Pagination],
  templateUrl: './facility-management.html',
  styleUrl: './facility-management.css',
})
export class VendorFacilityManagement {
  public readonly assetUrl = environment.assetUrl;
  private readonly formBuilder = inject(FormBuilder);
  private readonly facilityService = inject(FacilityService);
  private readonly destroyRef = inject(DestroyRef);

  meta!: PaginationMeta;
  readonly facilities = signal<Facility[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly currentPage = signal(1);
  readonly pageSize = signal(10);
  readonly totalItems = signal(0);
  readonly pageSizeOptions = [10, 20, 30];

  isEditModalOpen = signal<boolean>(false);
  isEditing = signal(false);
  editErrorMessage = signal<string | null>(null);
  selectedFacility = signal<Facility | null>(null);

  isStatusModalOpen = signal<boolean>(false);
  isUpdatingStatus = signal(false);
  statusErrorMessage = signal<string | null>(null);
  facilityToToggleStatus = signal<Facility | null>(null);

  isDeleteModalOpen = signal<boolean>(false);
  isDeleting = signal(false);
  deleteErrorMessage = signal<string | null>(null);
  facilityToDelete = signal<Facility | null>(null);

  isCreateModalOpen = signal<boolean>(false);
  isCreating = signal(false);
  createErrorMessage = signal<string | null>(null);

  iconPreview = signal<string>('');

  readonly createForm = this.formBuilder.group({
    name: ['', [Validators.required]],
    icon: [null as File | string | null],
  });

  readonly editForm = this.formBuilder.group({
    name: ['', [Validators.required]],
    icon: [null as File | string | null],
  });

  readonly searchForm = this.formBuilder.group({
    name: [''],
    status: [''],
  });

  ngOnInit(): void {
    this.loadFacilities();
  }

  onSearch(): void {
    this.currentPage.set(1);
    this.loadFacilities();
  }

  onReset(): void {
    this.searchForm.reset({ name: '', status: '' });
    this.currentPage.set(1);
    this.loadFacilities();
  }

  onPageSizeChange(pageSize: number): void {
    this.pageSize.set(pageSize);
    this.currentPage.set(1);
    this.loadFacilities();
  }

  loadFacilities(): void {
    const filters = this.searchForm.getRawValue();
    const search: FacilitySearch = {
      name: filters.name?.trim() || undefined,
      status: filters.status?.trim() || undefined,
    };

    const query: FacilityQuery = {
      page: this.currentPage(),
      size: this.pageSize(),
      search,
    };

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.facilityService.vendor.getFacilities(query)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        catchError((error) => {
          this.errorMessage.set(error?.error?.message || error?.message || 'Unable to load facilities.');
          this.facilities.set([]);
          this.totalItems.set(0);
          return of(null);
        })
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        if (!response) {
          return;
        }

        this.facilities.set(response.data || []);
        this.totalItems.set(response.meta?.total || 0);
        this.meta = { ...response.meta };
      });
  }

  openCreateModal(): void {
    this.createForm.reset({ name: '', icon: null });
    this.createErrorMessage.set(null);
    this.isCreateModalOpen.set(true);
    this.iconPreview.set('');
  }

  closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
  }

  openEditModal(facility: Facility): void {
    this.selectedFacility.set(facility);
    this.editForm.reset({
      name: facility.name,
      icon: facility.icon_url || null,
    });
    this.editErrorMessage.set(null);
    this.iconPreview.set(facility.icon_url ? this.assetUrl + facility.icon_url : '');
    this.isEditModalOpen.set(true);
  }

  closeEditModal(): void {
    this.isEditModalOpen.set(false);
    this.selectedFacility.set(null);
    this.iconPreview.set('');
  }

  openStatusModal(facility: Facility): void {
    this.facilityToToggleStatus.set(facility);
    this.statusErrorMessage.set(null);
    this.isStatusModalOpen.set(true);
  }

  closeStatusModal(): void {
    this.isStatusModalOpen.set(false);
    this.facilityToToggleStatus.set(null);
  }

  openDeleteModal(facility: Facility): void {
    this.facilityToDelete.set(facility);
    this.deleteErrorMessage.set(null);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.facilityToDelete.set(null);
  }

  onSubmitCreate(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    this.isCreating.set(true);
    this.createErrorMessage.set(null);

    const formData = this.createForm.value;
    const payload = new FormData();
    payload.append('name', formData.name || '');
    if (formData.icon) {
      payload.append('icon', formData.icon as File);
    }

    this.facilityService.vendor.create(payload).subscribe({
      next: () => {
        this.isCreating.set(false);
        this.closeCreateModal();
        this.loadFacilities();
      },
      error: (err) => {
        this.isCreating.set(false);
        const error = this.facilityService.extractApiErrorMessage(err);
        this.createErrorMessage.set(error || 'Failed to create facility');
      },
    });
  }

  submitEditForm(): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const facility = this.selectedFacility();
    if (!facility) {
      return;
    }

    this.isEditing.set(true);
    this.editErrorMessage.set(null);

    const formData = this.editForm.value;
    const payload = new FormData();
    payload.append('name', formData.name || '');
    if (formData.icon instanceof File) {
      payload.append('icon', formData.icon);
    }

    this.facilityService.vendor.update(facility.id, payload)
      .pipe(
        finalize(() => this.isEditing.set(false)),
        catchError((error) => {
          this.editErrorMessage.set(this.facilityService.extractApiErrorMessage(error) || 'Unable to update facility.');
          return of(null);
        })
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        if (!response) {
          return;
        }
        this.closeEditModal();
        this.loadFacilities();
      });
  }

  confirmStatusToggle(): void {
    const facility = this.facilityToToggleStatus();
    if (!facility) {
      return;
    }

    const nextStatus = this.getStatusAction(facility);

    this.isUpdatingStatus.set(true);
    this.statusErrorMessage.set(null);

    this.facilityService.vendor.statusUpdate(facility.id, nextStatus)
      .pipe(
        finalize(() => this.isUpdatingStatus.set(false)),
        catchError((error) => {
          this.statusErrorMessage.set(
            this.facilityService.extractApiErrorMessage(error) || `Unable to ${nextStatus === 'active' ? 'enable' : 'disable'} facility.`
          );
          return of(null);
        })
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        if (!response) {
          return;
        }
        this.closeStatusModal();
        this.loadFacilities();
      });
  }

  confirmDelete(): void {
    const facility = this.facilityToDelete();
    if (!facility) {
      return;
    }

    this.isDeleting.set(true);
    this.deleteErrorMessage.set(null);

    this.facilityService.vendor.delete(facility.id)
      .pipe(
        finalize(() => this.isDeleting.set(false)),
        catchError((error) => {
          this.deleteErrorMessage.set(
            this.facilityService.extractApiErrorMessage(error) || 'Unable to delete facility.'
          );
          return of(null);
        })
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        if (!response) {
          return;
        }
        this.closeDeleteModal();
        this.loadFacilities();
      });
  }

  get createNameControl() {
    return this.createForm.get('name')!;
  }

  get editNameControl() {
    return this.editForm.get('name')!;
  }

  getStatusLabel(status: string): string {
    return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown';
  }

  isInactive(facility: Facility | null): boolean {
    return facility?.status === 'inactive';
  }

  getDisableActionLabel(facility: Facility | null): string {
    return this.isInactive(facility) ? 'Enable' : 'Disable';
  }

  getStatusAction(facility: Facility | null): 'active' | 'inactive' {
    return this.isInactive(facility) ? 'active' : 'inactive';
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadFacilities();
  }

  getSerialNumber(index: number): number {
    const currentPage = this.currentPage() || 1;
    const itemsPerPage = this.meta?.size || 10;
    return (currentPage - 1) * itemsPerPage + index + 1;
  }
}

