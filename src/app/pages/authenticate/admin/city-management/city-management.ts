import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CityService } from '../../../../services/city/city-service';
import { PageBreadcrumb } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb';
import { Card } from '../../../../shared/components/ui/card/card';
import { Modal } from '../../../../shared/components/ui/modal/modal';
import { Country, CountryQuery } from '../../../../services/country/country-model';
import { CountryService } from '../../../../services/country/country-service';
import { UploadImage } from '../../../../shared/components/common/upload-image/upload-image';
import { PaginationMeta } from '../../../../services/api/api-response.model';
import { City, CitySearch } from '../../../../services/city/city-model';
import { catchError, finalize, of } from 'rxjs';
import { Pagination } from '../../../../shared/components/ui/pagination/pagination';

@Component({
  selector: 'app-city-management',
  imports: [
    PageBreadcrumb,
    Card,
    Modal,
    ReactiveFormsModule,
    UploadImage,
    Pagination
  ],
  templateUrl: './city-management.html',
  styleUrl: './city-management.css',
})
export class CityManagement {
  private readonly formBuilder = inject(FormBuilder);

  private readonly cityService = inject(CityService)

  private readonly countryService = inject(CountryService)

  meta!: PaginationMeta;
  // Cities List State
  readonly cities = signal<City[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly currentPage = signal(1);
  readonly pageSize = signal(10);
  readonly totalItems = signal(0);
  // City Image Preview
  readonly cityImagePreview = signal('')
  readonly editCityImagePreview = signal('')
  // Countries List
  readonly countries = signal<Country[]>([]);
  // --- Status toggle state ---
  isStatusModalOpen = signal<boolean>(false);
  isUpdatingStatus = signal(false);
  statusErrorMessage = signal<string | null>(null);
  cityToToggleStatus = signal<City | null>(null);

  // --- Edit state ---
  isEditModalOpen = signal<boolean>(false);
  isEditing = signal(false);
  editErrorMessage = signal<string | null>(null);
  selectedCity = signal<City | null>(null);
  ngOnInit(): void {
    this.loadCountries();
    this.loadCities();
  }

  // Create city modal state
  isCreateModalOpen = signal<boolean>(false);
  isCreating = signal(false);
  createErrorMessage = signal<string | null>(null);

  public readonly editCityForm = this.formBuilder.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    countryId: ['', [Validators.required]],
    city_image: [null as File | string | null],
    status: ['', [Validators.required]],
  });

    readonly searchForm = this.formBuilder.group({
      name: [''],
      country_id: [''],
      status: [''],
    });

    readonly pageSizeOptions = [10, 20, 30];
    onSearch(): void {
    this.currentPage.set(1);
    this.loadCities();
  }

  onReset(): void {
    this.searchForm.reset({ name: '', country_id: '', status: '' });
    this.currentPage.set(1);
    this.loadCities();
  }
  //  List Cities 
  loadCities() {
     const filters = this.searchForm.getRawValue();
        const search: CitySearch = {
          name: filters.name?.trim() || undefined,
          country_id: filters.country_id?.trim() || undefined,
          status: filters.status?.trim() || undefined,
        };
    
        const query: CountryQuery = {
          page: this.currentPage(),
          size: this.pageSize(),
          search,
        };
    
        this.isLoading.set(true);
        this.errorMessage.set('');

        this.cityService.getCities(query)
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
        
                this.cities.set(response.data || []);
                this.totalItems.set(response.meta?.total || 0);
                this.meta = { ...response.meta };
              });
  }

  // ================= CREATE =================

  public readonly createCityForm = this.formBuilder.group({
    name: [
      '',
      [Validators.required, Validators.minLength(2), Validators.maxLength(100)],
    ],
    countryId: [
      '',
      [Validators.required],
    ],
    city_image: [
      null as File | string | null,
      [Validators.required],
    ],
  });

  openCreateModal() {
    this.createCityForm.reset({ name: '', countryId: '', city_image: null });
    this.createErrorMessage.set(null);
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal() {
    this.isCreateModalOpen.set(false);
  }

  onSubmitCreate() {
    if (this.createCityForm.invalid) {
      this.createCityForm.markAllAsTouched();
      return;
    }

    this.isCreating.set(true);
    this.createErrorMessage.set(null);

    const formData = this.createCityForm.value;
    const payload = new FormData();
    payload.append('name', formData.name || '');
    payload.append('country_id', formData.countryId || '');
    if (formData.city_image) {
      payload.append('image_url', formData.city_image);
    }

    this.cityService.createCity(payload).subscribe({
      next: (response) => {
        this.isCreating.set(false);
        this.closeCreateModal();
        // Refresh the list
        // this.loadCountries();
      },
      error: (err) => {
        this.isCreating.set(false);
        this.createErrorMessage.set(err?.error?.message || 'Failed to create country');
      },
    });
  }

  loadCountries() {
    this.countryService.getCountries({
      page: 1,
      size: 100,
      search: {
        status: 'active',
      },
    }).subscribe({
      next: (response) => {
        this.countries.set(response.data);
      },
    });
  }

  get nameControl() {
    return this.createCityForm.get('name')!;
  }

  get countryIdControl() {
    return this.createCityForm.get('countryId')!;
  }

  get cityImageControl() {
    return this.createCityForm.get('city_image')!;
  }

  get editNameControl() {
    return this.editCityForm.get('name')!;
  }

  get editCountryIdControl() {
    return this.editCityForm.get('countryId')!;
  }

  get editCityImageControl() {
    return this.editCityForm.get('city_image')!;
  }

  get editStatusControl() {
    return this.editCityForm.get('status')!;
  }


   getSerialNumber(index: number): number {
    const currentPage = this.currentPage() || 1;
    const itemsPerPage = this.meta?.size || 2;
    return (currentPage - 1) * itemsPerPage + index + 1;
  }


  getStatusLabel(status: string): string {
    return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown';
  }

  isInactive(city: City | null): boolean {
    return city?.status === 'inactive';
  }

  getDisableActionLabel(city: City | null): string {
    return this.isInactive(city) ? 'Enable' : 'Disable';
  }

  getStatusAction(city: City | null): 'active' | 'inactive' {
    return this.isInactive(city) ? 'active' : 'inactive';
  }

  openEditModal(city: City) {
    this.selectedCity.set(city);
    this.editCityImagePreview.set(city.image_url || '');
    this.editCityForm.reset({
      name: city.name,
      countryId: city.country?.id || '',
      city_image: city.image_url || null,
    });
    this.editErrorMessage.set(null);
    this.isEditModalOpen.set(true);
  }

  closeEditModal() {
    this.isEditModalOpen.set(false);
    this.selectedCity.set(null);
  }

  submitEditForm() {
    if (this.editCityForm.invalid) {
      this.editCityForm.markAllAsTouched();
      return;
    }

    const city = this.selectedCity();
    if (!city) {
      return;
    }

    const formValue = this.editCityForm.getRawValue();
    const payload = new FormData();
    payload.append('name', formValue.name || '');
    payload.append('country_id', formValue.countryId || '');

    if (formValue.city_image && typeof formValue.city_image !== 'string') {
      payload.append('image_url', formValue.city_image);
    }

    this.isEditing.set(true);
    this.editErrorMessage.set(null);

    this.cityService.updateCity(city.id, payload as any)
      .pipe(
        finalize(() => this.isEditing.set(false)),
        catchError((error) => {
          this.editErrorMessage.set(error?.error?.message || error?.message || 'Unable to update city.');
          return of(null);
        })
      )
      .subscribe((response) => {
        if (!response) {
          return;
        }
        this.closeEditModal();
        this.loadCities();
      });
  }

  openStatusModal(city: City) {
    this.cityToToggleStatus.set(city);
    this.statusErrorMessage.set(null);
    this.isStatusModalOpen.set(true);
  }

  closeStatusModal() {
    this.isStatusModalOpen.set(false);
    this.cityToToggleStatus.set(null);
  }

  confirmStatusToggle() {
    const city = this.cityToToggleStatus();
    if (!city) {
      return;
    }

    const nextStatus = this.getStatusAction(city);
    this.isUpdatingStatus.set(true);
    this.statusErrorMessage.set(null);

    this.cityService.statusUpdate(city.id, nextStatus)
      .pipe(
        finalize(() => this.isUpdatingStatus.set(false)),
        catchError((error) => {
          this.statusErrorMessage.set(
            error?.error?.message || error?.message || `Unable to ${nextStatus === 'active' ? 'enable' : 'disable'} city.`
          );
          return of(null);
        })
      )
      .subscribe((response) => {
        if (!response) {
          return;
        }
        this.closeStatusModal();
        this.loadCities();
      });
  }

  onPageChange(page: number) {
    this.currentPage.set(page);
    this.loadCities();
  }
}
