import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnInit, SimpleChanges, computed, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { PropertySetupSteps, SetupStepStatus } from '../../../../services/property/property-setup-steps.model';
import { PropertySetupStepsService } from '../../../../services/property/property-setup-steps.service';

export interface StepDefinition {
  key: keyof SetupStepStatus;
  label: string;
  description: string;
}

export const SETUP_STEP_DEFINITIONS: StepDefinition[] = [
  { key: 'basic_info', label: 'Basic Information', description: 'Property title, category, city, location, and description' },
  { key: 'pricing', label: 'Pricing & Tariffs', description: 'Base price or sale price per night' },
  { key: 'room_types', label: 'Room Types & Units', description: 'Configure room types with guest capacities' },
  { key: 'amenities', label: 'Amenities', description: 'Select guest amenities like Wi-Fi, heating, TV' },
  { key: 'facilities', label: 'Facilities', description: 'Add property facilities like parking, restaurant, garden' },
  { key: 'media', label: 'Photos & Gallery', description: 'Upload feature, cover, and gallery images' },
  { key: 'policies', label: 'Policies & Rules', description: 'Set stay policies, deposits, and terms' },
];

@Component({
  selector: 'app-property-setup-steps',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './property-setup-steps.html',
})
export class PropertySetupStepsComponent implements OnInit, OnChanges {
  private readonly stepsService = inject(PropertySetupStepsService);
  private readonly router = inject(Router);

  @Input() propertyId?: string;
  @Input() compact: boolean = false;
  @Input() setupSteps?: PropertySetupSteps | null;
  @Input() percentComplete?: number;
  @Input() currentStep?: string;

  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly stepsData = signal<PropertySetupSteps | null>(null);

  readonly stepDefinitions = SETUP_STEP_DEFINITIONS;

  readonly currentPercent = computed(() => {
    if (this.percentComplete !== undefined && this.percentComplete !== null) {
      return Math.round(this.percentComplete);
    }
    const data = this.stepsData();
    if (data?.percent_complete !== undefined) {
      return Math.round(data.percent_complete);
    }
    return 0;
  });

  readonly isAllComplete = computed(() => {
    const data = this.stepsData();
    if (data?.is_complete !== undefined) {
      return data.is_complete;
    }
    return this.currentPercent() >= 100;
  });

  readonly completedCount = computed(() => {
    const data = this.stepsData();
    if (data?.completed_steps) {
      return data.completed_steps.length;
    }
    return Math.round((this.currentPercent() / 100) * 7);
  });

  ngOnInit(): void {
    if (this.setupSteps) {
      this.stepsData.set(this.setupSteps);
    } else if (this.propertyId) {
      this.loadSteps();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['setupSteps'] && this.setupSteps) {
      this.stepsData.set(this.setupSteps);
    } else if (changes['propertyId'] && this.propertyId && !this.setupSteps) {
      this.loadSteps();
    }
  }

  loadSteps(): void {
    if (!this.propertyId) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.stepsService.getVendorSetupSteps(this.propertyId)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => {
          if (response?.data) {
            this.stepsData.set(response.data);
          }
        },
        error: (err) => {
          this.errorMessage.set(err?.error?.message || err?.message || 'Unable to load setup steps.');
        },
      });
  }

  isStepCompleted(key: keyof SetupStepStatus): boolean {
    const data = this.stepsData();
    if (!data) return false;
    if (data.steps && data.steps[key] !== undefined) {
      return data.steps[key];
    }
    if (data.completed_steps) {
      return data.completed_steps.includes(key);
    }
    return false;
  }

  goToEdit(stepKey?: string): void {
    if (!this.propertyId) return;
    this.router.navigate(['/vendor/property-management', this.propertyId, 'edit'], {
      queryParams: stepKey ? { step: stepKey } : undefined,
    });
  }
}

