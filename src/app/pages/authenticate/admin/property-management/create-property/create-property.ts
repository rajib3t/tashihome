import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, NgZone, OnInit, AfterViewChecked, signal, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { take } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CreatePropertyRequest, PROPERTY_TYPES, PropertyRequest, PropertyUpdateRequest,  PROPERTY_TYPES_LABELS} from '../../../../../services/property/property.model';
import { PropertyService } from '../../../../../services/property/property-service';
import { Card } from '../../../../../shared/components/ui/card/card';
import { UploadImage } from '../../../../../shared/components/common/upload-image/upload-image';
import { UserService } from '../../../../../services/user/user-service';
import { CityService } from '../../../../../services/city/city-service';
import { LocationService } from '../../../../../services/location/location-service';
import { AmenityService } from '../../../../../services/amenity/amenity-service';
import { FacilityService } from '../../../../../services/facility/facility-service';
import { RoomTypeService } from '../../../../../services/room-type/room-type-service';
import { User } from '../../../../../services/user/user.model';
import { City } from '../../../../../services/city/city-model';
import { LocationResponse } from '../../../../../services/location/location-model';
import { Amenity } from '../../../../../services/amenity/amenity-model';
import { Facility } from '../../../../../services/facility/facility-model';
import { RoomType } from '../../../../../services/room-type/room-type-model';
import { environment } from '../../../../../../environments/environment';

@Component({
  selector: 'app-create-property',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Card, UploadImage],
  templateUrl: './create-property.html',
})
export class CreateProperty implements OnInit, AfterViewChecked {
  private readonly formBuilder = inject(FormBuilder);
  private readonly propertyService = inject(PropertyService);
  private readonly userService = inject(UserService);
  private readonly cityService = inject(CityService);
  private readonly locationService = inject(LocationService);
  private readonly amenityService = inject(AmenityService);
  private readonly facilityService = inject(FacilityService);
  private readonly roomTypeService = inject(RoomTypeService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ngZone = inject(NgZone);

wizardSteps = ['Property Details', 'Amenities & Facilities', 'Pricing', 'Media', 'Settings'];  currentStep = 0;

  readonly vendors = signal<User[]>([]);
  readonly vendorSearchTerm = signal('');
  readonly isVendorDropdownOpen = signal(false);
  readonly selectedVendorLabel = signal('');
  readonly filteredVendors = computed(() => {
    const term = this.vendorSearchTerm().trim().toLowerCase();

    if (!term) {
      return this.vendors().slice(0, 20);
    }

    return this.vendors()
      .filter((vendor) => {
        const name = vendor.full_name?.toLowerCase() ?? '';
        const email = vendor.email?.toLowerCase() ?? '';
        const phone = vendor.phone?.toLowerCase() ?? '';
        return name.includes(term) || email.includes(term) || phone.includes(term);
      })
      .slice(0, 20);
  });

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
  private googleMapsLoaded = false;
  private selectedCityForAutocomplete: string | null = null;
  private createdPropertyId: number | null = null;
  @ViewChild('googleLocationInput', { static: false }) googleLocationInput!: ElementRef<HTMLInputElement>;

  readonly propertyForm = this.formBuilder.group({
    vendor_id: ['', Validators.required],
    name: ['', [Validators.required, Validators.minLength(3)]],
    type: ['hotel' as CreatePropertyRequest['type'], Validators.required],
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
    this.loadVendors();
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

  nextStep(): void {
    void this.saveCurrentStepAndAdvance();
  }

  private saveCurrentStepAndAdvance(): void {
    if (!this.isCurrentStepValid()) {
      this.propertyForm.markAllAsTouched();
      return;
    }

    if (this.currentStep === 0) {
      this.createPropertyDraft();
      return;
    }

    if (this.currentStep === 3) {
      this.uploadMediaAndAdvance();
      return;
    }

    this.updatePropertyDraft(() => {
      this.currentStep = Math.min(this.currentStep + 1, this.wizardSteps.length - 1);
    });
  }

  previousStep(): void {
    this.currentStep = Math.max(this.currentStep - 1, 0);
  }

  submitPropertyForm(): void {
    if (!this.createdPropertyId) {
      this.propertyForm.markAllAsTouched();
      return;
    }

    if (!this.isCurrentStepValid()) {
      this.propertyForm.markAllAsTouched();
      return;
    }

    this.updatePropertyDraft(() => {
      this.router.navigate(['/admin/property-management']);
    });
  }

  cancel(): void {
    this.router.navigate(['/admin/property-management']);
  }

  onVendorSearchChange(term: string): void {
    this.vendorSearchTerm.set(term);
    this.isVendorDropdownOpen.set(true);
    this.propertyForm.get('vendor_id')?.setValue('');
    this.selectedVendorLabel.set('');
  }

  openVendorDropdown(): void {
    this.isVendorDropdownOpen.set(true);
  }

  selectVendor(vendor: User): void {
    this.propertyForm.get('vendor_id')?.setValue(vendor.id);
    this.vendorSearchTerm.set(vendor.full_name);
    this.selectedVendorLabel.set(`${vendor.full_name} - ${vendor.email}`);
    this.isVendorDropdownOpen.set(false);
  }

  clearVendorSelection(): void {
    this.propertyForm.get('vendor_id')?.setValue('');
    this.vendorSearchTerm.set('');
    this.selectedVendorLabel.set('');
    this.isVendorDropdownOpen.set(false);
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
    script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (!window.google || !window.google.maps || !window.google.maps.places) {
        console.error('Google Maps API script loaded but maps library is unavailable.');
        return;
      }
      this.googleMapsLoaded = true;
      this.tryInitGoogleAutocomplete();
    };
    script.onerror = () => {
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
      fields: ['geometry'],
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place.geometry?.location) {
        const lat = place.geometry.location.lat();
        const lon = place.geometry.location.lng();
        this.ngZone.run(() => {
          this.propertyForm.patchValue({ lat, lon });
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
        this.propertyForm.get('vendor_id')?.valid &&
        this.propertyForm.get('name')?.valid &&
        this.propertyForm.get('type')?.valid &&
        this.propertyForm.get('city_id')?.valid &&
        this.propertyForm.get('location_id')?.valid &&
        this.propertyForm.get('description')?.valid
      );
    }

    if (this.currentStep === 1) {
      return !!(this.propertyForm.get('price_per_night')?.valid && this.propertyForm.get('sale_price')?.valid);
    }

    if (this.currentStep === 2) {
      return true;
    }

    return !!(
      this.propertyForm.get('status')?.valid
    );
  }

  private createPropertyDraft(): void {
    this.isSaving.set(true);

    const payload = this.buildCreatePayload();

    this.propertyService.createProperty(payload).subscribe({
      next: (property) => {
        this.createdPropertyId = property.data.id;
        this.isSaving.set(false);
        this.currentStep = 1;
      },
      error: () => {
        this.isSaving.set(false);
      },
    });
  }

  private updatePropertyDraft(onSuccess?: () => void): void {
    const propertyId = this.createdPropertyId;
    if (!propertyId) {
      return;
    }

    this.isSaving.set(true);

    const payload = this.buildUpdatePayload();
    this.propertyService.updateProperty(propertyId, payload).subscribe({
      next: () => {
        this.isSaving.set(false);
        onSuccess?.();
      },
      error: () => {
        this.isSaving.set(false);
      },
    });
  }

  private uploadMediaAndAdvance(): void {
    const propertyId = this.createdPropertyId;
    if (!propertyId) {
      return;
    }

    this.isSaving.set(true);

    const formData = this.buildMediaFormData();
    this.propertyService.uploadPropertyMedia(propertyId, formData).subscribe({
      next: (response) => {
        const media = response.data?.galleryImages ?? [];
        if (media.length) {
          this.galleryPreviews.set(media);
        }
        if (response.data?.featureImage) {
          this.featureImagePreview.set(response.data.featureImage);
        }
        if (response.data?.coverImage) {
          this.coverImagePreview.set(response.data.coverImage);
        }
        if (response.data?.documents) {
          this.documentPreviews.set(response.data.documents);
        }
        this.isSaving.set(false);
        this.currentStep = 4;
      },
      error: () => {
        this.isSaving.set(false);
      },
    });
  }

  private buildCreatePayload(): CreatePropertyRequest {
    const raw = this.propertyForm.getRawValue();
    return {
      vendor_id: String(raw.vendor_id ?? ''),
      name: String(raw.name ?? '').trim(),
      type: this.normalizePropertyType(raw.type),
      vendor: this.getVendorLabel(String(raw.vendor_id ?? '')),
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

  private buildUpdatePayload(): PropertyUpdateRequest {
    const raw = this.propertyForm.getRawValue();
    return {
      vendor_id: String(raw.vendor_id ?? ''),
      name: String(raw.name ?? '').trim(),
      type: this.normalizePropertyType(raw.type),
      city_id: String(raw.city_id ?? ''),
      location_id: String(raw.location_id ?? ''),
      description: String(raw.description ?? '').trim(),
      price: Number(raw.price_per_night ?? 0),
      price_per_night: Number(raw.price_per_night ?? 0),
      sale_price: Number(raw.sale_price ?? 0),
      is_featured: Boolean(raw.is_featured),
      status: this.normalizePropertyStatus(raw.status),
      amenity_ids: [...(raw.amenity_ids ?? [])],
      facility_ids: [...(raw.facility_ids ?? [])],
      room_type_ids: [...(raw.room_type_ids ?? [])],
      food_option_ids: [...(raw.food_option_ids ?? [])],
      lat: raw.lat,
      lon: raw.lon,
    };
  }

  private buildMediaFormData(): FormData {
    const formData = new FormData();

    this.galleryPreviews().forEach((image, index) => formData.append(`galleryImages[${index}]`, image));

    if (this.featureImagePreview()) {
      formData.append('featureImage', this.featureImagePreview());
    }

    if (this.coverImagePreview()) {
      formData.append('coverImage', this.coverImagePreview());
    }

    this.documentPreviews().forEach((document, index) => formData.append(`documents[${index}]`, document));

    return formData;
  }

  private normalizePropertyType(value: unknown): PropertyRequest['type'] {
    const safeValue = String(value ?? 'hotel');
    return (PROPERTY_TYPES as readonly string[]).includes(safeValue) ? (safeValue as PropertyRequest['type']) : 'hotel';
  }

  private normalizePropertyStatus(value: unknown): PropertyRequest['status'] {
    const safeValue = String(value ?? 'draft');
    return (['draft', 'active', 'inactive'] as const).includes(safeValue as PropertyRequest['status'])
      ? (safeValue as PropertyRequest['status'])
      : 'draft';
  }

  private getVendorLabel(vendorId: string): string {
    return this.vendors().find((vendor) => vendor.id === vendorId)?.full_name ?? '';
  }

  private getCityLabel(cityId: string): string {
    return this.cities().find((city) => city.id === cityId)?.name ?? '';
  }

  private getLocationLabel(locationId: string): string {
    return this.locations().find((location) => location.id === locationId)?.name ?? '';
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
