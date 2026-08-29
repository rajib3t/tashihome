import { CommonModule } from '@angular/common';
import { AfterViewChecked, Component, DestroyRef, ElementRef, OnDestroy, ViewChild, computed, inject, signal } from '@angular/core';
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
  PropertyAsset,
  PropertyData,
  PropertyRequest,
  PropertyRoomTypeRequest,
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
export class EditProperty implements AfterViewChecked, OnDestroy {
  public readonly assetUrl = environment.assetUrl;
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
  readonly existingGalleryAssets = signal<PropertyAsset[]>([]);
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
  private autocompleteListener?: google.maps.places.MapsEventListener;
  private googleMapsScript?: HTMLScriptElement;
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
    room_types: this.formBuilder.control<PropertyRoomTypeRequest[]>([]),
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

    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const idParam = params.get('id');
      if (!idParam) {
        this.router.navigate(['/admin/property-management']);
        return;
      }
      this.loadProperty(idParam);
    });

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const stepParam = Number(params.get('step'));
      if (!Number.isNaN(stepParam)) {
        this.currentStep = Math.max(0, Math.min(stepParam, this.wizardSteps.length - 1));
      }
    });
  }

  ngOnDestroy(): void {
    // Google Maps event callbacks outlive the Angular view unless explicitly
    // removed, retaining this component and its form after navigation.
    this.autocompleteListener?.remove();
    this.autocompleteListener = undefined;
    this.autocompleteInstance = undefined;
    this.autocompleteElement = undefined;
    this.autocompleteInitialized = false;

    // A script element is retained by the document until page unload. Clear its
    // handlers so a pending Google Maps download cannot retain this component
    // after the user navigates away.
    if (this.googleMapsScript) {
      this.googleMapsScript.onload = null;
      this.googleMapsScript.onerror = null;
      this.googleMapsScript = undefined;
    }
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
    this.propertyService.admin.updateProperty(this.propertyId, this.buildUpdatePayload()).subscribe({
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
    this.propertyService.admin.updateProperty(this.propertyId, this.buildUpdatePayload()).subscribe({
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
    this.googleMapsScript = script;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      this.googleMapsScript = undefined;
      if (window.google && window.google.maps && window.google.maps.places) {
        this.googleMapsLoaded = true;
        this.tryInitGoogleAutocomplete();
      }
    };
    script.onerror = () => {
      this.googleMapsScript = undefined;
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

  removeGalleryImage(index: number): void {
    const list = this.galleryPreviews();
    if (index < 0 || index >= list.length) {
      return;
    }

    const previewToRemove = list[index];

    // Check if image is an existing asset on backend
    const existingAssets = this.existingGalleryAssets();
    const existingIndex = existingAssets.findIndex((asset) => asset.file_url === previewToRemove);

    if (existingIndex >= 0) {
      const asset = existingAssets[existingIndex];
      this.existingGalleryAssets.update((arr) => arr.filter((_, i) => i !== existingIndex));

      if (this.propertyId && asset.id) {
        this.propertyService.admin.deleteAsset(this.propertyId, asset.id).subscribe({
          error: (err) => console.error('Failed to delete gallery asset from server:', err),
        });
      }
    } else {
      // If it's a newly added file before upload, remove from galleryFiles list
      const newlyAddedPreviews = list.filter(
        (p) => !existingAssets.some((a) => a.file_url === p)
      );
      const newFileIndex = newlyAddedPreviews.indexOf(previewToRemove);
      if (newFileIndex >= 0) {
        this.galleryFiles.update((files) => files.filter((_, i) => i !== newFileIndex));
      }
    }

    // Update gallery previews & form control
    const updatedPreviews = list.filter((_, i) => i !== index);
    this.galleryPreviews.set(updatedPreviews);
    this.propertyForm.get('galleryImages')?.setValue(updatedPreviews);
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

  getRoomTypeRows(): PropertyRoomTypeRequest[] {
    return (this.propertyForm.get('room_types')?.value as PropertyRoomTypeRequest[] | null) ?? [];
  }

  isRoomTypeOptionDisabled(roomTypeId: string, currentRowRoomTypeId: string): boolean {
    if (roomTypeId === currentRowRoomTypeId) {
      return false;
    }
    const currentRows = this.getRoomTypeRows();
    return currentRows.some((row) => row.room_type_id === roomTypeId);
  }

  addRoomTypeRow(): void {
    const control = this.propertyForm.get('room_types');
    if (!control) {
      return;
    }

    const current: PropertyRoomTypeRequest[] = [...((control.value as PropertyRoomTypeRequest[] | null) ?? [])];
    const usedIds = new Set(current.map((r) => r.room_type_id));
    const available = this.roomTypes().find((rt) => !usedIds.has(rt.id));

    current.push({
      room_type_id: available ? available.id : (this.roomTypes()[0]?.id ?? ''),
      total_units: 1,
    });

    control.setValue(current);
    this.propertyForm.markAsDirty();
  }

  removeRoomTypeRow(index: number): void {
    const control = this.propertyForm.get('room_types');
    if (!control) {
      return;
    }

    const current: PropertyRoomTypeRequest[] = [...((control.value as PropertyRoomTypeRequest[] | null) ?? [])];
    if (index >= 0 && index < current.length) {
      current.splice(index, 1);
      control.setValue(current);
      this.propertyForm.markAsDirty();
    }
  }

  onRoomTypeRowChange(index: number, newRoomTypeId: string): void {
    const control = this.propertyForm.get('room_types');
    if (!control) {
      return;
    }

    const current: PropertyRoomTypeRequest[] = [...((control.value as PropertyRoomTypeRequest[] | null) ?? [])];
    if (index >= 0 && index < current.length) {
      current[index] = { ...current[index], room_type_id: newRoomTypeId };
      control.setValue(current);
      this.propertyForm.markAsDirty();
    }
  }

  onRoomTypeRowUnitsInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const val = parseInt(input.value, 10);
    this.updateRoomTypeRowUnits(index, isNaN(val) ? 1 : val);
  }

  updateRoomTypeRowUnits(index: number, units: number): void {
    const control = this.propertyForm.get('room_types');
    if (!control) {
      return;
    }

    const safeUnits = Math.max(1, Math.floor(units || 1));
    const current: PropertyRoomTypeRequest[] = [...((control.value as PropertyRoomTypeRequest[] | null) ?? [])];
    if (index >= 0 && index < current.length) {
      current[index] = { ...current[index], total_units: safeUnits };
      control.setValue(current);
      this.propertyForm.markAsDirty();
    }
  }

  incrementRoomTypeRowUnits(index: number): void {
    const currentRows = this.getRoomTypeRows();
    if (index >= 0 && index < currentRows.length) {
      this.updateRoomTypeRowUnits(index, (currentRows[index].total_units || 1) + 1);
    }
  }

  decrementRoomTypeRowUnits(index: number): void {
    const currentRows = this.getRoomTypeRows();
    if (index >= 0 && index < currentRows.length && currentRows[index].total_units > 1) {
      this.updateRoomTypeRowUnits(index, currentRows[index].total_units - 1);
    }
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
    this.propertyService.admin.getPropertyById(id).subscribe({
      next: (response) => {
        const property = response.data;
        this.propertyId = property.id;
      this.patchPropertyForm(property);
      },
      error: () => this.router.navigate(['/admin/property-management']),
    });
  }

  private patchPropertyForm(property: PropertyData): void {
    const amenityIds = property.property_amenities?.map((item) => item.amenity?.id ?? (item as any).amenity_id ?? item.id).filter(Boolean) ?? [];
    const facilityIds = property.property_facilities?.map((item) => item.facility?.id ?? (item as any).facility_id ?? item.id).filter(Boolean) ?? [];

    const roomTypes: PropertyRoomTypeRequest[] = [];
    if (property.property_room_types && Array.isArray(property.property_room_types) && property.property_room_types.length > 0) {
      for (const item of property.property_room_types) {
        const id = item.room_type?.id || (item as any).room_type_id || (typeof item === 'string' ? item : (item as any).id);
        const units = Number(item.total_units || (item as any).units || (item as any).count || 1);
        if (id) {
          roomTypes.push({
            room_type_id: String(id),
            total_units: units > 0 ? units : 1,
          });
        }
      }
    } else if ((property as any).room_types && Array.isArray((property as any).room_types) && (property as any).room_types.length > 0) {
      for (const item of (property as any).room_types) {
        if (typeof item === 'string') {
          roomTypes.push({ room_type_id: item, total_units: 1 });
        } else if (item && typeof item === 'object') {
          const id = item.room_type_id || item.room_type?.id || item.id;
          const units = Number(item.total_units || item.units || item.count || 1);
          if (id) {
            roomTypes.push({
              room_type_id: String(id),
              total_units: units > 0 ? units : 1,
            });
          }
        }
      }
    } else if ((property as any).room_type_ids && Array.isArray((property as any).room_type_ids) && (property as any).room_type_ids.length > 0) {
      for (const id of (property as any).room_type_ids) {
        if (id) {
          roomTypes.push({ room_type_id: String(id), total_units: 1 });
        }
      }
    } else if (property.room_type?.id) {
      roomTypes.push({ room_type_id: String(property.room_type.id), total_units: 1 });
    }
    const foodOptionIds = property.property_food_options?.filter((item) => item.is_included).map((item) => item.name) ?? [];

    this.propertyForm.patchValue({
      vendor_id: property.vendor?.id ?? '',
      name: property.name ?? '',
      type: property.type,
      city_id: property.city?.id ?? '',
      location_id: property.location?.id ?? '',
      address: property.address ?? '',
      description: property.description ?? '',
      price_per_night: property.price_per_night ?? 0,
      sale_price: property.sale_price ?? property.sale_per_night ?? 0,
      is_featured: property.is_featured ?? false,
      status: this.normalizePropertyStatus(property.status),
      amenity_ids: amenityIds,
      facility_ids: facilityIds,
      room_types: roomTypes,
      food_option_ids: foodOptionIds,
      lat: property.latitude ?? null,
      lon: property.longitude ?? null,
    });

    // Extract gallery image URLs from gallery_images, property_assets, or legacy galleryImages
    const galleryUrls: string[] = [];
    const galleryAssets: PropertyAsset[] = [];
    if (property.gallery_images && Array.isArray(property.gallery_images) && property.gallery_images.length > 0) {
      for (const item of property.gallery_images) {
        if (typeof item === 'string') {
          galleryUrls.push(item);
        } else if (item && typeof item === 'object' && item.file_url) {
          galleryUrls.push(item.file_url);
          galleryAssets.push(item);
        }
      }
    } else if ((property as any).galleryImages && Array.isArray((property as any).galleryImages)) {
      galleryUrls.push(...(property as any).galleryImages);
    } else if (property.property_assets && Array.isArray(property.property_assets)) {
      for (const asset of property.property_assets) {
        if (asset.use_for === 'gallery' && asset.file_url) {
          galleryUrls.push(asset.file_url);
          galleryAssets.push(asset);
        }
      }
    }

    this.existingGalleryAssets.set(galleryAssets);

    if (galleryUrls.length > 0) {
      this.galleryPreviews.set(galleryUrls);
      this.propertyForm.get('galleryImages')?.setValue(galleryUrls);
    }

    // Extract feature image URL from feature_image, property_assets, or legacy featureImage
    let featureUrl = '';
    if (property.feature_image) {
      featureUrl = typeof property.feature_image === 'string' ? property.feature_image : (property.feature_image.file_url ?? '');
    } else if ((property as any).featureImage) {
      featureUrl = String((property as any).featureImage);
    } else if (property.property_assets && Array.isArray(property.property_assets)) {
      const asset = property.property_assets.find((a) => a.use_for === 'feature');
      if (asset?.file_url) {
        featureUrl = asset.file_url;
      }
    }

    if (featureUrl) {
      this.featureImagePreview.set(this.assetUrl + featureUrl);
      this.propertyForm.get('featureImage')?.setValue(featureUrl);
    }

    // Extract cover image URL from cover_image, property_assets, or legacy coverImage
    let coverUrl = '';
    if (property.cover_image) {
      coverUrl = typeof property.cover_image === 'string' ? property.cover_image : (property.cover_image.file_url ?? '');
    } else if ((property as any).coverImage) {
      coverUrl = String((property as any).coverImage);
    } else if (property.property_assets && Array.isArray(property.property_assets)) {
      const asset = property.property_assets.find((a) => a.use_for === 'cover');
      if (asset?.file_url) {
        coverUrl = asset.file_url;
      }
    }

    if (coverUrl) {
      this.coverImagePreview.set(this.assetUrl + coverUrl);
      this.propertyForm.get('coverImage')?.setValue(coverUrl);
    }

    if (property.vendor) {
      this.selectedVendorLabel.set(`${property.vendor.full_name} - ${property.vendor.email}`);
      this.vendorSearchTerm.set(property.vendor.full_name);
    }
    if (property.city) {
      this.selectedCityLabel.set(property.city.name);
      this.citySearchTerm.set(property.city.name);
      this.loadLocations(property.city.id);
    }
  }

  private buildUpdatePayload(): PropertyUpdateRequest {
    const raw = this.propertyForm.getRawValue();
    const roomTypes: PropertyRoomTypeRequest[] = ((raw.room_types as PropertyRoomTypeRequest[] | null) ?? [])
      .filter((rt) => !!rt.room_type_id?.trim())
      .map((rt) => ({
        room_type_id: rt.room_type_id.trim(),
        total_units: Math.max(1, Number(rt.total_units) || 1),
      }));

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
      room_types: roomTypes,
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

    this.propertyService.admin.uploadMedia(this.propertyId, formData).subscribe({
      next: () => {
        // Clear files after upload to prevent re-uploading on final submit
        this.galleryFiles.set([]);
        this.featureImageFile.set(null);
        this.coverImageFile.set(null);
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
    this.cityService.admin.getCities({ page: 1, size: 100 }).pipe(take(1)).subscribe({
      next: (response) => this.cities.set(response.data),
      error: () => this.cities.set([]),
    });
  }

  private loadAmenities(): void {
    this.amenityService.admin.getAmenities({ page: 1, size: 100 }).pipe(take(1)).subscribe({
      next: (response) => this.amenities.set(response.data),
      error: () => this.amenities.set([]),
    });
  }

  private loadFacilities(): void {
    this.facilityService.admin.getFacilities({ page: 1, size: 100 }).pipe(take(1)).subscribe({
      next: (response) => this.facilities.set(response.data),
      error: () => this.facilities.set([]),
    });
  }

  private loadRoomTypes(): void {
    this.roomTypeService.admin.getRoomTypes({ page: 1, size: 100 }).pipe(take(1)).subscribe({
      next: (response) => this.roomTypes.set(response.data),
      error: () => this.roomTypes.set([]),
    });
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
