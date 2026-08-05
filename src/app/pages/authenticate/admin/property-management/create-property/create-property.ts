import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { PropertyRequest } from '../../../../../services/property/property.model';
import { PropertyService } from '../../../../../services/property/property-service';
import { Card } from '../../../../../shared/components/ui/card/card';
import { UserService } from '../../../../../services/user/user-service';
import { CityService } from '../../../../../services/city/city-service';
import { LocationService } from '../../../../../services/location/location-service';
import { User } from '../../../../../services/user/user.model';
import { City } from '../../../../../services/city/city-model';
import { LocationResponse } from '../../../../../services/location/location-model';
import { take } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-create-property',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Card],
  templateUrl: './create-property.html',
})
export class CreateProperty implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly propertyService = inject(PropertyService);
  private readonly userService = inject(UserService);
  private readonly cityService = inject(CityService);
  private readonly locationService = inject(LocationService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly vendors = signal<User[]>([]);
  readonly cities = signal<City[]>([]);
  readonly locations = signal<LocationResponse[]>([]);
  readonly loadingLocations = signal(false);

  readonly propertyForm = this.formBuilder.group({
    vendor_id: ['', Validators.required],
    name: ['', [Validators.required, Validators.minLength(3)]],
    location_id: ['', Validators.required],
    city_id: ['', Validators.required],
    is_featured: [false],
    description: ['', [Validators.required, Validators.minLength(20)]],
  });

  ngOnInit(): void {
    this.loadVendors();
    this.loadCities();

    this.propertyForm.get('city_id')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((cityId) => {
        this.propertyForm.get('location_id')?.reset('');
        if (cityId) {
          this.loadLocations(cityId);
          return;
        }
        this.locations.set([]);
      });
  }

  submitPropertyForm(): void {
    if (this.propertyForm.invalid) {
      this.propertyForm.markAllAsTouched();
      return;
    }

    const payload = this.propertyForm.getRawValue() as PropertyRequest;

    this.propertyService.createProperty(payload).subscribe(() => {
      this.router.navigate(['/admin/property-management']);
    });
  }

  cancel(): void {
    this.router.navigate(['/admin/property-management']);
  }

  private loadVendors(): void {
    this.userService.getVendors({ page: 1, size: 100 }).pipe(take(1)).subscribe({
      next: (response) => this.vendors.set(response.data),
      error: () => this.vendors.set([]),
    });
  }

  private loadCities(): void {
    this.cityService.getCities({ page: 1, size: 100 }).pipe(take(1)).subscribe({
      next: (response) => this.cities.set(response.data),
      error: () => this.cities.set([]),
    });
  }

  private loadLocations(cityId: string): void {
    this.loadingLocations.set(true);
    this.locationService.getLocations({ page: 1, size: 100, search: { city_id: cityId } }).pipe(take(1)).subscribe({
      next: (response) => {
        this.locations.set(response.data);
        this.loadingLocations.set(false);
      },
      error: () => {
        this.locations.set([]);
        this.loadingLocations.set(false);
      },
    });
  }
}
