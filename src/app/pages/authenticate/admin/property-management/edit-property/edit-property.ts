import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { take } from 'rxjs';
import { AmenityService } from '../../../../../services/amenity/amenity-service';
import { FacilityService } from '../../../../../services/facility/facility-service';
import { CreatePropertyRequest, PROPERTY_TYPES, PropertyItem, PropertyRequest } from '../../../../../services/property/property.model';
import { PropertyService } from '../../../../../services/property/property-service';
import { RoomTypeService } from '../../../../../services/room-type/room-type-service';
import { Amenity } from '../../../../../services/amenity/amenity-model';
import { Facility } from '../../../../../services/facility/facility-model';
import { RoomType } from '../../../../../services/room-type/room-type-model';
import { Card } from '../../../../../shared/components/ui/card/card';
import { UploadImage } from '../../../../../shared/components/common/upload-image/upload-image';

@Component({
  selector: 'app-edit-property',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Card, UploadImage],
  templateUrl: './edit-property.html',
})
export class EditProperty {
  private readonly route = inject(ActivatedRoute);
  private readonly formBuilder = inject(FormBuilder);
  private readonly propertyService = inject(PropertyService);
  private readonly amenityService = inject(AmenityService);
  private readonly facilityService = inject(FacilityService);
  private readonly roomTypeService = inject(RoomTypeService);
  private readonly router = inject(Router);

  readonly wizardSteps = ['Property Details', 'Amenities & Facilities', 'Pricing', 'Media', 'Settings'];
  currentStep = 0;
  private propertyId: string | null = null;
  readonly amenities = signal<Amenity[]>([]);
  readonly facilities = signal<Facility[]>([]);
  readonly roomTypes = signal<RoomType[]>([]);
  readonly galleryPreviews = signal<string[]>([]);
  readonly featureImagePreview = signal('');
  readonly coverImagePreview = signal('');

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

  ngOnInit(): void {
    this.loadAmenities();
    this.loadFacilities();
    this.loadRoomTypes();

    this.route.paramMap.subscribe((params) => {
      const idParam = params.get('id');
      if (!idParam) {
        this.router.navigate(['/admin/property-management']);
        return;
      }
      this.loadProperty(idParam);
    });
  }

  private loadProperty(id: string): void {
    this.propertyService.getPropertyById(id).subscribe({
      next: (response) => {
        const property = response.data;
        this.propertyId = property.id;
        this.propertyForm.patchValue({
          vendor_id: property.vendor.id,
          name: property.name,
          type: property.type,
          city_id: property.city.id,
          location_id: property.location.id,
          
          price_per_night: property.price_per_night ?? 0,
          sale_price: property.sale_price ?? 0,
          description: property.description,
       
        });
      }
    });
  }

  nextStep(): void {
    if (!this.isCurrentStepValid()) {
      this.propertyForm.markAllAsTouched();
      return;
    }

    this.currentStep = Math.min(this.currentStep + 1, this.wizardSteps.length - 1);
  }

  previousStep(): void {
    this.currentStep = Math.max(this.currentStep - 1, 0);
  }

  submitPropertyForm(): void {
    // if (!this.isCurrentStepValid()) {
    //   this.propertyForm.markAllAsTouched();
    //   return;
    // }

    // const propertyId = this.propertyId;
    // if (propertyId === null) {
    //   this.router.navigate(['/admin/property-management']);
    //   return;
    // }

    // const payload = this.propertyForm.getRawValue();
    // const payloadProperty: PropertyItem = {
    //   id: propertyId,
    //   title: this.normalizeString(payload.title),
    //   type: this.normalizeType(payload.type),
    //   city: this.normalizeString(payload.city),
    //   address: this.normalizeString(payload.address),
    //   bedrooms: this.normalizeNumber(payload.bedrooms, 1),
    //   bathrooms: this.normalizeNumber(payload.bathrooms, 1),
    //   guests: this.normalizeNumber(payload.guests, 1),
    //   area: this.normalizeNumber(payload.area, 0),
    //   price: this.normalizeNumber(payload.price_per_night, 0),
    //   price_per_night: this.normalizeNumber(payload.price_per_night, 0),
    //   sale_price: this.normalizeNumber(payload.sale_price, 0),
    //   status: this.normalizeStatus(payload.status),
    //   description: this.normalizeString(payload.description),
    //   galleryImages: this.normalizeGalleryImages(payload.galleryImages),
    //   featureImage: this.normalizeString(payload.featureImage),
    //   coverImage: this.normalizeString(payload.coverImage),
    //   amenity_ids: [...(payload.amenity_ids ?? [])],
    //   facility_ids: [...(payload.facility_ids ?? [])],
    //   room_type_ids: [...(payload.room_type_ids ?? [])],
    //   food_option_ids: [...(payload.food_option_ids ?? [])],
    // };

    // this.propertyService.updateProperty(this.propertyId as string, payloadProperty).subscribe(() => {
    //   this.router.navigate(['/admin/property-management']);
    // });
  }

  cancel(): void {
    this.router.navigate(['/admin/property-management']);
  }

  addGalleryImages(previews: string[]): void {
    if (!previews.length) {
      return;
    }

    this.galleryPreviews.update((list) => [...list, ...previews]);
    this.propertyForm.get('galleryImages')?.setValue(this.galleryPreviews());
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
    const step = this.currentStep;

    if (step === 0) {
      return !!(this.propertyForm.get('title')?.valid && this.propertyForm.get('type')?.valid && this.propertyForm.get('description')?.valid);
    }

    if (step === 1) {
      return true;
    }

    if (step === 2) {
      return !!(this.propertyForm.get('price_per_night')?.valid && this.propertyForm.get('sale_price')?.valid);
    }

    if (step === 3) {
      return true;
    }

    return !!(this.propertyForm.get('status')?.valid);
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

  private normalizeString(value: unknown): string {
    return String(value ?? '').trim();
  }

  private normalizeType(value: unknown): PropertyItem['type'] {
    const safeValue = String(value ?? 'hotel');
    return (PROPERTY_TYPES as readonly string[]).includes(safeValue) ? (safeValue as PropertyItem['type']) : 'hotel';
  }

  private normalizeStatus(value: unknown): PropertyItem['status'] {
    const safeValue = String(value ?? 'draft');
    return (['draft', 'active', 'inactive'] as const).includes(safeValue as PropertyItem['status'])
      ? (safeValue as PropertyItem['status'])
      : 'draft';
  }

  private normalizeNumber(value: unknown, fallback: number): number {
    const parsed = Number(value ?? fallback);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private normalizeGalleryImages(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
    }

    return this.normalizeString(value)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
}
