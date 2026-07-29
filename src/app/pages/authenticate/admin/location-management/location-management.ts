import { Component, inject, signal } from '@angular/core';
import { PageBreadcrumb } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb';
import { Card } from '../../../../shared/components/ui/card/card';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LocationService } from '../../../../services/location/location-service';
import { CityService } from '../../../../services/city/city-service';
import { LocationRequest } from '../../../../services/location/location-model';
import { City } from '../../../../services/city/city-model';
import { Modal } from '../../../../shared/components/ui/modal/modal';

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
