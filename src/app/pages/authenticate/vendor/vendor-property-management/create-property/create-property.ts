import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, NgZone, OnInit, OnDestroy, AfterViewChecked, signal, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { take } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CreatePropertyRequest, PROPERTY_TYPES, PropertyRequest, PROPERTY_TYPES_LABELS } from '../../../../../services/property/property.model';
import { PropertyService } from '../../../../../services/property/property-service';
import { Card } from '../../../../../shared/components/ui/card/card';
import { CityService } from '../../../../../services/city/city-service';
import { LocationService } from '../../../../../services/location/location-service';
import { AmenityService } from '../../../../../services/amenity/amenity-service';
import { FacilityService } from '../../../../../services/facility/facility-service';
import { RoomTypeService } from '../../../../../services/room-type/room-type-service';
import { City } from '../../../../../services/city/city-model';
import { LocationResponse } from '../../../../../services/location/location-model';
import { Amenity } from '../../../../../services/amenity/amenity-model';
import { Facility } from '../../../../../services/facility/facility-model';
import { RoomType } from '../../../../../services/room-type/room-type-model';
import { AuthService } from '../../../../../services/auth/auth-service';
import { environment } from '../../../../../../environments/environment';

@Component({
  selector: 'app-vendor-create-property',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Card],
  templateUrl: './create-property.html',
})
export class CreateVendorProperty implements OnInit, AfterViewChecked, OnDestroy {
  private readonly formBuilder = inject(FormBuilder);
  private readonly propertyService = inject(PropertyService);
  private readonly authService = inject(AuthService);
  private readonly cityService = inject(CityService);
  private readonly locationService = inject(LocationService);
  private readonly amenityService = inject(AmenityService);
  private readonly facilityService = inject(FacilityService);
  private readonly roomTypeService = inject(RoomTypeService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ngZone = inject(NgZone);

  wizardSteps = ['Property Details', 'Amenities & Facilities', 'Pricing', 'Media', 'Settings'];
  currentStep = 0;

  readonly citySearchTerm = signal('');
  readonly isCityDropdownOpen = signal(false);
  readonly selectedCityLabel = signal('');
  readonly filteredCities = computed(() => {
    const term = this.citySearchTerm().trim().toLowerCase();

    if (!term) {
      return this.cities().slice(0, 20);
    }

    return this.cities().filter((city) => city.name?.toLowerCase().includes(term)).slice(0, 20);
  });

  readonly cities = signal<City[]>([]);
  readonly locations = signal<LocationResponse[]>([]);
  readonly loadingLocations = signal(false);
  readonly amenities = signal<Amenity[]>([]);
  readonly facilities = signal<Facility[]>([]);
  readonly roomTypes = signal<RoomType[]>([]);
  readonly galleryPreviews = signal<string[]>([]);
  readonly featureImagePreview = signal('');
  readonly coverImagePreview = signal('');
  readonly documentPreviews = signal<string[]>([]);
  readonly isSaving = signal(false);

  private autocompleteInitialized = false;
  private autocompleteElement?: HTMLInputElement;
  private autocompleteInstance?: any;
  private autocompleteListener?: google.maps.places.MapsEventListener;
  private googleMapsScript?: HTMLScriptElement;
  private googleMapsLoaded = false;
  private selectedCityForAutocomplete: string | null = null;
  private createdPropertyId: string | null = null;
  public readonly PROPERTY_TYPES_LABELS = PROPERTY_TYPES_LABELS;
  @ViewChild('googleLocationInput', { static: false }) googleLocationInput!: ElementRef<HTMLInputElement>;

  readonly propertyForm = this.formBuilder.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    type: ['home_stay' as CreatePropertyRequest['type'], Validators.required],
    city_id: ['', Validators.required],
    location_id: ['', Validators.required],
    address: ['', [Validators.required, Validators.minLength(5)]],
    description: ['', [Validators.required, Validators.minLength(20)]],
    price_per_night: [0, [Validators.required, Validators.min(1)]],
    sale_price: [0, [Validators.required, Validators.min(0)]],
    is_featured: [false],
    status: ['draft' as PropertyRequest['status'], Validators.required],
    galleryImages: this.formBuilder.control<string[]>([]),
    featureImage: [''],
    coverImage: [''],
    documents: this.formBuilder.control<string[]>([]),
    amenity_ids: this.formBuilder.control<string[]>([]),
    facility_ids: this.formBuilder.control<string[]>([]),
    room_type_ids: this.formBuilder.control<string[]>([]),
    food_option_ids: this.formBuilder.control<string[]>([]),
    lat: [null as number | null],
    lon: [null as number | null],
  });

  foodOptions = signal([
    { id: 'breakfast', name: 'Breakfast' },
    { id: 'lunch', name: 'Lunch' },
    { id: 'tiffin', name: 'Tiffin' },
    { id: 'dinner', name: 'Dinner' },
  ]);

  ngAfterViewChecked(): void {
    this.tryInitGoogleAutocomplete();
  }

  ngOnInit(): void {
    this.loadCities();
    this.loadAmenities();
    this.loadFacilities();
    this.loadRoomTypes();
    this.loadGoogleMapsScript();

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

  ngOnDestroy(): void {
    this.autocompleteListener?.remove();
    this.autocompleteListener = undefined;
    this.autocompleteInstance = undefined;
    this.autocompleteElement = undefined;
    this.autocompleteInitialized = false;

    if (this.googleMapsScript) {
      this.googleMapsScript.onload = null;
      this.googleMapsScript.onerror = null;
      this.googleMapsScript = undefined;
    }
  }

  saveAndReturnToList(): void {
    if (this.isSaving()) {
      return;
    }

    void this.saveFirstStep(false);
  }

  saveAndContinue(): void {
    if (this.isSaving()) {
      return;
    }

    void this.saveFirstStep(true);
  }

  private saveFirstStep(continueToEdit: boolean): void {
    if (!this.isCurrentStepValid()) {
      this.propertyForm.markAllAsTouched();
      return;
    }

    this.createPropertyDraft(continueToEdit);
  }

  cancel(): void {
    this.router.navigate(['/vendor/property-management']);
  }

  onCitySearchChange(term: string): void {
    this.citySearchTerm.set(term);
    this.isCityDropdownOpen.set(true);
    this.propertyForm.get('city_id')?.setValue('');
    this.selectedCityLabel.set('');
  }

  openCityDropdown(): void {
    this.isCityDropdownOpen.set(true);
  }

  selectCity(city: City): void {
    this.propertyForm.get('city_id')?.setValue(city.id);
    this.citySearchTerm.set(city.name);
    this.selectedCityLabel.set(city.name);
    this.isCityDropdownOpen.set(false);
    this.loadLocations(city.id);
    this.setAutocompleteCityRestriction(city.name, city.country?.name);
  }

  clearCitySelection(): void {
    this.propertyForm.get('city_id')?.setValue('');
    this.citySearchTerm.set('');
    this.selectedCityLabel.set('');
    this.isCityDropdownOpen.set(false);
    this.locations.set([]);
    this.clearAutocompleteCityRestriction();
  }

  onCityInputBlur(): void {
    if (!this.propertyForm.get('city_id')?.value) {
      this.propertyForm.get('city_id')?.markAsTouched();
    }
  }

  loadGoogleMapsScript(): void {
    if (typeof document === 'undefined') {
      return;
    }
    if (!environment.googleMapsApiKey) {
      console.error(
        'Google Maps API key not configured. Set GOOGLE_MAPS_API_KEY in .env or provide it via your build pipeline. See scripts/generate-environment.mjs for details.'
      );
      return;
    }

    if (window.google && window.google.maps && window.google.maps.places) {
      this.googleMapsLoaded = true;
      this.tryInitGoogleAutocomplete();
      return;
    }

    const win = window as Window & { gm_authFailure?: () => void };
    win.gm_authFailure = () => {
      console.error('Google Maps authentication failed: invalid API key or key restrictions.');
    };

    const script = document.createElement('script');
    this.googleMapsScript = script;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      this.googleMapsScript = undefined;
      if (!window.google || !window.google.maps || !window.google.maps.places) {
        console.error('Google Maps API script loaded but maps library is unavailable.');
        return;
      }
      this.googleMapsLoaded = true;
      this.tryInitGoogleAutocomplete();
    };
    script.onerror = () => {
      this.googleMapsScript = undefined;
      console.error('Failed to load the Google Maps API script. Check network access and API key.');
    };
    document.head.appendChild(script);
  }

  private tryInitGoogleAutocomplete(): void {
    if (typeof document === 'undefined') {
      return;
    }

    const locationInput = this.googleLocationInput?.nativeElement;
    if (!locationInput) {
      return;
    }

    if (!window.google || !window.google.maps || !window.google.maps.places) {
      return;
    }

    if (this.autocompleteInitialized && this.autocompleteElement === locationInput) {
      return;
    }

    this.initGoogleAutocomplete(locationInput);
  }

  private initGoogleAutocomplete(locationInput: HTMLInputElement): void {
    if (this.autocompleteInitialized && this.autocompleteElement === locationInput) {
      return;
    }

    if (!window.google || !window.google.maps || !window.google.maps.places) {
      console.error('Google Maps API not loaded');
      return;
    }

    const autocomplete = new window.google.maps.places.Autocomplete(locationInput, {
      types: ['geocode'],
      fields: ['geometry', 'formatted_address'],
    });

    this.autocompleteListener = autocomplete.addListener('place_changed', () => {
      type GooglePlaceResult = {
        geometry?: {
          location?: {
            lat(): number;
            lng(): number;
          };
        };
        formatted_address?: string;
      };

      const place = autocomplete.getPlace() as GooglePlaceResult;
      if (place.geometry?.location) {
        const lat = place.geometry.location.lat();
        const lon = place.geometry.location.lng();
        this.ngZone.run(() => {
          this.propertyForm.patchValue({
            address: place.formatted_address ?? locationInput.value.trim(),
            lat,
            lon,
          });
          this.propertyForm.get('address')?.markAsTouched();
        });
      } else {
        console.error('No geometry or location in place data', place);
      }
    });

    this.autocompleteInstance = autocomplete;
    this.autocompleteElement = locationInput;
    this.autocompleteInitialized = true;

    if (this.selectedCityForAutocomplete) {
      this.applyCityBoundsToAutocomplete(this.selectedCityForAutocomplete);
    }
  }

  private setAutocompleteCityRestriction(cityName: string, countryName?: string): void {
    this.selectedCityForAutocomplete = countryName ? `${cityName}, ${countryName}` : cityName;
    if (this.autocompleteInstance) {
      this.applyCityBoundsToAutocomplete(this.selectedCityForAutocomplete);
    }
  }

  private clearAutocompleteCityRestriction(): void {
    this.selectedCityForAutocomplete = null;
    if (this.autocompleteInstance?.setBounds) {
      this.autocompleteInstance.setBounds(undefined);
      if (this.autocompleteInstance.setStrictBounds) {
        this.autocompleteInstance.setStrictBounds(false);
      }
    }
  }

  private applyCityBoundsToAutocomplete(address: string): void {
    if (!window.google || !window.google.maps) {
      return;
    }

    const geocoder = new (window.google.maps as any).Geocoder();
    geocoder.geocode({ address }, (results: any, status: string) => {
      if (status !== 'OK' || !results?.length) {
        console.warn('City geocode failed for autocomplete bounds:', address, status);
        return;
      }

      const viewport = results[0].geometry?.viewport;
      if (viewport && this.autocompleteInstance?.setBounds) {
        this.autocompleteInstance.setBounds(viewport);
        if (this.autocompleteInstance.setStrictBounds) {
          this.autocompleteInstance.setStrictBounds(true);
        }
      }
    });
  }

  addGalleryImages(previews: string[]): void {
    if (!previews.length) {
      return;
    }

    this.galleryPreviews.update((list) => [...list, ...previews]);
    this.propertyForm.get('galleryImages')?.setValue(this.galleryPreviews());
  }

  addDocuments(previews: string[]): void {
    if (!previews.length) {
      return;
    }

    this.documentPreviews.update((list) => [...list, ...previews]);
    this.propertyForm.get('documents')?.setValue(this.documentPreviews());
  }

  handleImageSelection(controlName: 'featureImage' | 'coverImage', preview: string): void {
    this.propertyForm.get(controlName)?.setValue(preview);

    if (controlName === 'featureImage') {
      this.featureImagePreview.set(preview);
      return;
    }

    this.coverImagePreview.set(preview);
  }

  toggleSelection(controlName: 'amenity_ids' | 'facility_ids' | 'room_type_ids' | 'food_option_ids', id: string): void {
    const control = this.propertyForm.get(controlName);
    if (!control) {
      return;
    }

    const current = [...((control.value as string[] | null) ?? [])];
    const index = current.indexOf(id);

    if (index >= 0) {
      current.splice(index, 1);
    } else {
      current.push(id);
    }

    control.setValue(current);
  }

  isSelectionChecked(controlName: 'amenity_ids' | 'facility_ids' | 'room_type_ids' | 'food_option_ids', id: string): boolean {
    const control = this.propertyForm.get(controlName);
    return Array.isArray(control?.value) && control.value.includes(id);
  }

  private isCurrentStepValid(): boolean {
    if (this.currentStep === 0) {
      return !!(
        this.propertyForm.get('name')?.valid &&
        this.propertyForm.get('type')?.valid &&
        this.propertyForm.get('city_id')?.valid &&
        this.propertyForm.get('location_id')?.valid &&
        this.propertyForm.get('address')?.valid &&
        this.propertyForm.get('description')?.valid
      );
    }

    if (this.currentStep === 1) {
      return true;
    }

    if (this.currentStep === 2) {
      return !!(
        this.propertyForm.get('price_per_night')?.valid &&
        this.propertyForm.get('sale_price')?.valid &&
        this.isSalePriceValid()
      );
    }

    return !!this.propertyForm.get('status')?.valid;
  }

  private isSalePriceValid(): boolean {
    const pricePerNight = Number(this.propertyForm.get('price_per_night')?.value ?? 0);
    const salePrice = Number(this.propertyForm.get('sale_price')?.value ?? 0);
    return salePrice < pricePerNight;
  }

  private createPropertyDraft(continueToEdit: boolean): void {
    this.isSaving.set(true);

    const payload = this.buildCreatePayload();

    this.propertyService.createProperty(payload).subscribe({
      next: (property) => {
        this.createdPropertyId = property.data?.id ?? null;
        this.isSaving.set(false);
        if (!this.createdPropertyId) {
          return;
        }

        if (continueToEdit) {
          this.router.navigate([`/vendor/property-management/${this.createdPropertyId}/edit`], {
            queryParams: { step: 1 },
          });
          return;
        }

        this.router.navigate(['/vendor/property-management']);
      },
      error: () => {
        this.isSaving.set(false);
      },
    });
  }

  private buildCreatePayload(): CreatePropertyRequest {
    const raw = this.propertyForm.getRawValue();
    const authUser = this.authService.authUser();
    const vendorId = authUser?.id ?? '';
    const vendorName = authUser?.full_name ?? '';

    return {
      vendor_id: vendorId,
      name: String(raw.name ?? '').trim(),
      type: this.normalizePropertyType(raw.type),
      vendor: vendorName,
      city: this.getCityLabel(String(raw.city_id ?? '')),
      location: this.getLocationLabel(String(raw.location_id ?? '')),
      address: String(raw.address ?? '').trim(),
      latitude: Number(raw.lat ?? 0) || 0,
      longitude: Number(raw.lon ?? 0) || 0,
      city_id: String(raw.city_id ?? ''),
      location_id: String(raw.location_id ?? ''),
      description: String(raw.description ?? '').trim(),
    };
  }

  private normalizePropertyType(value: unknown): PropertyRequest['type'] {
    const safeValue = String(value ?? 'hotel');
    return (PROPERTY_TYPES as readonly string[]).includes(safeValue) ? (safeValue as PropertyRequest['type']) : 'hotel';
  }

  private getCityLabel(cityId: string): string {
    return this.cities().find((city) => city.id === cityId)?.name ?? '';
  }

  private getLocationLabel(locationId: string): string {
    return this.locations().find((location) => location.id === locationId)?.name ?? '';
  }

  private loadCities(): void {
    this.cityService.getCities({ page: 1, size: 100 }).pipe(take(1)).subscribe({
      next: (response) => this.cities.set(response.data),
      error: () => this.cities.set([]),
    });
  }

  private loadAmenities(): void {
    this.amenityService.getAmenities({ page: 1, size: 100 }).pipe(take(1)).subscribe({
      next: (response) => this.amenities.set(response.data),
      error: () => this.amenities.set([]),
    });
  }

  private loadFacilities(): void {
    this.facilityService.getFacilities({ page: 1, size: 100 }).pipe(take(1)).subscribe({
      next: (response) => this.facilities.set(response.data),
      error: () => this.facilities.set([]),
    });
  }

  private loadRoomTypes(): void {
    this.roomTypeService.getRoomTypes({ page: 1, size: 100 }).pipe(take(1)).subscribe({
      next: (response) => this.roomTypes.set(response.data),
      error: () => this.roomTypes.set([]),
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

