import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PropertyItem } from '../../../../../services/property/property.model';
import { PropertyService } from '../../../../../services/property/property-service';
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
  private readonly router = inject(Router);

  readonly wizardSteps = ['Property details', 'Location & occupancy', 'Pricing & publish', 'Assets'];
  currentStep = 0;
  private propertyId = 0;
  readonly galleryPreviews = signal<string[]>([]);
  readonly featureImagePreview = signal('');
  readonly coverImagePreview = signal('');

  readonly propertyForm = this.formBuilder.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    type: ['Apartment' as PropertyItem['type'], Validators.required],
    city: ['', Validators.required],
    address: ['', [Validators.required, Validators.minLength(5)]],
    bedrooms: [1, [Validators.required, Validators.min(1)]],
    bathrooms: [1, [Validators.required, Validators.min(1)]],
    guests: [1, [Validators.required, Validators.min(1)]],
    area: [750, [Validators.required, Validators.min(1)]],
    price: [150000, [Validators.required, Validators.min(1)]],
    deposit: [50000, [Validators.required, Validators.min(0)]],
    status: ['draft' as PropertyItem['status'], Validators.required],
    description: ['', [Validators.required, Validators.minLength(20)]],
    galleryImages: this.formBuilder.control<string[]>([]),
    featureImage: [''],
    coverImage: [''],
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = Number(params.get('id'));
      if (!Number.isFinite(id)) {
        this.router.navigate(['/admin/property-management']);
        return;
      }

      this.propertyId = id;
      this.loadProperty(id);
    });
  }

  private loadProperty(id: number): void {
    this.propertyService.getProperties({ page: 1, size: 100 }).subscribe((response) => {
      const property = response.data.find((item) => item.id === id);
      if (!property) {
        this.router.navigate(['/admin/property-management']);
        return;
      }

      this.galleryPreviews.set(property.galleryImages);
      this.featureImagePreview.set(property.featureImage);
      this.coverImagePreview.set(property.coverImage);

      this.propertyForm.reset({
        title: property.title,
        type: property.type,
        city: property.city,
        address: property.address,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        guests: property.guests,
        area: property.area,
        price: property.price,
        deposit: property.deposit,
        status: property.status,
        description: property.description,
        galleryImages: property.galleryImages,
        featureImage: property.featureImage,
        coverImage: property.coverImage,
      });
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
    if (!this.isCurrentStepValid()) {
      this.propertyForm.markAllAsTouched();
      return;
    }

    const payload = this.propertyForm.getRawValue();
    const payloadProperty: PropertyItem = {
      id: this.propertyId,
      title: this.normalizeString(payload.title),
      type: this.normalizeType(payload.type),
      city: this.normalizeString(payload.city),
      address: this.normalizeString(payload.address),
      bedrooms: this.normalizeNumber(payload.bedrooms, 1),
      bathrooms: this.normalizeNumber(payload.bathrooms, 1),
      guests: this.normalizeNumber(payload.guests, 1),
      area: this.normalizeNumber(payload.area, 0),
      price: this.normalizeNumber(payload.price, 0),
      deposit: this.normalizeNumber(payload.deposit, 0),
      status: this.normalizeStatus(payload.status),
      description: this.normalizeString(payload.description),
      galleryImages: this.normalizeGalleryImages(payload.galleryImages),
      featureImage: this.normalizeString(payload.featureImage),
      coverImage: this.normalizeString(payload.coverImage),
    };

    this.propertyService.updateProperty(payloadProperty).subscribe(() => {
      this.router.navigate(['/admin/property-management']);
    });
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

  private isCurrentStepValid(): boolean {
    const step = this.currentStep;

    if (step === 0) {
      return !!(this.propertyForm.get('title')?.valid && this.propertyForm.get('type')?.valid && this.propertyForm.get('description')?.valid);
    }

    if (step === 1) {
      return !!(
        this.propertyForm.get('city')?.valid &&
        this.propertyForm.get('address')?.valid &&
        this.propertyForm.get('bedrooms')?.valid &&
        this.propertyForm.get('bathrooms')?.valid &&
        this.propertyForm.get('guests')?.valid &&
        this.propertyForm.get('area')?.valid
      );
    }

    if (step === 3) {
      return true;
    }

    return !!(this.propertyForm.get('price')?.valid && this.propertyForm.get('deposit')?.valid && this.propertyForm.get('status')?.valid);
  }

  private normalizeString(value: unknown): string {
    return String(value ?? '').trim();
  }

  private normalizeType(value: unknown): PropertyItem['type'] {
    const safeValue = String(value ?? 'Apartment');
    return (['Apartment', 'Villa', 'House', 'Studio'] as const).includes(safeValue as PropertyItem['type'])
      ? (safeValue as PropertyItem['type'])
      : 'Apartment';
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
