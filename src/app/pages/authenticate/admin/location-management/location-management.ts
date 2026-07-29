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

@Component({
  selector: 'app-location-management',
  imports: [
    PageBreadcrumb,
    Card,
    ReactiveFormsModule,
    Modal
  ],
  templateUrl: './location-management.html',
  styleUrl: './location-management.css',
})
export class LocationManagement {
  private readonly formBuilder = inject(FormBuilder);
  private readonly locationService = inject(LocationService);
  private readonly cityService = inject(CityService)

  // Create Location modal state
  isCreateModalOpen = signal<boolean>(false);
  isCreating = signal(false);
  createErrorMessage = signal<string | null>(null);

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
    this.cityService.getCities({
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

  this.locationService.getLocations(query)
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
    // this.selectedCity.set(city);
    // this.editCityImagePreview.set(city.image_url || '');
    // this.editCityForm.reset({
    //   name: city.name,
    //   countryId: city.country?.id || '',
    //   city_image: city.image_url || null,
    // });
    // this.editErrorMessage.set(null);
    // this.isEditModalOpen.set(true);
  }

  closeEditModal() {
    // this.isEditModalOpen.set(false);
    // this.selectedCity.set(null);
  }

  openStatusModal(location: LocationResponse) {
    // this.cityToToggleStatus.set(city);
    // this.statusErrorMessage.set(null);
    // this.isStatusModalOpen.set(true);
  }

  closeStatusModal() {
    // this.isStatusModalOpen.set(false);
    // this.cityToToggleStatus.set(null);
  }
  
  // Create Location form
  createLocationForm = this.formBuilder.group({
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

    this.locationService.createLocation(payload)
      .subscribe({
        next: (response) => {
          this.isCreating.set(false);
          this.closeCreateModal();
          // Refresh locations list
          //this.loadLocations();
        },
        error: (error) => {
          this.isCreating.set(false);
          const err = this.locationService.apiService.extractApiErrorMessage(error);
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
}
