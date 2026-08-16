import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Pagination, PaginationMeta } from '../../../../shared/components/ui/pagination/pagination';
import { Modal } from '../../../../shared/components/ui/modal/modal';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Card } from '../../../../shared/components/ui/card/card';
import { PageBreadcrumb } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb';
import { UploadImage } from '../../../../shared/components/common/upload-image/upload-image';
import { FacilityService } from '../../../../services/facility/facility-service';
import { Facility, FacilityQuery, FacilitySearch } from '../../../../services/facility/facility-model';
import { catchError, finalize, of } from 'rxjs';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-facility-management',
  imports: [
    CommonModule,
    PageBreadcrumb,
    Card,
    ReactiveFormsModule,
    Modal,
    UploadImage,
    Pagination
  ],
  templateUrl: './facility-management.html',
  styleUrl: './facility-management.css',
})
export class FacilityManagement {
  public readonly assetUrl = environment.assetUrl;
  private readonly formBuilder = inject(FormBuilder);
  private readonly facilityService = inject(FacilityService);


  meta!: PaginationMeta;
    // Facilities List State
    readonly facilities = signal<Facility[]>([]);
    readonly isLoading = signal(false);
    readonly errorMessage = signal('');
    readonly currentPage = signal(1);
    readonly pageSize = signal(10);
    readonly totalItems = signal(0);
    readonly pageSizeOptions = [10, 20, 30];

  // Edit modal state
  isEditModalOpen = signal<boolean>(false);
  isEditing = signal(false);
  editErrorMessage = signal<string | null>(null);
  selectedFacility = signal<Facility | null>(null);

  // Status modal state
  isStatusModalOpen = signal<boolean>(false);
  isUpdatingStatus = signal(false);
  statusErrorMessage = signal<string | null>(null);
  facilityToToggleStatus = signal<Facility | null>(null);

  // Create  modal state
  isCreateModalOpen = signal<boolean>(false);
  isCreating = signal(false);
  createErrorMessage = signal<string | null>(null);

  // Icon preview state
  iconPreview = signal<string>('');


  // Create facility form
  createForm = this.formBuilder.group({
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

    
  //  List Facilities 
    loadFacilities() {
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
  
          this.facilityService.getFacilities(query)
                .pipe(
                  finalize(() => this.isLoading.set(false)),
                  catchError((error) => {
                    this.errorMessage.set(error?.error?.message || error?.message || 'Unable to load facilities.');
                    this.facilities.set([]);
                    this.totalItems.set(0);
                    return of(null);
                  })
                )
                .subscribe((response) => {
                  if (!response) {
                    return;
                  }
          
                  this.facilities.set(response.data || []);
                  this.totalItems.set(response.meta?.total || 0);
                  this.meta = { ...response.meta };
                });
    }

  openCreateModal() {
    this.createForm.reset({ name: '', icon: null });
    this.createErrorMessage.set(null);
    this.isCreateModalOpen.set(true);
    this.iconPreview.set('');
  }

  closeCreateModal() {
    this.isCreateModalOpen.set(false);
  }

  openEditModal(facility: Facility) {
    this.selectedFacility.set(facility);
    this.editForm.reset({
      name: facility.name,
      icon: facility.icon_url || null,
    });
    this.editErrorMessage.set(null);
    this.isEditModalOpen.set(true);
    this.iconPreview.set(this.assetUrl + (facility.icon_url || ''));
  }

  closeEditModal() {
    this.isEditModalOpen.set(false);
    this.selectedFacility.set(null);
    this.iconPreview.set('');
  }

  openStatusModal(facility: Facility) {
    this.facilityToToggleStatus.set(facility);
    this.statusErrorMessage.set(null);
    this.isStatusModalOpen.set(true);
  }

  closeStatusModal() {
    this.isStatusModalOpen.set(false);
    this.facilityToToggleStatus.set(null);
  }


  onSubmitCreate() {
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

    this.facilityService.create(payload).subscribe({
       next: (response) => {
        this.isCreating.set(false);
        this.closeCreateModal();
        this.loadFacilities();
      },
      error: (err) => {
        this.isCreating.set(false);
        const error = this.facilityService.apiService.extractApiErrorMessage(err);
        this.createErrorMessage.set(error || 'Failed to create facility');
      },
    })
  }

  submitEditForm() {
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

    this.facilityService.update(facility.id, payload).pipe(
      finalize(() => this.isEditing.set(false)),
      catchError((error) => {
        this.editErrorMessage.set(error?.error?.message || error?.message || 'Unable to update facility.');
        return of(null);
      })
    ).subscribe((response) => {
      if (!response) {
        return;
      }
      this.closeEditModal();
      this.loadFacilities();
    });
  }

  confirmStatusToggle() {
    const facility = this.facilityToToggleStatus();
    if (!facility) {
      return;
    }

    const nextStatus = this.getStatusAction(facility);

    this.isUpdatingStatus.set(true);
    this.statusErrorMessage.set(null);

    this.facilityService.statusUpdate(facility.id, nextStatus)
      .pipe(
        finalize(() => this.isUpdatingStatus.set(false)),
        catchError((error) => {
          this.statusErrorMessage.set(
            error?.error?.message || error?.message || `Unable to ${nextStatus === 'active' ? 'enable' : 'disable'} facility.`
          );
          return of(null);
        })
      )
      .subscribe((response) => {
        if (!response) {
          return;
        }
        this.closeStatusModal();
        this.loadFacilities();
      });
  }

  get nameControl() {
    return this.createForm.get('name')!;
  }

 

  get iconControl() {
    return this.createForm.get('icon')!;
  }

  get createNameControl() {
    return this.createForm.get('name')!;
  }

  get editNameControl() {
    return this.editForm.get('name')!;
  }

  get editIconControl() {
    return this.editForm.get('icon')!;
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

  onPageChange(page: number) {
    this.currentPage.set(page);
    this.loadFacilities();
  }

  getSerialNumber(index: number): number {
    const currentPage = this.currentPage() || 1;
    const itemsPerPage = this.meta?.size || 2;
    return (currentPage - 1) * itemsPerPage + index + 1;
  }
}
