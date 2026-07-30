import { Component, inject, signal } from '@angular/core';
import { Pagination, PaginationMeta } from '../../../../shared/components/ui/pagination/pagination';
import { Modal } from '../../../../shared/components/ui/modal/modal';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Card } from '../../../../shared/components/ui/card/card';
import { PageBreadcrumb } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb';
import { CommonModule } from '@angular/common';
import { UploadImage } from '../../../../shared/components/common/upload-image/upload-image';
import { FacilityService } from '../../../../services/facility/facility-service';
import { Facility, FacilityQuery, FacilitySearch } from '../../../../services/facility/facility-model';
import { catchError, finalize, of } from 'rxjs';

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
  // Create  modal state
  isCreateModalOpen = signal<boolean>(false);
  isCreating = signal(false);
  createErrorMessage = signal<string | null>(null);

  // Icon preview state
  iconPreview = signal<string>('');


  ngOnInit(): void {
    this.loadFacilities();
  }
  // Create facility form
  createForm = this.formBuilder.group({
    name: ['', [Validators.required]],
    icon: [null as File | string | null],
  });



  readonly searchForm = this.formBuilder.group({
      name: [''],
      
      status: [''],
    });

    
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
        // Refresh the list
       
      },
      error: (err) => {
        this.isCreating.set(false);
        const error = this.facilityService.apiService.extractApiErrorMessage(err);
        this.createErrorMessage.set(error || 'Failed to create country');
      },
    })
  }

  get nameControl() {
    return this.createForm.get('name')!;
  }

 

  get iconControl() {
    return this.createForm.get('icon')!;
  }
}
