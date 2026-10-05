import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, NgZone, OnInit, OnDestroy, AfterViewChecked, signal, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { take } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CreatePropertyRequest, PROPERTY_TYPES, PropertyRequest, PROPERTY_TYPES_LABELS, PropertyRoomTypeRequest } from '../../../../../services/property/property.model';
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
import { applyPropertyFormErrors, countWords, descriptionContentValidator, maxWordsValidator } from '../../../../../core/validators/word-validators';

@Component({
  selector: 'app-create-property',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Card],
  templateUrl: './create-property.html',
})
export class CreateProperty implements OnInit, AfterViewChecked, OnDestroy {
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
  private autocompleteListener?: google.maps.places.MapsEventListener;
  private googleMapsScript?: HTMLScriptElement;
  private googleMapsLoaded = false;
  private selectedCityForAutocomplete: string | null = null;
  private createdPropertyId: string | null = null;
  public readonly PROPERTY_TYPES_LABELS = PROPERTY_TYPES_LABELS;
  @ViewChild('googleLocationInput', { static: false }) googleLocationInput!: ElementRef<HTMLInputElement>;

  readonly propertyForm = this.formBuilder.group({
    vendor_id: ['', Validators.required],
    name: ['', [Validators.required, Validators.minLength(3)]],
    type: ['home_stay' as CreatePropertyRequest['type'], Validators.required],
    city_id: ['', Validators.required],
    location_id: ['', Validators.required],
    address_line1: ['', [Validators.required, Validators.minLength(3)]],
    address_line2: [''],
    postal_code: ['', [Validators.required, Validators.pattern(/^[0-9]{6}$/)]],
    country: ['India', Validators.required],
    address: [''],
    description: ['', [Validators.required, Validators.minLength(20), maxWordsValidator(150), descriptionContentValidator()]],
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
    room_types: this.formBuilder.control<PropertyRoomTypeRequest[]>([]),
    food_option_ids: this.formBuilder.control<string[]>([]),
    lat: [null as number | null, [Validators.min(-90), Validators.max(90)]],
    lon: [null as number | null, [Validators.min(-180), Validators.max(180)]],
  });
  readonly maxDescriptionWords = 150;
  readonly serverErrorMessage = signal<string | null>(null);

  getDescriptionWordCount(): number {
    return countWords(this.propertyForm.get('description')?.value);
  }
  foodOptions = signal([
    { id: 'lunch', name: 'Lunch' },
    { id: 'evening_snacks', name: 'Evening Snacks' },
    { id: 'dinner', name: 'Dinner' },
    { id: 'breakfast', name: 'Breakfast' },
  ]);
  ngAfterViewChecked(): void {
    this.tryInitGoogleAutocomplete();
  }

  ngOnInit(): void {
    this.loadVendors();
    this.loadCities();
    this.loadAttributesForVendor(null);
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
    // Google Maps keeps event callbacks independently of Angular. Removing this
    // listener prevents its closure from retaining the destroyed form component.
    this.autocompleteListener?.remove();
    this.autocompleteListener = undefined;
    this.autocompleteInstance = undefined;
    this.autocompleteElement = undefined;
    this.autocompleteInitialized = false;

    // The document retains injected scripts. Detach callbacks to avoid a
    // pending Maps download retaining this destroyed component instance.
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
    this.router.navigate(['/admin/property-management']);
  }

  onVendorSearchChange(term: string): void {
    this.vendorSearchTerm.set(term);
    this.isVendorDropdownOpen.set(true);
    if (this.propertyForm.get('vendor_id')?.value) {
      this.propertyForm.get('vendor_id')?.setValue('');
      this.selectedVendorLabel.set('');
      this.loadAttributesForVendor(null);
    }
  }

  openVendorDropdown(): void {
    this.isVendorDropdownOpen.set(true);
  }

  selectVendor(vendor: User): void {
    this.propertyForm.get('vendor_id')?.setValue(vendor.id);
    this.vendorSearchTerm.set(vendor.full_name);
    this.selectedVendorLabel.set(`${vendor.full_name} - ${vendor.email}`);
    this.isVendorDropdownOpen.set(false);
    this.loadAttributesForVendor(vendor.id);
  }

  clearVendorSelection(): void {
    this.propertyForm.get('vendor_id')?.setValue('');
    this.vendorSearchTerm.set('');
    this.selectedVendorLabel.set('');
    this.isVendorDropdownOpen.set(false);
    this.loadAttributesForVendor(null);
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
        const fullAddr = place.formatted_address ?? locationInput.value.trim();
        const lat = parseFloat(place.geometry.location.lat().toFixed(6));
        const lon = parseFloat(place.geometry.location.lng().toFixed(6));
        this.ngZone.run(() => {
          const currentLine1 = this.propertyForm.get('address_line1')?.value;
          this.propertyForm.patchValue({
            address: fullAddr,
            address_line1: currentLine1 ? currentLine1 : fullAddr,
            lat,
            lon,
          });
          this.propertyForm.get('address')?.markAsTouched();
          this.propertyForm.get('address_line1')?.markAsTouched();
          this.propertyForm.get('lat')?.markAsTouched();
          this.propertyForm.get('lon')?.markAsTouched();
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

  toggleSelection(controlName: 'amenity_ids' | 'facility_ids' | 'food_option_ids', id: string): void {
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

  isSelectionChecked(controlName: 'amenity_ids' | 'facility_ids' | 'food_option_ids', id: string): boolean {
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
        this.propertyForm.get('address_line1')?.valid &&
        this.propertyForm.get('postal_code')?.valid &&
        this.propertyForm.get('lat')?.valid &&
        this.propertyForm.get('lon')?.valid &&
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
    this.serverErrorMessage.set(null);
    this.isSaving.set(true);

    const payload = this.buildCreatePayload();

    this.propertyService.admin.createProperty(payload).subscribe({
      next: (property) => {
        this.createdPropertyId = property.data?.id ?? null;
        this.isSaving.set(false);
        if (!this.createdPropertyId) {
          return;
        }

        if (continueToEdit) {
          this.router.navigate([`/admin/property-management/${this.createdPropertyId}/edit`], {
            queryParams: { step: 1 },
          });
          return;
        }

        this.router.navigate(['/admin/property-management']);
      },
      error: (err) => {
        this.isSaving.set(false);
        applyPropertyFormErrors(this.propertyForm, err, (msg) => this.serverErrorMessage.set(msg));
      },
    });
  }

  private buildCreatePayload(): CreatePropertyRequest {
    const raw = this.propertyForm.getRawValue();

    const addressLine1 = String(raw.address_line1 ?? '').trim();
    const addressLine2 = String(raw.address_line2 ?? '').trim();
    const postalCode = String(raw.postal_code ?? '').trim();
    const country = String(raw.country ?? 'India').trim();

    const addressParts = [addressLine1, addressLine2, postalCode, country].filter(Boolean);
    const combinedAddress = addressParts.join(', ');

    const latVal = raw.lat !== null && raw.lat !== undefined && !isNaN(Number(raw.lat)) ? Number(raw.lat) : undefined;
    const lonVal = raw.lon !== null && raw.lon !== undefined && !isNaN(Number(raw.lon)) ? Number(raw.lon) : undefined;

    return {
      vendor_id: String(raw.vendor_id ?? ''),
      name: String(raw.name ?? '').trim(),
      type: this.normalizePropertyType(raw.type),
      vendor: this.getVendorLabel(String(raw.vendor_id ?? '')),
      city: this.getCityLabel(String(raw.city_id ?? '')),
      location: this.getLocationLabel(String(raw.location_id ?? '')),
      address: combinedAddress || String(raw.address ?? '').trim(),
      address_line1: addressLine1,
      address_line2: addressLine2 || undefined,
      postal_code: postalCode,
      country: country,
      manual_address: {
        address_line1: addressLine1,
        address_line2: addressLine2 || null,
        postal_code: postalCode,
        country: country,
      },
      latitude: latVal,
      longitude: lonVal,
      geolocation: latVal !== undefined && lonVal !== undefined ? { latitude: latVal, longitude: lonVal } : undefined,
      city_id: String(raw.city_id ?? ''),
      location_id: String(raw.location_id ?? ''),
      description: String(raw.description ?? '').trim(),
    };
  }

  private normalizePropertyType(value: unknown): PropertyRequest['type'] {
    const safeValue = String(value ?? 'hotel');
    return (PROPERTY_TYPES as readonly string[]).includes(safeValue) ? (safeValue as PropertyRequest['type']) : 'hotel';
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
    this.cityService.admin.getCities({ page: 1, size: 100 }).pipe(take(1)).subscribe({
      next: (response) => this.cities.set(response.data),
      error: () => this.cities.set([]),
    });
  }

  private loadAttributesForVendor(vendorId?: string | null): void {
    this.loadAmenities(vendorId);
    this.loadFacilities(vendorId);
    this.loadRoomTypes(vendorId);
  }

  private loadAmenities(vendorId?: string | null): void {
    const params = vendorId
      ? { page: 1, size: 100, scope: 'vendor_combined', vendor_id: vendorId }
      : { page: 1, size: 100, scope: 'global' };

    this.amenityService.admin.getAmenities(params).pipe(take(1)).subscribe({
      next: (response) => {
        const items = response.data ?? [];
        this.amenities.set(items);
        this.pruneSelectedAmenities(items);
      },
      error: () => this.amenities.set([]),
    });
  }

  private loadFacilities(vendorId?: string | null): void {
    const params = vendorId
      ? { page: 1, size: 100, scope: 'vendor_combined', vendor_id: vendorId }
      : { page: 1, size: 100, scope: 'global' };

    this.facilityService.admin.getFacilities(params).pipe(take(1)).subscribe({
      next: (response) => {
        const items = response.data ?? [];
        this.facilities.set(items);
        this.pruneSelectedFacilities(items);
      },
      error: () => this.facilities.set([]),
    });
  }

  private loadRoomTypes(vendorId?: string | null): void {
    const params = vendorId
      ? { page: 1, size: 100, scope: 'vendor_combined', vendor_id: vendorId }
      : { page: 1, size: 100, scope: 'global' };

    this.roomTypeService.admin.getRoomTypes(params).pipe(take(1)).subscribe({
      next: (response) => {
        const items = response.data ?? [];
        this.roomTypes.set(items);
        this.pruneSelectedRoomTypes(items);
      },
      error: () => this.roomTypes.set([]),
    });
  }

  private pruneSelectedAmenities(available: Amenity[]): void {
    const control = this.propertyForm.get('amenity_ids');
    if (!control || !Array.isArray(control.value)) return;
    const availableIds = new Set(available.map((a) => a.id));
    const valid = control.value.filter((id: string) => availableIds.has(id));
    if (valid.length !== control.value.length) {
      control.setValue(valid);
    }
  }

  private pruneSelectedFacilities(available: Facility[]): void {
    const control = this.propertyForm.get('facility_ids');
    if (!control || !Array.isArray(control.value)) return;
    const availableIds = new Set(available.map((f) => f.id));
    const valid = control.value.filter((id: string) => availableIds.has(id));
    if (valid.length !== control.value.length) {
      control.setValue(valid);
    }
  }

  private pruneSelectedRoomTypes(available: RoomType[]): void {
    const control = this.propertyForm.get('room_types');
    if (!control || !Array.isArray(control.value)) return;
    const availableIds = new Set(available.map((rt) => rt.id));
    const valid = control.value.filter((rt: PropertyRoomTypeRequest) => availableIds.has(rt.room_type_id));
    if (valid.length !== control.value.length) {
      control.setValue(valid);
    }
  }

  private loadLocations(cityId: string): void {
    this.loadingLocations.set(true);
    this.locationService.admin.getLocations({ page: 1, size: 100, search: { city_id: cityId } }).pipe(take(1)).subscribe({
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
