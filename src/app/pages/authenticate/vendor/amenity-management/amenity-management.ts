import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, finalize, of } from 'rxjs';
import { Amenity, AmenityQuery, AmenitySearch } from '../../../../services/amenity/amenity-model';
import { AmenityService } from '../../../../services/amenity/amenity-service';
import { PageBreadcrumb } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb';
import { UploadImage } from '../../../../shared/components/common/upload-image/upload-image';
import { Card } from '../../../../shared/components/ui/card/card';
import { Modal } from '../../../../shared/components/ui/modal/modal';
import { Pagination, PaginationMeta } from '../../../../shared/components/ui/pagination/pagination';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-vendor-amenity-management',
  standalone: true,
  imports: [CommonModule, PageBreadcrumb, Card, ReactiveFormsModule, Modal, UploadImage, Pagination],
  templateUrl: './amenity-management.html',
  styleUrl: './amenity-management.css',
})
export class VendorAmenityManagement {
  public readonly assetUrl = environment.assetUrl;
  private readonly formBuilder = inject(FormBuilder);
  private readonly amenityService = inject(AmenityService);

  meta!: PaginationMeta;
  readonly amenities = signal<Amenity[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly currentPage = signal(1);
  readonly pageSize = signal(10);
  readonly totalItems = signal(0);
  readonly pageSizeOptions = [10, 20, 30];

  isEditModalOpen = signal<boolean>(false);
  isEditing = signal(false);
  editErrorMessage = signal<string | null>(null);
  selectedAmenity = signal<Amenity | null>(null);

  isStatusModalOpen = signal<boolean>(false);
  isUpdatingStatus = signal(false);
  statusErrorMessage = signal<string | null>(null);
  amenityToToggleStatus = signal<Amenity | null>(null);

  isDeleteModalOpen = signal<boolean>(false);
  isDeleting = signal(false);
  deleteErrorMessage = signal<string | null>(null);
  amenityToDelete = signal<Amenity | null>(null);

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
    this.loadAmenities();
  }

  onSearch(): void {
    this.currentPage.set(1);
    this.loadAmenities();
  }

  onReset(): void {
    this.searchForm.reset({ name: '', status: '' });
    this.currentPage.set(1);
    this.loadAmenities();
  }

  onPageSizeChange(pageSize: number): void {
    this.pageSize.set(pageSize);
    this.currentPage.set(1);
    this.loadAmenities();
  }

  loadAmenities(): void {
    const filters = this.searchForm.getRawValue();
    const search: AmenitySearch = {
      name: filters.name?.trim() || undefined,
      status: filters.status?.trim() || undefined,
    };

    const query: AmenityQuery = {
      page: this.currentPage(),
      size: this.pageSize(),
      search,
    };

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.amenityService.vendor.getAmenities(query)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        catchError((error) => {
          this.errorMessage.set(error?.error?.message || error?.message || 'Unable to load amenities.');
          this.amenities.set([]);
          this.totalItems.set(0);
          return of(null);
        })
      )
      .subscribe((response) => {
        if (!response) {
          return;
        }

        this.amenities.set(response.data || []);
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

  openEditModal(amenity: Amenity): void {
    this.selectedAmenity.set(amenity);
    this.editForm.reset({
      name: amenity.name,
      icon: amenity.icon_url || null,
    });
    this.editErrorMessage.set(null);
    this.iconPreview.set(amenity.icon_url ? this.assetUrl + amenity.icon_url : '');
    this.isEditModalOpen.set(true);
  }

  closeEditModal(): void {
    this.isEditModalOpen.set(false);
    this.selectedAmenity.set(null);
    this.iconPreview.set('');
  }

  openStatusModal(amenity: Amenity): void {
    this.amenityToToggleStatus.set(amenity);
    this.statusErrorMessage.set(null);
    this.isStatusModalOpen.set(true);
  }

  closeStatusModal(): void {
    this.isStatusModalOpen.set(false);
    this.amenityToToggleStatus.set(null);
  }

  openDeleteModal(amenity: Amenity): void {
    this.amenityToDelete.set(amenity);
    this.deleteErrorMessage.set(null);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.amenityToDelete.set(null);
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

    this.amenityService.vendor.create(payload).subscribe({
      next: () => {
        this.isCreating.set(false);
        this.closeCreateModal();
        this.loadAmenities();
      },
      error: (err) => {
        this.isCreating.set(false);
        const error = this.amenityService.extractApiErrorMessage(err);
        this.createErrorMessage.set(error || 'Failed to create amenity');
      },
    });
  }

  submitEditForm(): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const amenity = this.selectedAmenity();
    if (!amenity) {
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

    this.amenityService.vendor.update(amenity.id, payload)
      .pipe(
        finalize(() => this.isEditing.set(false)),
        catchError((error) => {
          this.editErrorMessage.set(this.amenityService.extractApiErrorMessage(error) || 'Unable to update amenity.');
          return of(null);
        })
      )
      .subscribe((response) => {
        if (!response) {
          return;
        }
        this.closeEditModal();
        this.loadAmenities();
      });
  }

  confirmStatusToggle(): void {
    const amenity = this.amenityToToggleStatus();
    if (!amenity) {
      return;
    }

    const nextStatus = this.getStatusAction(amenity);

    this.isUpdatingStatus.set(true);
    this.statusErrorMessage.set(null);

    this.amenityService.vendor.statusUpdate(amenity.id, nextStatus)
      .pipe(
        finalize(() => this.isUpdatingStatus.set(false)),
        catchError((error) => {
          this.statusErrorMessage.set(
            this.amenityService.extractApiErrorMessage(error) || `Unable to ${nextStatus === 'active' ? 'enable' : 'disable'} amenity.`
          );
          return of(null);
        })
      )
      .subscribe((response) => {
        if (!response) {
          return;
        }
        this.closeStatusModal();
        this.loadAmenities();
      });
  }

  confirmDelete(): void {
    const amenity = this.amenityToDelete();
    if (!amenity) {
      return;
    }

    this.isDeleting.set(true);
    this.deleteErrorMessage.set(null);

    this.amenityService.vendor.delete(amenity.id)
      .pipe(
        finalize(() => this.isDeleting.set(false)),
        catchError((error) => {
          this.deleteErrorMessage.set(
            this.amenityService.extractApiErrorMessage(error) || 'Unable to delete amenity.'
          );
          return of(null);
        })
      )
      .subscribe((response) => {
        if (!response) {
          return;
        }
        this.closeDeleteModal();
        this.loadAmenities();
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

  isInactive(amenity: Amenity | null): boolean {
    return amenity?.status === 'inactive';
  }

  getDisableActionLabel(amenity: Amenity | null): string {
    return this.isInactive(amenity) ? 'Enable' : 'Disable';
  }

  getStatusAction(amenity: Amenity | null): 'active' | 'inactive' {
    return this.isInactive(amenity) ? 'active' : 'inactive';
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadAmenities();
  }

  getSerialNumber(index: number): number {
    const currentPage = this.currentPage() || 1;
    const itemsPerPage = this.meta?.size || 10;
    return (currentPage - 1) * itemsPerPage + index + 1;
  }
}

