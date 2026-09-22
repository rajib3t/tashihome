import { CommonModule } from '@angular/common';
import { Component, inject, signal, DestroyRef} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, finalize, of, take } from 'rxjs';
import { RoomType, RoomTypeQuery, RoomTypeSearch } from '../../../../services/room-type/room-type-model';
import { RoomTypeService } from '../../../../services/room-type/room-type-service';
import { UserService } from '../../../../services/user/user-service';
import { User } from '../../../../services/user/user.model';
import { PageBreadcrumb } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb';
import { Card } from '../../../../shared/components/ui/card/card';
import { Modal } from '../../../../shared/components/ui/modal/modal';
import { Pagination, PaginationMeta } from '../../../../shared/components/ui/pagination/pagination';

import { TableLoaderComponent } from '../../../../shared/components/ui/table-loader/table-loader.component';

@Component({
  selector: 'app-room-type-management',
  imports: [CommonModule, PageBreadcrumb, Card, ReactiveFormsModule, Modal, Pagination, TableLoaderComponent],
  templateUrl: './room-type-management.html',
  styleUrl: './room-type-management.css',
})
export class RoomTypeManagement {
  private readonly formBuilder = inject(FormBuilder);
  private readonly roomTypeService = inject(RoomTypeService);
  private readonly userService = inject(UserService);
  private readonly destroyRef = inject(DestroyRef);

  meta!: PaginationMeta;
  readonly roomTypes = signal<RoomType[]>([]);
  readonly vendors = signal<User[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly currentPage = signal(1);
  readonly pageSize = signal(10);
  readonly totalItems = signal(0);
  readonly pageSizeOptions = [10, 20, 30];

  isEditModalOpen = signal(false);
  isEditing = signal(false);
  editErrorMessage = signal<string | null>(null);
  selectedRoomType = signal<RoomType | null>(null);

  isStatusModalOpen = signal(false);
  isUpdatingStatus = signal(false);
  statusErrorMessage = signal<string | null>(null);
  roomTypeToToggleStatus = signal<RoomType | null>(null);

  isCreateModalOpen = signal(false);
  isCreating = signal(false);
  createErrorMessage = signal<string | null>(null);

  readonly createForm = this.formBuilder.group({
    name: ['', [Validators.required]],
    capacity: [0, [Validators.required, Validators.min(1)]],
    vendor_id: [''],
  });

  readonly editForm = this.formBuilder.group({
    name: ['', [Validators.required]],
    capacity: [0, [Validators.required, Validators.min(1)]],
    vendor_id: [''],
  });

  readonly searchForm = this.formBuilder.group({
    name: [''],
    status: [''],
  });

  ngOnInit(): void {
    this.loadVendors();
    this.loadRoomTypes();
  }

  loadVendors(): void {
    this.userService.getVendors({ page: 1, size: 100 }).pipe(take(1)).subscribe({
      next: (response) => this.vendors.set(response.data || []),
      error: () => this.vendors.set([]),
    });
  }

  getVendorName(vendorId?: string | null): string {
    if (!vendorId) return '';
    const vendor = this.vendors().find((v) => v.id === vendorId);
    return vendor ? (vendor.full_name || vendor.email) : 'Vendor';
  }

  onSearch(): void {
    this.currentPage.set(1);
    this.loadRoomTypes();
  }

  onReset(): void {
    this.searchForm.reset({ name: '', status: '' });
    this.currentPage.set(1);
    this.loadRoomTypes();
  }

  onPageSizeChange(pageSize: number): void {
    this.pageSize.set(pageSize);
    this.currentPage.set(1);
    this.loadRoomTypes();
  }

  loadRoomTypes(): void {
    const filters = this.searchForm.getRawValue();
    const search: RoomTypeSearch = {
      name: filters.name?.trim() || undefined,
      status: filters.status?.trim() || undefined,
    };

    const query: RoomTypeQuery = {
      page: this.currentPage(),
      size: this.pageSize(),
      search,
    };

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.roomTypeService.admin.getRoomTypes(query)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        catchError((error) => {
          this.errorMessage.set(error?.error?.message || error?.message || 'Unable to load room types.');
          this.roomTypes.set([]);
          this.totalItems.set(0);
          return of(null);
        })
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        if (!response) {
          return;
        }
        this.roomTypes.set(response.data || []);
        this.totalItems.set(response.meta?.total || 0);
        this.meta = { ...response.meta };
      });
  }

  openCreateModal(): void {
    this.createForm.reset({ name: '', capacity: 0, vendor_id: '' });
    this.createErrorMessage.set(null);
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
  }

  openEditModal(roomType: RoomType): void {
    this.selectedRoomType.set(roomType);
    this.editForm.reset({
      name: roomType.name,
      capacity: roomType.capacity,
      vendor_id: roomType.vendor_id || '',
    });
    this.editErrorMessage.set(null);
    this.isEditModalOpen.set(true);
  }

  closeEditModal(): void {
    this.isEditModalOpen.set(false);
    this.selectedRoomType.set(null);
  }

  openStatusModal(roomType: RoomType): void {
    this.roomTypeToToggleStatus.set(roomType);
    this.statusErrorMessage.set(null);
    this.isStatusModalOpen.set(true);
  }

  closeStatusModal(): void {
    this.isStatusModalOpen.set(false);
    this.roomTypeToToggleStatus.set(null);
  }

  onSubmitCreate(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    this.isCreating.set(true);
    this.createErrorMessage.set(null);

    const payload = this.createForm.getRawValue();

    this.roomTypeService.admin.create({
      name: payload.name || '',
      capacity: Number(payload.capacity) || 0,
      vendor_id: payload.vendor_id || null,
    }).subscribe({
      next: () => {
        this.isCreating.set(false);
        this.closeCreateModal();
        this.loadRoomTypes();
      },
      error: (err) => {
        this.isCreating.set(false);
        const error = this.roomTypeService.extractApiErrorMessage(err);
        this.createErrorMessage.set(error || 'Failed to create room type');
      },
    });
  }

  submitEditForm(): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const roomType = this.selectedRoomType();
    if (!roomType) {
      return;
    }

    this.isEditing.set(true);
    this.editErrorMessage.set(null);

    const payload = this.editForm.getRawValue();
    this.roomTypeService.admin.update(roomType.id, {
      name: payload.name || '',
      capacity: Number(payload.capacity) || 0,
      vendor_id: payload.vendor_id || null,
    })
      .pipe(
        finalize(() => this.isEditing.set(false)),
        catchError((error) => {
          this.editErrorMessage.set(error?.error?.message || error?.message || 'Unable to update room type.');
          return of(null);
        })
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        if (!response) {
          return;
        }
        this.closeEditModal();
        this.loadRoomTypes();
      });
  }

  confirmStatusToggle(): void {
    const roomType = this.roomTypeToToggleStatus();
    if (!roomType) {
      return;
    }

    const nextStatus = this.getStatusAction(roomType);

    this.isUpdatingStatus.set(true);
    this.statusErrorMessage.set(null);

    this.roomTypeService.admin.statusUpdate(roomType.id, nextStatus)
      .pipe(
        finalize(() => this.isUpdatingStatus.set(false)),
        catchError((error) => {
          this.statusErrorMessage.set(
            error?.error?.message || error?.message || `Unable to ${nextStatus === 'active' ? 'enable' : 'disable'} room type.`
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
        this.loadRoomTypes();
      });
  }

  get createNameControl() {
    return this.createForm.get('name')!;
  }

  get createCapacityControl() {
    return this.createForm.get('capacity')!;
  }

  get editNameControl() {
    return this.editForm.get('name')!;
  }

  get editCapacityControl() {
    return this.editForm.get('capacity')!;
  }

  getStatusLabel(status: string): string {
    return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown';
  }

  isInactive(roomType: RoomType | null): boolean {
    return roomType?.status === 'inactive';
  }

  getDisableActionLabel(roomType: RoomType | null): string {
    return this.isInactive(roomType) ? 'Enable' : 'Disable';
  }

  getStatusAction(roomType: RoomType | null): 'active' | 'inactive' {
    return this.isInactive(roomType) ? 'active' : 'inactive';
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadRoomTypes();
  }

  getSerialNumber(index: number): number {
    const currentPage = this.currentPage() || 1;
    const itemsPerPage = this.meta?.size || 2;
    return (currentPage - 1) * itemsPerPage + index + 1;
  }
}
