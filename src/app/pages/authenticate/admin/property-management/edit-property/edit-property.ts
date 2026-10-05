import { CommonModule } from '@angular/common';
import { AfterViewChecked, ChangeDetectorRef, Component, DestroyRef, ElementRef, OnDestroy, ViewChild, computed, inject, signal } from '@angular/core';
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
  PropertyRoomTypePrice,
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
import { applyPropertyFormErrors, countWords, descriptionContentValidator, maxWordsValidator } from '../../../../../core/validators/word-validators';

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
  private readonly cdr = inject(ChangeDetectorRef);

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
    { id: 'lunch', name: 'Lunch' },
    { id: 'evening_snacks', name: 'Evening Snacks' },
    { id: 'dinner', name: 'Dinner' },
    { id: 'breakfast', name: 'Breakfast' },
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

  ngAfterViewChecked(): void {
    this.tryInitGoogleAutocomplete();
  }

  ngOnInit(): void {
    this.loadVendors();
    this.loadCities();
    this.loadAttributesForVendor(null);
    this.loadGoogleMapsScript();

    this.propertyForm.get('city_id')?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((cityId) => {
      if (this.propertyForm.get('city_id')?.dirty) {
        this.propertyForm.get('location_id')?.reset('');
      }
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
      const rawStep = params.get('step');
      if (rawStep !== null && rawStep !== undefined && rawStep !== '') {
        const stepNum = Number(rawStep);
        if (!Number.isNaN(stepNum)) {
          this.currentStep = Math.max(0, Math.min(stepNum, this.wizardSteps.length - 1));
        } else {
          const stepMap: Record<string, number> = {
            basic_info: 0,
            details: 0,
            room_types: 1,
            amenities: 1,
            facilities: 1,
            pricing: 2,
            media: 3,
            settings: 4,
            policies: 4,
          };
          if (stepMap[rawStep] !== undefined) {
            this.currentStep = stepMap[rawStep];
          }
        }
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

  goToStep(stepIndex: number): void {
    if (stepIndex === this.currentStep || stepIndex < 0 || stepIndex >= this.wizardSteps.length) {
      return;
    }

    if (this.isSaving()) {
      return;
    }

    const previousStep = this.currentStep;
    const canSave = this.isCurrentStepValid() && !!this.propertyId;

    this.currentStep = stepIndex;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { step: stepIndex },
      queryParamsHandling: 'merge',
    });

    if (canSave && this.propertyId) {
      this.pendingStepBeforeSave = previousStep;
      this.serverErrorMessage.set(null);
      this.isSaving.set(true);
      this.propertyService.admin.updateProperty(this.propertyId, this.buildUpdatePayload()).subscribe({
        next: (response) => {
          if (response?.data) {
            this.patchPropertyForm(response.data);
          }
          if (this.pendingStepBeforeSave === 3) {
            this.uploadPropertyMediaAndContinue();
            return;
          }
          this.isSaving.set(false);
          this.pendingStepBeforeSave = null;
        },
        error: (err) => {
          this.isSaving.set(false);
          if (this.pendingStepBeforeSave !== null) {
            this.currentStep = this.pendingStepBeforeSave;
            this.pendingStepBeforeSave = null;
          }
          applyPropertyFormErrors(this.propertyForm, err, (msg) => this.serverErrorMessage.set(msg));
        },
      });
    }
  }

  isWizardStepCompleted(stepIndex: number): boolean {
    switch (stepIndex) {
      case 0:
        return !!(
          this.propertyForm.get('vendor_id')?.value &&
          this.propertyForm.get('name')?.value &&
          this.propertyForm.get('type')?.value &&
          this.propertyForm.get('city_id')?.value &&
          this.propertyForm.get('location_id')?.value &&
          this.propertyForm.get('address_line1')?.value &&
          this.propertyForm.get('postal_code')?.value &&
          this.propertyForm.get('description')?.value &&
          this.propertyForm.get('vendor_id')?.valid &&
          this.propertyForm.get('name')?.valid &&
          this.propertyForm.get('address_line1')?.valid &&
          this.propertyForm.get('postal_code')?.valid &&
          this.propertyForm.get('description')?.valid
        );
      case 1: {
        const hasRooms = ((this.propertyForm.get('room_types')?.value as any[]) ?? []).length > 0;
        const hasAmenities = ((this.propertyForm.get('amenity_ids')?.value as any[]) ?? []).length > 0;
        const hasFacilities = ((this.propertyForm.get('facility_ids')?.value as any[]) ?? []).length > 0;
        return hasRooms || hasAmenities || hasFacilities;
      }
      case 2:
        return Number(this.propertyForm.get('price_per_night')?.value ?? 0) > 0;
      case 3:
        return (
          this.galleryPreviews().length > 0 ||
          Boolean(this.featureImagePreview()) ||
          Boolean(this.coverImagePreview())
        );
      case 4:
        return !!this.propertyForm.get('status')?.value;
      default:
        return false;
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
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { step: this.currentStep },
      queryParamsHandling: 'merge',
    });
    this.serverErrorMessage.set(null);
    this.isSaving.set(true);
    this.propertyService.admin.updateProperty(this.propertyId, this.buildUpdatePayload()).subscribe({
      next: (response) => {
        if (response?.data) {
          this.patchPropertyForm(response.data);
        }
        if (this.pendingStepBeforeSave === 3) {
          this.uploadPropertyMediaAndContinue();
          return;
        }

        this.isSaving.set(false);
        this.pendingStepBeforeSave = null;
      },
      error: (err) => {
        this.isSaving.set(false);
        if (this.pendingStepBeforeSave !== null) {
          this.currentStep = this.pendingStepBeforeSave;
          this.pendingStepBeforeSave = null;
        }
        applyPropertyFormErrors(this.propertyForm, err, (msg) => this.serverErrorMessage.set(msg));
      },
    });
  }

  previousStep(): void {
    this.currentStep = Math.max(this.currentStep - 1, 0);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { step: this.currentStep },
      queryParamsHandling: 'merge',
    });
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

    this.serverErrorMessage.set(null);
    this.isSaving.set(true);
    this.propertyService.admin.updateProperty(this.propertyId, this.buildUpdatePayload()).subscribe({
      next: (response) => {
        if (response?.data) {
          this.patchPropertyForm(response.data);
        }
        this.uploadPropertyMediaAndContinue(true);
      },
      error: (err) => {
        this.isSaving.set(false);
        this.pendingStepBeforeSave = null;
        applyPropertyFormErrors(this.propertyForm, err, (msg) => this.serverErrorMessage.set(msg));
      },
    });
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
        const fullAddr = place.formatted_address ?? locationInput.value.trim();
        const lat = parseFloat(place.geometry.location.lat().toFixed(6));
        const lon = parseFloat(place.geometry.location.lng().toFixed(6));
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
    if (!Array.isArray(control?.value)) {
      return false;
    }
    if (controlName === 'food_option_ids' && id === 'evening_snacks') {
      return control.value.includes('evening_snacks') || control.value.includes('tiffin');
    }
    return control.value.includes(id);
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
      const newCapacity = Math.max(1, this.getRoomTypeCapacity(newRoomTypeId));
      const row = current[index];
      // Prune tiers that exceed the new room type's max capacity
      const updatedTiers = (row.pricing_tiers ?? []).filter((t) => Number(t.occupancy) <= newCapacity);
      current[index] = { ...row, room_type_id: newRoomTypeId, pricing_tiers: updatedTiers };
      control.setValue(current);
      this.propertyForm.markAsDirty();
      this.cdr.markForCheck();
    }
  }

  decrementRoomTypeRowUnits(index: number): void {
    const rows = this.getRoomTypeRows();
    const currentUnits = rows[index]?.total_units ?? 1;
    this.updateRoomTypeRowUnits(index, Math.max(1, currentUnits - 1));
  }

  incrementRoomTypeRowUnits(index: number): void {
    const rows = this.getRoomTypeRows();
    const currentUnits = rows[index]?.total_units ?? 1;
    this.updateRoomTypeRowUnits(index, currentUnits + 1);
  }

  onRoomTypeRowUnitsInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const value = parseInt(input?.value ?? '1', 10);
    this.updateRoomTypeRowUnits(index, isNaN(value) || value < 1 ? 1 : value);
  }

  updateRoomTypeRowUnits(index: number, units: number): void {
    const control = this.propertyForm.get('room_types');
    if (!control) {
      return;
    }

    const current: PropertyRoomTypeRequest[] = [...((control.value as PropertyRoomTypeRequest[] | null) ?? [])];
    if (index >= 0 && index < current.length) {
      current[index] = { ...current[index], total_units: Math.max(1, units) };
      control.setValue(current);
      this.propertyForm.markAsDirty();
    }
  }

  getRoomTypeCapacity(roomTypeId: string): number {
    const matched = this.roomTypes().find((rt) => rt.id === roomTypeId);
    return matched?.capacity || 4;
  }

  getRoomTypeName(roomTypeId: string): string {
    const matched = this.roomTypes().find((rt) => rt.id === roomTypeId);
    return matched?.name || 'Room';
  }

  updateRoomTypeBasePrice(index: number, price: number): void {
    const control = this.propertyForm.get('room_types');
    if (!control) return;

    const current: PropertyRoomTypeRequest[] = [...((control.value as PropertyRoomTypeRequest[] | null) ?? [])];
    if (index >= 0 && index < current.length) {
      current[index] = { ...current[index], price_per_night: Math.max(0, Number(price) || 0) };
      control.setValue(current);
      this.propertyForm.markAsDirty();
    }
  }

  updateRoomTypeSalePrice(index: number, salePrice: number): void {
    const control = this.propertyForm.get('room_types');
    if (!control) return;

    const current: PropertyRoomTypeRequest[] = [...((control.value as PropertyRoomTypeRequest[] | null) ?? [])];
    if (index >= 0 && index < current.length) {
      const val = Number(salePrice);
      current[index] = { ...current[index], sale_per_night: val > 0 ? val : undefined };
      control.setValue(current);
      this.propertyForm.markAsDirty();
    }
  }

  getOccupancyOptions(roomTypeId: string, currentOccupancy: number = 1): number[] {
    const capacity = Math.max(1, this.getRoomTypeCapacity(roomTypeId));
    const options: number[] = [];
    for (let c = 1; c <= capacity; c++) {
      options.push(c);
    }
    return options;
  }

  getPricingTiers(roomTypeIndex: number): PropertyRoomTypePrice[] {
    const rows = this.getRoomTypeRows();
    return rows[roomTypeIndex]?.pricing_tiers ?? [];
  }

  canAddPricingTier(roomTypeIndex: number): boolean {
    const rows = this.getRoomTypeRows();
    const row = rows[roomTypeIndex];
    if (!row?.room_type_id) return false;
    const capacity = Math.max(1, this.getRoomTypeCapacity(row.room_type_id));
    const tiers = row.pricing_tiers ?? [];
    return tiers.length < capacity;
  }

  addPricingTier(roomTypeIndex: number): void {
    const control = this.propertyForm.get('room_types');
    if (!control) return;

    const current: PropertyRoomTypeRequest[] = [...((control.value as PropertyRoomTypeRequest[] | null) ?? [])];
    if (roomTypeIndex < 0 || roomTypeIndex >= current.length) return;

    const row = current[roomTypeIndex];
    const capacity = Math.max(1, this.getRoomTypeCapacity(row.room_type_id));
    const existingTiers = [...(row.pricing_tiers ?? [])];
    const usedOccupancies = new Set(existingTiers.map((t) => Number(t.occupancy)));

    let nextOccupancy: number | null = null;
    for (let i = 1; i <= capacity; i++) {
      if (!usedOccupancies.has(i)) {
        nextOccupancy = i;
        break;
      }
    }

    if (nextOccupancy === null) {
      return;
    }

    const defaultPrice = row.price_per_night || Number(this.propertyForm.get('price_per_night')?.value) || 1500;
    const defaultSale = row.sale_per_night || Number(this.propertyForm.get('sale_price')?.value) || 0;

    existingTiers.push({
      occupancy: nextOccupancy,
      price_per_night: defaultPrice,
      sale_per_night: defaultSale > 0 ? defaultSale : undefined,
    });

    existingTiers.sort((a, b) => a.occupancy - b.occupancy);
    current[roomTypeIndex] = { ...row, pricing_tiers: existingTiers };
    control.setValue(current);
    this.propertyForm.markAsDirty();
    this.cdr.markForCheck();
  }

  removePricingTier(roomTypeIndex: number, tierIndex: number): void {
    const control = this.propertyForm.get('room_types');
    if (!control) return;

    const current: PropertyRoomTypeRequest[] = [...((control.value as PropertyRoomTypeRequest[] | null) ?? [])];
    if (roomTypeIndex < 0 || roomTypeIndex >= current.length) return;

    const row = current[roomTypeIndex];
    const existingTiers = [...(row.pricing_tiers ?? [])];
    if (tierIndex >= 0 && tierIndex < existingTiers.length) {
      existingTiers.splice(tierIndex, 1);
      current[roomTypeIndex] = { ...row, pricing_tiers: existingTiers };
      control.setValue(current);
      this.propertyForm.markAsDirty();
      this.cdr.markForCheck();
    }
  }

  updateTierOccupancy(roomTypeIndex: number, tierIndex: number, occupancy: number): void {
    const control = this.propertyForm.get('room_types');
    if (!control) return;

    const current: PropertyRoomTypeRequest[] = [...((control.value as PropertyRoomTypeRequest[] | null) ?? [])];
    if (roomTypeIndex < 0 || roomTypeIndex >= current.length) return;

    const row = current[roomTypeIndex];
    const capacity = Math.max(1, this.getRoomTypeCapacity(row.room_type_id));
    const existingTiers = [...(row.pricing_tiers ?? [])];
    if (tierIndex >= 0 && tierIndex < existingTiers.length) {
      const clampedOccupancy = Math.max(1, Math.min(capacity, Number(occupancy) || 1));
      existingTiers[tierIndex] = { ...existingTiers[tierIndex], occupancy: clampedOccupancy };
      existingTiers.sort((a, b) => a.occupancy - b.occupancy);
      current[roomTypeIndex] = { ...row, pricing_tiers: existingTiers };
      control.setValue(current);
      this.propertyForm.markAsDirty();
      this.cdr.markForCheck();
    }
  }

  updateTierPrice(roomTypeIndex: number, tierIndex: number, price: number): void {
    const control = this.propertyForm.get('room_types');
    if (!control) return;

    const current: PropertyRoomTypeRequest[] = [...((control.value as PropertyRoomTypeRequest[] | null) ?? [])];
    if (roomTypeIndex < 0 || roomTypeIndex >= current.length) return;

    const row = current[roomTypeIndex];
    const existingTiers = [...(row.pricing_tiers ?? [])];
    if (tierIndex >= 0 && tierIndex < existingTiers.length) {
      existingTiers[tierIndex] = { ...existingTiers[tierIndex], price_per_night: Math.max(0, Number(price) || 0) };
      current[roomTypeIndex] = { ...row, pricing_tiers: existingTiers };
      control.setValue(current);
      this.propertyForm.markAsDirty();
    }
  }

  updateTierSalePrice(roomTypeIndex: number, tierIndex: number, salePrice: number): void {
    const control = this.propertyForm.get('room_types');
    if (!control) return;

    const current: PropertyRoomTypeRequest[] = [...((control.value as PropertyRoomTypeRequest[] | null) ?? [])];
    if (roomTypeIndex < 0 || roomTypeIndex >= current.length) return;

    const row = current[roomTypeIndex];
    const existingTiers = [...(row.pricing_tiers ?? [])];
    if (tierIndex >= 0 && tierIndex < existingTiers.length) {
      const val = Number(salePrice);
      existingTiers[tierIndex] = {
        ...existingTiers[tierIndex],
        sale_per_night: val > 0 ? val : undefined,
      };
      current[roomTypeIndex] = { ...row, pricing_tiers: existingTiers };
      control.setValue(current);
      this.propertyForm.markAsDirty();
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
        this.propertyForm.get('address_line1')?.valid &&
        this.propertyForm.get('postal_code')?.valid &&
        this.propertyForm.get('lat')?.valid &&
        this.propertyForm.get('lon')?.valid &&
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
        const vendorId = property.vendor?.id ?? (property as any).vendor_id;
        if (vendorId) {
          this.loadAttributesForVendor(vendorId);
        }
        this.patchPropertyForm(property);
      },
      error: () => this.router.navigate(['/admin/property-management']),
    });
  }

  private patchPropertyForm(property: PropertyData): void {
    if (!property) return;

    const amenityIds = property.property_amenities?.map((item) => item.amenity?.id ?? (item as any).amenity_id ?? item.id).filter(Boolean) ?? [];
    const facilityIds = property.property_facilities?.map((item) => item.facility?.id ?? (item as any).facility_id ?? item.id).filter(Boolean) ?? [];

    const roomTypes: PropertyRoomTypeRequest[] = [];
    const existingFormRows = (this.propertyForm.get('room_types')?.value as PropertyRoomTypeRequest[] | null) ?? [];

    if (property.property_room_types && Array.isArray(property.property_room_types) && property.property_room_types.length > 0) {
      for (let i = 0; i < property.property_room_types.length; i++) {
        const item = property.property_room_types[i];
        let resolvedRoomTypeId = '';
        if (item.room_type?.id) {
          resolvedRoomTypeId = String(item.room_type.id);
        } else if ((item as any).room_type_id) {
          resolvedRoomTypeId = String((item as any).room_type_id);
        } else if (typeof item === 'string') {
          resolvedRoomTypeId = item;
        } else {
          const matchingExisting = existingFormRows.find((r) => r.id === item.id) || existingFormRows[i];
          if (matchingExisting?.room_type_id) {
            resolvedRoomTypeId = matchingExisting.room_type_id;
          } else if (this.roomTypes().some((rt) => rt.id === item.id)) {
            resolvedRoomTypeId = item.id;
          } else {
            resolvedRoomTypeId = item.id;
          }
        }

        const units = Number(item.total_units || (item as any).units || (item as any).count || 1);
        const pricePerNight = Number(item.price_per_night) > 0 ? Number(item.price_per_night) : undefined;
        const salePerNight = Number(item.sale_per_night) > 0 ? Number(item.sale_per_night) : undefined;
        const capacity = item.room_type?.capacity || (resolvedRoomTypeId ? this.getRoomTypeCapacity(resolvedRoomTypeId) : 4);
        const tiers: PropertyRoomTypePrice[] = Array.isArray(item.pricing_tiers)
          ? item.pricing_tiers
              .map((t: any): PropertyRoomTypePrice => ({
                id: t.id,
                occupancy: Number(t.occupancy) || 1,
                price_per_night: Number(t.price_per_night) || 0,
                sale_per_night:
                  t.sale_per_night !== undefined && t.sale_per_night !== null && Number(t.sale_per_night) > 0
                    ? Number(t.sale_per_night)
                    : undefined,
              }))
              .filter((t: PropertyRoomTypePrice) => t.occupancy <= capacity)
          : [];

        if (resolvedRoomTypeId) {
          roomTypes.push({
            id: item.id,
            room_type_id: resolvedRoomTypeId,
            total_units: units > 0 ? units : 1,
            price_per_night: pricePerNight,
            sale_per_night: salePerNight,
            pricing_tiers: tiers,
          });
        }
      }
    } else if ((property as any).room_types && Array.isArray((property as any).room_types) && (property as any).room_types.length > 0) {
      for (let i = 0; i < (property as any).room_types.length; i++) {
        const item = (property as any).room_types[i];
        if (typeof item === 'string') {
          roomTypes.push({ room_type_id: item, total_units: 1 });
        } else if (item && typeof item === 'object') {
          const id = item.room_type_id || item.room_type?.id || item.id;
          const units = Number(item.total_units || item.units || item.count || 1);
          const pricePerNight = Number(item.price_per_night) > 0 ? Number(item.price_per_night) : undefined;
          const salePerNight = Number(item.sale_per_night) > 0 ? Number(item.sale_per_night) : undefined;
          const capacity = item.room_type?.capacity || (id ? this.getRoomTypeCapacity(String(id)) : 4);
          const tiers: PropertyRoomTypePrice[] = Array.isArray(item.pricing_tiers)
            ? item.pricing_tiers
                .map((t: any): PropertyRoomTypePrice => ({
                  id: t.id,
                  occupancy: Number(t.occupancy) || 1,
                  price_per_night: Number(t.price_per_night) || 0,
                  sale_per_night:
                    t.sale_per_night !== undefined && t.sale_per_night !== null && Number(t.sale_per_night) > 0
                      ? Number(t.sale_per_night)
                      : undefined,
                }))
                .filter((t: PropertyRoomTypePrice) => t.occupancy <= capacity)
            : [];

          if (id) {
            roomTypes.push({
              id: item.id,
              room_type_id: String(id),
              total_units: units > 0 ? units : 1,
              price_per_night: pricePerNight,
              sale_per_night: salePerNight,
              pricing_tiers: tiers,
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

    const foodOptionIds = property.property_food_options
      ?.filter((item) => item.is_included)
      .map((item) => {
        const raw = (item.name || item.id || '').toLowerCase().trim().replace(/\s+/g, '_');
        if (raw === 'tiffin' || raw === 'evening_snacks' || raw === 'evening_snack' || raw === 'evening_snacs' || raw === 'evening_scacs') {
          return 'evening_snacks';
        }
        return raw;
      }) ?? [];

    const manualAddr = property.address_details || property.manual_address;
    let addrLine1 = manualAddr?.address_line1 ?? '';
    let addrLine2 = manualAddr?.address_line2 ?? '';
    let postCode = manualAddr?.postal_code ?? '';
    let countryVal = manualAddr?.country ?? 'India';

    if (!addrLine1 && property.address) {
      const parts = property.address.split(',').map((p) => p.trim());
      if (parts.length >= 1) addrLine1 = parts[0];
      if (parts.length >= 3) {
        addrLine2 = parts.slice(1, -2).join(', ');
        postCode = parts[parts.length - 2];
        countryVal = parts[parts.length - 1];
      } else if (parts.length === 2) {
        postCode = parts[1];
      }
    }

    const latVal = property.latitude ?? property.geolocation?.latitude ?? null;
    const lonVal = property.longitude ?? property.geolocation?.longitude ?? null;

    this.propertyForm.patchValue(
      {
        vendor_id: property.vendor?.id ?? '',
        name: property.name ?? '',
        type: property.type,
        city_id: property.city?.id ?? '',
        location_id: property.location?.id ?? '',
        address_line1: addrLine1,
        address_line2: addrLine2,
        postal_code: postCode,
        country: countryVal || 'India',
        address: property.address ?? '',
        description: property.description ?? '',
        price_per_night: Number(property.price_per_night ?? (property as any).price ?? 0),
        sale_price: Number(property.sale_price ?? property.sale_per_night ?? 0),
        is_featured: property.is_featured ?? false,
        status: this.normalizePropertyStatus(property.status),
        amenity_ids: amenityIds,
        facility_ids: facilityIds,
        room_types: roomTypes,
        food_option_ids: foodOptionIds,
        lat: latVal !== null && latVal !== undefined ? parseFloat(Number(latVal).toFixed(6)) : null,
        lon: lonVal !== null && lonVal !== undefined ? parseFloat(Number(lonVal).toFixed(6)) : null,
      },
      { emitEvent: false }
    );

    this.propertyForm.get('room_types')?.setValue(roomTypes);

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
      this.loadingLocations.set(true);
      this.locationService.admin
        .getLocations({ page: 1, size: 100, search: { city_id: property.city.id } })
        .pipe(take(1))
        .subscribe({
          next: (res) => {
            this.locations.set(res.data);
            this.loadingLocations.set(false);
            if (property.location?.id) {
              this.propertyForm.get('location_id')?.setValue(property.location.id);
            }
            this.cdr.markForCheck();
          },
          error: () => {
            this.locations.set([]);
            this.loadingLocations.set(false);
            this.cdr.markForCheck();
          },
        });
    }

    this.cdr.markForCheck();
  }

  private buildUpdatePayload(): PropertyUpdateRequest {
    const raw = this.propertyForm.getRawValue();
    const roomTypes: PropertyRoomTypeRequest[] = ((raw.room_types as PropertyRoomTypeRequest[] | null) ?? [])
      .filter((rt) => !!rt.room_type_id?.trim())
      .map((rt) => {
        const capacity = Math.max(1, this.getRoomTypeCapacity(rt.room_type_id.trim()));
        const tiers = (rt.pricing_tiers || [])
          .filter((t) => Number(t.occupancy) >= 1 && Number(t.occupancy) <= capacity && Number(t.price_per_night) >= 0)
          .map((t) => ({
            id: t.id,
            occupancy: Number(t.occupancy),
            price_per_night: Number(t.price_per_night) || 0,
            sale_per_night:
              t.sale_per_night !== undefined && t.sale_per_night !== null && Number(t.sale_per_night) > 0
                ? Number(t.sale_per_night)
                : undefined,
          }));

        return {
          id: rt.id,
          room_type_id: rt.room_type_id.trim(),
          total_units: Math.max(1, Number(rt.total_units) || 1),
          price_per_night:
            rt.price_per_night !== undefined && rt.price_per_night !== null && Number(rt.price_per_night) > 0
              ? Number(rt.price_per_night)
              : undefined,
          sale_per_night:
            rt.sale_per_night !== undefined && rt.sale_per_night !== null && Number(rt.sale_per_night) > 0
              ? Number(rt.sale_per_night)
              : undefined,
          pricing_tiers: tiers.length > 0 ? tiers : undefined,
        };
      });

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
      city_id: String(raw.city_id ?? ''),
      location_id: String(raw.location_id ?? ''),
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
      lat: latVal,
      lon: lonVal,
      latitude: latVal,
      longitude: lonVal,
      geolocation: latVal !== undefined && lonVal !== undefined ? { latitude: latVal, longitude: lonVal } : undefined,
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
