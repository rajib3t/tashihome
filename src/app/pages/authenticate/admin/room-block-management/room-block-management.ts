import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal, DestroyRef} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, finalize, of } from 'rxjs';
import {
  PREDEFINED_BLOCK_REASONS,
  RoomBlock,
  RoomBlockCreatePayload,
  RoomBlockQueryParams,
  RoomBlockSummaryStats,
  RoomBlockUpdatePayload,
} from '../../../../services/room-block/room-block.model';
import { RoomBlockService } from '../../../../services/room-block/room-block-service';
import { PropertyService } from '../../../../services/property/property-service';
import { PropertyData, PropertyRoomType } from '../../../../services/property/property.model';
import { SettingsService } from '../../../../services/settings/settings-service';
import { PaginationMeta } from '../../../../services/api/api-response.model';
import { PageBreadcrumb } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb';
import { Card } from '../../../../shared/components/ui/card/card';
import { Modal } from '../../../../shared/components/ui/modal/modal';
import { Pagination } from '../../../../shared/components/ui/pagination/pagination';
import { DateInput } from '../../../../shared/components/ui/date-input/date-input';

@Component({
  selector: 'app-admin-room-block-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PageBreadcrumb,
    Card,
    Modal,
    Pagination,
    DateInput,
  ],
  templateUrl: './room-block-management.html',
  styleUrl: './room-block-management.css',
})
export class AdminRoomBlockManagement implements OnInit {
  private readonly roomBlockService = inject(RoomBlockService);
  private readonly propertyService = inject(PropertyService);
  private readonly settingsService = inject(SettingsService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private messageTimeout?: ReturnType<typeof setTimeout>;

  // ── List & Filter State ──────────────────────────────────────────────────
  readonly roomBlocks = signal<RoomBlock[]>([]);
  readonly properties = signal<PropertyData[]>([]);
  readonly isLoading = signal(false);
  readonly isLoadingProperties = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly currentPage = signal(1);
  readonly pageSize = signal(10);
  meta!: PaginationMeta;
  readonly pageSizeOptions = [10, 20, 30];

  readonly predefinedReasons = PREDEFINED_BLOCK_REASONS;

  readonly searchForm = this.fb.group({
    property_id: [''],
    room_type_id: [''],
    start_date: [''],
    end_date: [''],
    search: [''],
  });

  // ── Summary Cards Computed Stats ─────────────────────────────────────────
  readonly summaryStats = computed<RoomBlockSummaryStats>(() => {
    const blocks = this.roomBlocks();
    const today = this.getTodayString();

    let activeTodayUnits = 0;
    let upcomingCount = 0;
    let totalUnits = 0;
    const blockedPropIds = new Set<string>();

    for (const b of blocks) {
      const s = this.normalizeDateString(b.block_start_date);
      const e = this.normalizeDateString(b.block_end_date);
      const units = b.units_blocked || 0;

      totalUnits += units;

      if (s && e && s <= today && today < e) {
        activeTodayUnits += units;
        if (b.property?.id) blockedPropIds.add(b.property.id);
      } else if (s && s > today) {
        upcomingCount += 1;
        if (b.property?.id) blockedPropIds.add(b.property.id);
      }
    }

    return {
      activeBlocksToday: activeTodayUnits,
      upcomingBlocksCount: upcomingCount,
      totalUnitsBlocked: totalUnits,
      blockedPropertiesCount: blockedPropIds.size,
    };
  });

  // ── Create Modal State ───────────────────────────────────────────────────
  readonly isCreateModalOpen = signal(false);
  readonly isCreating = signal(false);
  readonly createError = signal<string | null>(null);

  readonly createForm = this.fb.group({
    property_id: ['', Validators.required],
    room_type_id: ['', Validators.required],
    block_start_date: ['', Validators.required],
    block_end_date: ['', Validators.required],
    units_blocked: [1, [Validators.required, Validators.min(1)]],
    reason_preset: ['Maintenance'],
    reason_custom: [''],
  });

  // Filtered room types for the property selected in the create form
  readonly createModalRoomTypes = signal<PropertyRoomType[]>([]);
  readonly selectedRoomTypeMaxUnits = signal<number>(10);

  // ── Edit Modal State ─────────────────────────────────────────────────────
  readonly isEditModalOpen = signal(false);
  readonly isUpdating = signal(false);
  readonly editError = signal<string | null>(null);
  readonly blockToEdit = signal<RoomBlock | null>(null);

  readonly editForm = this.fb.group({
    block_start_date: ['', Validators.required],
    block_end_date: ['', Validators.required],
    units_blocked: [1, [Validators.required, Validators.min(1)]],
    reason: [''],
  });

  // ── Delete / Release Modal State ─────────────────────────────────────────
  readonly isDeleteModalOpen = signal(false);
  readonly isDeleting = signal(false);
  readonly deleteError = signal<string | null>(null);
  readonly blockToDelete = signal<RoomBlock | null>(null);

  ngOnInit(): void {
    this.loadProperties();
    this.loadRoomBlocks();

    // Listen for property selection change in create form
    this.createForm.get('property_id')?.valueChanges.subscribe((propId) => {
      this.onPropertySelectedInCreateModal(propId);
    });

    // Listen for room type change in create form to update max units
    this.createForm.get('room_type_id')?.valueChanges.subscribe((roomTypeId) => {
      this.updateMaxUnitsForSelectedRoomType(roomTypeId);
    });
  }

  // ── Data Loading ─────────────────────────────────────────────────────────
  loadProperties(): void {
    this.isLoadingProperties.set(true);
    this.propertyService.admin
      .getProperties({ page: 1, size: 200 })
      .pipe(
        finalize(() => this.isLoadingProperties.set(false)),
        catchError(() => of(null))
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        if (res && res.data) {
          this.properties.set(res.data);
        }
      });
  }

  loadRoomBlocks(): void {
    const filters = this.searchForm.getRawValue();
    const query: RoomBlockQueryParams = {
      page: this.currentPage(),
      size: this.pageSize(),
      property_id: filters.property_id?.trim() || undefined,
      room_type_id: filters.room_type_id?.trim() || undefined,
      start_date: filters.start_date?.trim() || undefined,
      end_date: filters.end_date?.trim() || undefined,
      search: filters.search?.trim() || undefined,
      sort_by: 'created_at',
      sort_order: 'desc',
    };

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.roomBlockService.admin
      .getRoomBlocks(query)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        catchError((error) => {
          this.errorMessage.set(this.roomBlockService.extractFriendlyErrorMessage(error, 'Unable to load room blocks.'));
          this.roomBlocks.set([]);
          return of(null);
        })
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        if (!response) return;
        this.roomBlocks.set(response.data || []);
        this.meta = { ...response.meta };
      });
  }

  // ── Filters & Search ─────────────────────────────────────────────────────
  onSearch(): void {
    this.currentPage.set(1);
    this.loadRoomBlocks();
  }

  onReset(): void {
    this.searchForm.reset({
      property_id: '',
      room_type_id: '',
      start_date: '',
      end_date: '',
      search: '',
    });
    this.currentPage.set(1);
    this.loadRoomBlocks();
  }

  onRefresh(): void {
    this.loadRoomBlocks();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadRoomBlocks();
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
    this.loadRoomBlocks();
  }

  getSerialNumber(index: number): number {
    return (this.currentPage() - 1) * (this.meta?.size || this.pageSize()) + index + 1;
  }

  // ── Create Modal Actions ─────────────────────────────────────────────────
  openCreateModal(): void {
    const today = this.getTodayString();
    const tomorrow = this.getTomorrowString();

    this.createForm.reset({
      property_id: this.properties().length > 0 ? this.properties()[0].id : '',
      room_type_id: '',
      block_start_date: today,
      block_end_date: tomorrow,
      units_blocked: 1,
      reason_preset: 'Maintenance',
      reason_custom: '',
    });

    if (this.properties().length > 0) {
      this.onPropertySelectedInCreateModal(this.properties()[0].id);
    }

    this.createError.set(null);
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
    this.createError.set(null);
  }

  onPropertySelectedInCreateModal(propId?: string | null): void {
    if (!propId) {
      this.createModalRoomTypes.set([]);
      this.createForm.patchValue({ room_type_id: '' });
      return;
    }

    const prop = this.properties().find((p) => p.id === propId);
    if (prop && prop.property_room_types && prop.property_room_types.length > 0) {
      this.createModalRoomTypes.set(prop.property_room_types);
      const defaultRoomTypeId = prop.property_room_types[0].room_type?.id || '';
      this.createForm.patchValue({ room_type_id: defaultRoomTypeId });
      this.updateMaxUnitsForSelectedRoomType(defaultRoomTypeId);
    } else {
      this.createModalRoomTypes.set([]);
      this.createForm.patchValue({ room_type_id: '' });
      this.selectedRoomTypeMaxUnits.set(10);
    }
  }

  updateMaxUnitsForSelectedRoomType(roomTypeId?: string | null): void {
    if (!roomTypeId) {
      this.selectedRoomTypeMaxUnits.set(10);
      return;
    }
    const currentList = this.createModalRoomTypes();
    const matched = currentList.find((prt) => prt.room_type?.id === roomTypeId);
    if (matched && matched.total_units) {
      this.selectedRoomTypeMaxUnits.set(matched.total_units);
    } else {
      this.selectedRoomTypeMaxUnits.set(10);
    }
  }

  adjustCreateUnits(delta: number): void {
    const current = Number(this.createForm.get('units_blocked')?.value || 1);
    const max = this.selectedRoomTypeMaxUnits();
    const nextVal = Math.max(1, Math.min(max, current + delta));
    this.createForm.patchValue({ units_blocked: nextVal });
  }

  submitCreate(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      this.createError.set('Please fill in all required fields.');
      return;
    }

    const raw = this.createForm.getRawValue();
    const start = this.normalizeDateString(raw.block_start_date);
    const end = this.normalizeDateString(raw.block_end_date);
    const today = this.getTodayString();

    if (!start || start < today) {
      this.createError.set('Start date cannot be in the past.');
      return;
    }

    if (!end || end <= start) {
      this.createError.set('End date must be after the start date.');
      return;
    }

    const units = Number(raw.units_blocked) || 1;
    if (units < 1) {
      this.createError.set('Units to block must be at least 1.');
      return;
    }

    let finalReason = raw.reason_preset || '';
    if (raw.reason_custom?.trim()) {
      finalReason = finalReason ? `${finalReason}: ${raw.reason_custom.trim()}` : raw.reason_custom.trim();
    }

    const payload: RoomBlockCreatePayload = {
      property_id: raw.property_id!,
      room_type_id: raw.room_type_id!,
      block_start_date: start,
      block_end_date: end,
      units_blocked: units,
      reason: finalReason || null,
    };

    this.isCreating.set(true);
    this.createError.set(null);

    this.roomBlockService.admin
      .createRoomBlock(payload)
      .pipe(
        finalize(() => this.isCreating.set(false)),
        catchError((error) => {
          this.createError.set(
            this.roomBlockService.extractFriendlyErrorMessage(error, 'Failed to create room block.')
          );
          return of(null);
        })
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        if (!res) return;
        this.closeCreateModal();
        this.showTemporarySuccess('Room block created successfully.');
        this.loadRoomBlocks();
      });
  }

  // ── Edit Modal Actions ───────────────────────────────────────────────────
  openEditModal(block: RoomBlock): void {
    this.blockToEdit.set(block);
    this.editError.set(null);

    this.editForm.reset({
      block_start_date: this.normalizeDateString(block.block_start_date),
      block_end_date: this.normalizeDateString(block.block_end_date),
      units_blocked: block.units_blocked || 1,
      reason: block.reason || '',
    });

    this.isEditModalOpen.set(true);
  }

  closeEditModal(): void {
    this.isEditModalOpen.set(false);
    this.blockToEdit.set(null);
    this.editError.set(null);
  }

  adjustEditUnits(delta: number): void {
    const current = Number(this.editForm.get('units_blocked')?.value || 1);
    const max = this.blockToEdit()?.room_type?.total_units || 20;
    const nextVal = Math.max(1, Math.min(max, current + delta));
    this.editForm.patchValue({ units_blocked: nextVal });
  }

  submitEdit(): void {
    const block = this.blockToEdit();
    if (!block) return;

    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      this.editError.set('Please fill in all required fields.');
      return;
    }

    const raw = this.editForm.getRawValue();
    const start = this.normalizeDateString(raw.block_start_date);
    const end = this.normalizeDateString(raw.block_end_date);

    if (end <= start) {
      this.editError.set('End date must be strictly after the start date.');
      return;
    }

    const units = Number(raw.units_blocked) || 1;
    if (units < 1) {
      this.editError.set('Units to block must be at least 1.');
      return;
    }

    const payload: RoomBlockUpdatePayload = {
      block_start_date: start,
      block_end_date: end,
      units_blocked: units,
      reason: raw.reason?.trim() || null,
    };

    this.isUpdating.set(true);
    this.editError.set(null);

    this.roomBlockService.admin
      .updateRoomBlock(block.id, payload)
      .pipe(
        finalize(() => this.isUpdating.set(false)),
        catchError((error) => {
          this.editError.set(
            this.roomBlockService.extractFriendlyErrorMessage(error, 'Failed to update room block.')
          );
          return of(null);
        })
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        if (!res) return;
        this.closeEditModal();
        this.showTemporarySuccess('Room block updated successfully.');
        this.loadRoomBlocks();
      });
  }

  // ── Delete / Release Modal Actions ───────────────────────────────────────
  openDeleteModal(block: RoomBlock): void {
    this.blockToDelete.set(block);
    this.deleteError.set(null);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.blockToDelete.set(null);
    this.deleteError.set(null);
  }

  confirmDelete(): void {
    const block = this.blockToDelete();
    if (!block) return;

    this.isDeleting.set(true);
    this.deleteError.set(null);

    this.roomBlockService.admin
      .deleteRoomBlock(block.id)
      .pipe(
        finalize(() => this.isDeleting.set(false)),
        catchError((error) => {
          this.deleteError.set(
            this.roomBlockService.extractFriendlyErrorMessage(error, 'Failed to release room block.')
          );
          return of(null);
        })
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        if (!res) return;
        this.closeDeleteModal();
        this.showTemporarySuccess('Room block released successfully. Units are now available for booking.');
        this.loadRoomBlocks();
      });
  }

  // ── Date & Calculation Helpers ───────────────────────────────────────────
  getTodayString(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  getTomorrowString(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const y = tomorrow.getFullYear();
    const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const d = String(tomorrow.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  normalizeDateString(dateStr?: string | null): string {
    if (!dateStr) return '';
    return dateStr.split('T')[0];
  }

  formatDate(dateStr?: string | Date | null): string {
    if (!dateStr) return '—';
    return this.settingsService.formatDate(dateStr);
  }

  calculateNights(startDateStr?: string | null, endDateStr?: string | null): number {
    if (!startDateStr || !endDateStr) return 0;
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }

  isBlockActive(block: RoomBlock): boolean {
    const today = this.getTodayString();
    const s = this.normalizeDateString(block.block_start_date);
    const e = this.normalizeDateString(block.block_end_date);
    return !!(s && e && s <= today && today < e);
  }

  isBlockUpcoming(block: RoomBlock): boolean {
    const today = this.getTodayString();
    const s = this.normalizeDateString(block.block_start_date);
    return !!(s && s > today);
  }

  isBlockPast(block: RoomBlock): boolean {
    const today = this.getTodayString();
    const e = this.normalizeDateString(block.block_end_date);
    return !!(e && e <= today);
  }

  showTemporarySuccess(message: string): void {
    this.successMessage.set(message);
    setTimeout(() => {
      this.successMessage.set('');
    }, 5000);
  }

  ngOnDestroy(): void {
    if (this.messageTimeout) clearTimeout(this.messageTimeout);
  }
}

