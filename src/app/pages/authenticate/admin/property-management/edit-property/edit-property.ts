import { CommonModule } from '@angular/common';
import { AfterViewChecked, Component, DestroyRef, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { take } from 'rxjs';
import { AmenityService } from '../../../../../services/amenity/amenity-service';
import { Amenity } from '../../../../../services/amenity/amenity-model';
import { CityService } from '../../../../../services/city/city-service';
import { City } from '../../../../../services/city/city-model';
import { FacilityService } from '../../../../../services/facility/facility-service';
import { Facility } from '../../../../../services/facility/facility-model';
import { LocationService } from '../../../../../services/location/location-service';
import { LocationResponse } from '../../../../../services/location/location-model';
import {
  CreatePropertyRequest,
  PROPERTY_TYPES,
  PROPERTY_TYPES_LABELS,
  PropertyData,
  PropertyRequest,
  PropertyUpdateRequest,
} from '../../../../../services/property/property.model';
import { PropertyService } from '../../../../../services/property/property-service';
import { RoomTypeService } from '../../../../../services/room-type/room-type-service';
import { RoomType } from '../../../../../services/room-type/room-type-model';
import { UserService } from '../../../../../services/user/user-service';
import { User } from '../../../../../services/user/user.model';
import { Card } from '../../../../../shared/components/ui/card/card';
import { UploadImage } from '../../../../../shared/components/common/upload-image/upload-image';
import { environment } from '../../../../../../environments/environment';

@Component({
  selector: 'app-edit-property',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Card, UploadImage],
  templateUrl: './edit-property.html',
})
export class EditProperty implements AfterViewChecked {
  private readonly route = inject(ActivatedRoute);
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

  readonly PROPERTY_TYPES_LABELS = PROPERTY_TYPES_LABELS;
  readonly wizardSteps = ['Property Details', 'Amenities & Facilities', 'Pricing', 'Media', 'Settings'];
  currentStep = 0;

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
  readonly foodOptions = signal([
    { id: 'breakfast', name: 'Breakfast' },
    { id: 'lunch', name: 'Lunch' },
    { id: 'tiffin', name: 'Tiffin' },
    { id: 'dinner', name: 'Dinner' },
  ]);
  readonly galleryPreviews = signal<string[]>([]);
  readonly featureImagePreview = signal('');
  readonly coverImagePreview = signal('');
  readonly galleryFiles = signal<File[]>([]);
  readonly featureImageFile = signal<File | null>(null);
  readonly coverImageFile = signal<File | null>(null);
  readonly documentPreviews = signal<string[]>([]);
  readonly isSaving = signal(false);
  private readonly currencyFormatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  });

  private autocompleteInitialized = false;
  private autocompleteElement?: HTMLInputElement;
  private autocompleteInstance?: any;
  private googleMapsLoaded = false;
  private selectedCityForAutocomplete: string | null = null;
  private propertyId: string | null = null;
  private pendingStepBeforeSave: number | null = null;

  @ViewChild('googleLocationInput', { static: false }) googleLocationInput!: ElementRef<HTMLInputElement>;

  readonly propertyForm = this.formBuilder.group({
    vendor_id: ['', Validators.required],
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

    this.propertyForm.get('city_id')?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((cityId) => {
      this.propertyForm.get('location_id')?.reset('');
      if (cityId) {
        this.loadLocations(cityId);
        return;
      }
      this.locations.set([]);
    });

    this.route.paramMap.subscribe((params) => {
      const idParam = params.get('id');
      if (!idParam) {
        this.router.navigate(['/admin/property-management']);
        return;
      }
      this.loadProperty(idParam);
    });

    this.route.queryParamMap.subscribe((params) => {
      const stepParam = Number(params.get('step'));
      if (!Number.isNaN(stepParam)) {
        this.currentStep = Math.max(0, Math.min(stepParam, this.wizardSteps.length - 1));
      }
    });
  }

  nextStep(): void {
    if (!this.isCurrentStepValid()) {
      this.propertyForm.markAllAsTouched();
      return;
    }

    if (!this.propertyId) {
      return;
    }

    if (this.isSaving()) {
      return;
    }

    const nextStep = Math.min(this.currentStep + 1, this.wizardSteps.length - 1);
    this.pendingStepBeforeSave = this.currentStep;
    this.currentStep = nextStep;
    this.isSaving.set(true);
    this.propertyService.updateProperty(this.propertyId, this.buildUpdatePayload()).subscribe({
      next: () => {
        if (this.pendingStepBeforeSave === 3) {
          this.uploadPropertyMediaAndContinue();
          return;
        }

        this.isSaving.set(false);
        this.pendingStepBeforeSave = null;
      },
      error: () => {
        this.isSaving.set(false);
        if (this.pendingStepBeforeSave !== null) {
          this.currentStep = this.pendingStepBeforeSave;
          this.pendingStepBeforeSave = null;
        }
      },
    });
  }

  previousStep(): void {
    this.currentStep = Math.max(this.currentStep - 1, 0);
  }

  submitPropertyForm(): void {
    if (!this.propertyId) {
      this.propertyForm.markAllAsTouched();
      return;
    }

    if (!this.isCurrentStepValid()) {
      this.propertyForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.propertyService.updateProperty(this.propertyId, this.buildUpdatePayload()).subscribe({
      next: () => {
        this.uploadPropertyMediaAndContinue(true);
      },
      error: () => {
        this.isSaving.set(false);
        this.pendingStepBeforeSave = null;
      },
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
    this.setAutocompleteCityRestriction(city.name);
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
    if (typeof document === 'undefined' || !environment.googleMapsApiKey) {
      return;
    }

    if (window.google && window.google.maps && window.google.maps.places) {
      this.googleMapsLoaded = true;
      this.tryInitGoogleAutocomplete();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google && window.google.maps && window.google.maps.places) {
        this.googleMapsLoaded = true;
        this.tryInitGoogleAutocomplete();
      }
    };
    document.head.appendChild(script);
  }

  private tryInitGoogleAutocomplete(): void {
    if (!this.googleMapsLoaded || typeof document === 'undefined') {
      return;
    }

    const locationInput = this.googleLocationInput?.nativeElement;
    if (!locationInput || !window.google || !window.google.maps || !window.google.maps.places) {
      return;
    }

    if (this.autocompleteInitialized && this.autocompleteElement === locationInput) {
      return;
    }

    const autocomplete = new window.google.maps.places.Autocomplete(locationInput, {
      types: ['geocode'],
      fields: ['geometry', 'formatted_address'],
    });

    autocomplete.addListener('place_changed', () => {
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
        this.propertyForm.patchValue({
          address: place.formatted_address ?? locationInput.value.trim(),
          lat: place.geometry.location.lat(),
          lon: place.geometry.location.lng(),
        });
        this.propertyForm.get('address')?.markAsTouched();
      }
    });

    this.autocompleteInstance = autocomplete;
    this.autocompleteElement = locationInput;
    this.autocompleteInitialized = true;

    if (this.selectedCityForAutocomplete) {
      this.applyCityBoundsToAutocomplete(this.selectedCityForAutocomplete);
    }
  }

  private setAutocompleteCityRestriction(cityName: string): void {
    this.selectedCityForAutocomplete = cityName;
    this.applyCityBoundsToAutocomplete(cityName);
  }

  private clearAutocompleteCityRestriction(): void {
    this.selectedCityForAutocomplete = null;
    if (this.autocompleteInstance?.setBounds) {
      this.autocompleteInstance.setBounds(undefined);
    }
    if (this.autocompleteInstance?.setStrictBounds) {
      this.autocompleteInstance.setStrictBounds(false);
    }
  }

  private applyCityBoundsToAutocomplete(address: string): void {
    if (!window.google || !window.google.maps) {
      return;
    }

    const geocoder = new (window.google.maps as any).Geocoder();
    geocoder.geocode({ address }, (results: any, status: string) => {
      if (status !== 'OK' || !results?.length || !this.autocompleteInstance?.setBounds) {
        return;
      }

      const viewport = results[0].geometry?.viewport;
      if (viewport) {
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

  addGalleryFiles(files: File[]): void {
    if (!files.length) {
      return;
    }

    this.galleryFiles.update((list) => [...list, ...files]);
  }

  handleFeatureImageFile(file: File): void {
    this.featureImageFile.set(file);
  }

  handleFeatureImagePreview(preview: string): void {
    this.propertyForm.get('featureImage')?.setValue(preview);
    this.featureImagePreview.set(preview);
  }

  handleCoverImageFile(file: File): void {
    this.coverImageFile.set(file);
  }

  handleCoverImagePreview(preview: string): void {
    this.propertyForm.get('coverImage')?.setValue(preview);
    this.coverImagePreview.set(preview);
  }

  formatCurrencyInput(controlName: 'price_per_night' | 'sale_price', event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) {
      return;
    }

    const digitsOnly = input.value.replace(/[^\d]/g, '');
    const value = digitsOnly ? Number(digitsOnly) : 0;
    this.propertyForm.get(controlName)?.setValue(value);
    input.value = digitsOnly ? this.currencyFormatter.format(value) : '';
  }

  formatCurrencyOnBlur(controlName: 'price_per_night' | 'sale_price', event: FocusEvent): void {
    const input = event.target as HTMLInputElement | null;
    const value = Number(this.propertyForm.get(controlName)?.value ?? 0);
    if (!input || !value) {
      return;
    }

    input.value = this.currencyFormatter.format(value);
  }

  getFormattedCurrency(controlName: 'price_per_night' | 'sale_price'): string {
    const value = Number(this.propertyForm.get(controlName)?.value ?? 0);
    return value > 0 ? this.currencyFormatter.format(value) : '';
  }

  isSalePriceLessThanNightlyPrice(): boolean {
    const pricePerNight = Number(this.propertyForm.get('price_per_night')?.value ?? 0);
    const salePrice = Number(this.propertyForm.get('sale_price')?.value ?? 0);
    return salePrice >= pricePerNight;
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
        this.propertyForm.get('address')?.valid &&
        this.propertyForm.get('description')?.valid
      );
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

  private loadProperty(id: string): void {
    this.propertyService.getPropertyById(id).subscribe({
      next: (response) => {
        const property = response.data;
        this.propertyId = property.id;
      this.patchPropertyForm(property);
      },
      error: () => this.router.navigate(['/admin/property-management']),
    });
  }

  private patchPropertyForm(property: PropertyData): void {
    const amenityIds = property.property_amenities.map((item) => item.amenity.id);
    const facilityIds = property.property_facilities.map((item) => item.facility.id);
    const roomTypeIds = property.property_room_types.map((item) => item.room_type.id);
    const foodOptionIds = property.property_food_options.filter((item) => item.is_included).map((item) => item.name);

    this.propertyForm.patchValue({
      vendor_id: property.vendor.id,
      name: property.name,
      type: property.type,
      city_id: property.city.id,
      location_id: property.location.id,
      address: property.address ?? '',
      description: property.description,
      price_per_night: property.price_per_night ?? 0,
      sale_price: property.sale_price ?? 0,
      status: this.normalizePropertyStatus(property.status),
      amenity_ids: amenityIds,
      facility_ids: facilityIds,
      room_type_ids: roomTypeIds,
      food_option_ids: foodOptionIds,
      lat: property.latitude ?? null,
      lon: property.longitude ?? null,
    });

    // Set existing gallery images if available
    const galleryImages = (property as any).galleryImages as string[] | undefined;
    if (galleryImages && galleryImages.length > 0) {
      this.galleryPreviews.set(galleryImages);
      this.propertyForm.get('galleryImages')?.setValue(galleryImages);
    }

    // Set existing feature image if available
    const featureImage = (property as any).featureImage as string | undefined;
    if (featureImage) {
      this.featureImagePreview.set(featureImage);
      this.propertyForm.get('featureImage')?.setValue(featureImage);
    }

    // Set existing cover image if available
    const coverImage = (property as any).coverImage as string | undefined;
    if (coverImage) {
      this.coverImagePreview.set(coverImage);
      this.propertyForm.get('coverImage')?.setValue(coverImage);
    }

    this.selectedVendorLabel.set(`${property.vendor.full_name} - ${property.vendor.email}`);
    this.vendorSearchTerm.set(property.vendor.full_name);
    this.selectedCityLabel.set(property.city.name);
    this.citySearchTerm.set(property.city.name);

    this.loadLocations(property.city.id);
  }

  private buildUpdatePayload(): PropertyUpdateRequest {
    const raw = this.propertyForm.getRawValue();
    return {
      vendor_id: String(raw.vendor_id ?? ''),
      name: String(raw.name ?? '').trim(),
      type: this.normalizePropertyType(raw.type),
      city_id: String(raw.city_id ?? ''),
      location_id: String(raw.location_id ?? ''),
      address: String(raw.address ?? '').trim(),
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

  private uploadPropertyMediaAndContinue(navigateAfterUpload = false): void {
    if (!this.propertyId) {
      this.isSaving.set(false);
      this.pendingStepBeforeSave = null;
      if (navigateAfterUpload) {
        this.router.navigate(['/admin/property-management']);
      }
      return;
    }

    const formData = new FormData();
    let hasMedia = false;

    for (const file of this.galleryFiles()) {
      formData.append('gallery_images', file);
      hasMedia = true;
    }

    const featureImage = this.featureImageFile();
    if (featureImage) {
      formData.append('feature_image', featureImage);
      hasMedia = true;
    }

    const coverImage = this.coverImageFile();
    if (coverImage) {
      formData.append('cover_image', coverImage);
      hasMedia = true;
    }

    if (!hasMedia) {
      this.isSaving.set(false);
      this.pendingStepBeforeSave = null;
      if (navigateAfterUpload) {
        this.router.navigate(['/admin/property-management']);
      }
      return;
    }

    this.propertyService.uploadPropertyMedia(this.propertyId, formData).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.pendingStepBeforeSave = null;
        if (navigateAfterUpload) {
          this.router.navigate(['/admin/property-management']);
        }
      },
      error: () => {
        this.isSaving.set(false);
        this.pendingStepBeforeSave = null;
      },
    });
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
