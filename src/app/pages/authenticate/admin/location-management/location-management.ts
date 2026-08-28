import { Component, inject, signal } from '@angular/core';
import { PageBreadcrumb } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb';
import { Card } from '../../../../shared/components/ui/card/card';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LocationService } from '../../../../services/location/location-service';
import { CityService } from '../../../../services/city/city-service';
import { LocationQuery, LocationRequest, LocationResponse, LocationSearch } from '../../../../services/location/location-model';
import { City } from '../../../../services/city/city-model';
import { Modal } from '../../../../shared/components/ui/modal/modal';
import { PaginationMeta } from '../../../../services/api/api-response.model';
import { catchError, finalize, of } from 'rxjs';
import { Pagination } from '../../../../shared/components/ui/pagination/pagination';

@Component({
  selector: 'app-location-management',
  imports: [
    PageBreadcrumb,
    Card,
    ReactiveFormsModule,
    Modal,
    Pagination
  ],
  templateUrl: './location-management.html',
  styleUrl: './location-management.css',
})
export class LocationManagement {
  private readonly formBuilder = inject(FormBuilder);
  private readonly locationService = inject(LocationService);
  private readonly cityService = inject(CityService);

  // Create Location modal state
  isCreateModalOpen = signal<boolean>(false);
  isCreating = signal(false);
  createErrorMessage = signal<string | null>(null);
  readonly selectedLocation = signal<LocationResponse | null>(null);
  readonly isEditModalOpen = signal(false);
  readonly isEditing = signal(false);
  readonly editErrorMessage = signal<string | null>(null);
  readonly isStatusModalOpen = signal(false);
  readonly isUpdatingStatus = signal(false);
  readonly statusErrorMessage = signal<string | null>(null);
  readonly locationToToggleStatus = signal<LocationResponse | null>(null);

  cities = signal<City[]>([]);

  meta!: PaginationMeta;
    // Cities List State
  readonly locations = signal<LocationResponse[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly currentPage = signal(1);
  readonly pageSize = signal(10);
  readonly totalItems = signal(0);
  ngOnInit() {
    this.cityService.admin.getCities({
      page: 1,
      size: 100,
      search: {
        status: 'active',
      },
    }).subscribe({
      next: (response) => {
        this.cities.set(response.data);
      },
      error: (error) => {
        console.error('Error fetching cities:', error);
      }
    });

    this.loadLocations();
  }

  readonly searchForm = this.formBuilder.group({
      name: [''],
      city_id: [''],
      status: [''],
    });

  readonly pageSizeOptions = [10, 20, 30];
    onSearch(): void {
    this.currentPage.set(1);
   this.loadLocations();
  }

  onPageSizeChange(pageSize: number): void {
    this.pageSize.set(pageSize);
    this.currentPage.set(1);
   this.loadLocations();
  }

  onReset(): void {
    this.searchForm.reset({ name: '', city_id: '', status: '' });
    this.currentPage.set(1);
    this.loadLocations();
  }
  

  //  List Locations 
loadLocations() {
const filters = this.searchForm.getRawValue();
  const search: LocationSearch = {
    name: filters.name?.trim() || undefined,
    city_id: filters.city_id?.trim() || undefined,
    status: filters.status?.trim() || undefined,
  };

  const query: LocationQuery = {
    page: this.currentPage(),
    size: this.pageSize(),
    search,
  };

  this.isLoading.set(true);
  this.errorMessage.set('');

  this.locationService.admin.getLocations(query)
        .pipe(
          finalize(() => this.isLoading.set(false)),
          catchError((error) => {
            this.errorMessage.set(error?.error?.message || error?.message || 'Unable to load countries.');
            this.cities.set([]);
            this.totalItems.set(0);
            return of(null);
          })
        )
        .subscribe((response) => {
          if (!response) {
            return;
          }
  
          this.locations.set(response.data || []);
          this.totalItems.set(response.meta?.total || 0);
          this.meta = { ...response.meta };
        });
}
getSerialNumber(index: number): number {
    const currentPage = this.currentPage() || 1;
    const itemsPerPage = this.meta?.size || 2;
    return (currentPage - 1) * itemsPerPage + index + 1;
  }


getStatusLabel(status: string): string {
  return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown';
}

isInactive(location: LocationResponse | null): boolean {
  return location?.status === 'inactive';
}

getDisableActionLabel(location: LocationResponse | null): string {
  return this.isInactive(location) ? 'Enable' : 'Disable';
}

  getStatusAction(location: LocationResponse | null): 'active' | 'inactive' {
    return this.isInactive(location) ? 'active' : 'inactive';
}

openEditModal(location: LocationResponse) {
    this.selectedLocation.set(location);
    this.editLocationForm.reset({
      name: location.name,
      cityId: location.city?.id || '',
    });
    this.editErrorMessage.set(null);
    this.isEditModalOpen.set(true);
  }

  closeEditModal() {
    this.isEditModalOpen.set(false);
    this.selectedLocation.set(null);
  }

  openStatusModal(location: LocationResponse) {
    this.locationToToggleStatus.set(location);
    this.statusErrorMessage.set(null);
    this.isStatusModalOpen.set(true);
  }

  closeStatusModal() {
    this.isStatusModalOpen.set(false);
    this.locationToToggleStatus.set(null);
  }

  confirmStatusToggle() {
    const location = this.locationToToggleStatus();
    if (!location) {
      return;
    }

    const nextStatus = this.getStatusAction(location);
    this.isUpdatingStatus.set(true);
    this.statusErrorMessage.set(null);

    this.locationService.admin.statusUpdate(location.id, nextStatus)
      .pipe(
        finalize(() => this.isUpdatingStatus.set(false)),
        catchError((error) => {
          this.statusErrorMessage.set(
            error?.error?.message || error?.message || `Unable to ${nextStatus === 'active' ? 'enable' : 'disable'} location.`
          );
          return of(null);
        })
      )
      .subscribe((response) => {
        if (!response) {
          return;
        }
        this.closeStatusModal();
        this.loadLocations();
      });
  }
  
  // Create Location form
  createLocationForm = this.formBuilder.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    cityId: ['', [Validators.required]],
  });

  readonly editLocationForm = this.formBuilder.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    cityId: ['', [Validators.required]],
  });

  openCreateModal() {
    this.createLocationForm.reset({ name: '', cityId: '' });
    this.createErrorMessage.set(null);
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal() {
    this.isCreateModalOpen.set(false);
  }

  onSubmitCreate() {
    if (this.createLocationForm.invalid) {
      this.createLocationForm.markAllAsTouched();
      return;
    }

    this.isCreating.set(true);
    this.createErrorMessage.set(null);

    const payload : LocationRequest = {
      name: this.createLocationForm.value.name || '',
      city_id: this.createLocationForm.value.cityId || '',
    };

    this.locationService.admin.createLocation(payload)
      .subscribe({
        next: (response) => {
          this.isCreating.set(false);
          this.closeCreateModal();
          // Refresh locations list
          this.loadLocations();
        },
        error: (error) => {
          this.isCreating.set(false);
          const err = this.locationService.extractApiErrorMessage(error);
          this.createErrorMessage.set(err || 'Failed to create location');
        }
      });
  }

  get nameControl() {
    return this.createLocationForm.get('name')!;
  }

  get cityIdControl() {
    return this.createLocationForm.get('cityId')!;
  }

  get editNameControl() {
    return this.editLocationForm.get('name')!;
  }

  get editCityIdControl() {
    return this.editLocationForm.get('cityId')!;
  }

  submitEditForm() {
    if (this.editLocationForm.invalid) {
      this.editLocationForm.markAllAsTouched();
      return;
    }

    const location = this.selectedLocation();
    if (!location) {
      return;
    }

    const formValue = this.editLocationForm.getRawValue();
    const payload: LocationRequest = {
      name: formValue.name || '',
      city_id: formValue.cityId || '',
    };

    this.isEditing.set(true);
    this.editErrorMessage.set(null);

    this.locationService.admin.updateLocation(location.id, payload)
      .pipe(
        finalize(() => this.isEditing.set(false)),
        catchError((error) => {
          const err = this.locationService.extractApiErrorMessage(error);
          this.editErrorMessage.set(err || 'Unable to update location.');
          return of(null);
        })
      )
      .subscribe((response) => {
        if (!response) {
          return;
        }
        this.closeEditModal();
        this.loadLocations();
      });
  }

  onPageChange(page: number) {
    this.currentPage.set(page);
    this.loadLocations();
  }
}
