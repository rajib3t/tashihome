import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, signal, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PageBreadcrumb } from '../../../../../shared/components/common/page-breadcrumb/page-breadcrumb';
import { UploadImage } from '../../../../../shared/components/common/upload-image/upload-image';
import { Card } from '../../../../../shared/components/ui/card/card';
import { UserService } from '../../../../../services/user/user-service';
import { RequestVendor, VendorDetail } from '../../../../../services/user/user.model';
import { MetaCard } from '../../../../../shared/components/users/admin/meta-card/meta-card';
import { CompanyCard } from '../../../../../shared/components/users/admin/company-card/company-card';

interface VendorFormValue {
  full_name: string;
  email: string;
  phone: string;
  company: {
    name: string;
    email: string;
    phone: string;
    address: {
      address_line1: string;
      address_line2: string;
      postal_code: string;
      country: string;
    };
  };
  image?: File | string | null;
}

@Component({
  selector: 'app-edit-vendor',
  imports: [
    CommonModule,
    PageBreadcrumb,
    Card,
    ReactiveFormsModule,
    RouterModule,
    // UploadImage,
    MetaCard,
    CompanyCard
  ],
  templateUrl: './edit-vendor.html',
  styleUrl: './edit-vendor.css',
})
export class EditVendor {
  private readonly destroyRef = inject(DestroyRef);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly formBuilder = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  @ViewChild(MetaCard) private readonly metaCard?: MetaCard;

  #vendor = signal<VendorDetail | null>(null);
  vendor = computed(() => this.#vendor());
  readonly vendorId = signal('');
  readonly vendorImagePreview = signal('');
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly isImageUploading = signal(false);
  readonly imageUploadError = signal<string | null>(null);
  readonly isUpdating = signal(false);
  
  readonly vendorForm = this.formBuilder.group({
    full_name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.required],
    company: this.formBuilder.group({
      name: ['', ],
      email: ['', [ Validators.email]],
      phone: [''],
      address: this.formBuilder.group({
        address_line1: [''],
        address_line2: [''],
        postal_code: ['', ],
        country: ['', ],
      }),
    }),
    image: [null], // For file upload
  });

  ngOnInit(): void {
    this.activatedRoute.paramMap.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((params) => {
      const id = params.get('id') ?? '';
      this.vendorId.set(id);

      if (id) {
        this.loadVendorDetails(id);
      }


    });
  }

  private loadVendorDetails(vendorId: string): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.userService.getVendorById(vendorId).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (response) => {
        const vendor = response.data;
       
        this.#vendor.set(vendor);

        if (vendor) {
          this.vendorForm.patchValue({
            full_name: vendor.full_name,
            email: vendor.email,
            phone: vendor.phone,
            company: {
              name: vendor.company?.name ?? '',
              email: vendor.company?.email ?? '',
              phone: vendor.company?.phone ?? '',
              address: {
                address_line1: vendor.company?.address.address_line1 ?? '',
                address_line2: vendor.company?.address.address_line2 ?? '',
                postal_code: vendor.company?.address.postal_code ?? '',
                country: vendor.company?.address.country ?? '',
              },
            },
          });
        }

        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('Unable to load vendor details.');
      },
    });
  }

  
  uploadAvatar(file: File) {
    if (!file || !this.vendorId()) {
      this.imageUploadError.set('Unable to upload avatar: vendor not found.');
      return;
    }

    this.isImageUploading.set(true);
    this.imageUploadError.set(null);
    this.successMessage.set(null);

    this.userService.updateImage(this.vendorId(), file).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (response) => {
        const updatedVendor = response?.data
        this.#vendor.set(updatedVendor ?? null);
        this.successMessage.set('Profile image updated successfully.');
        this.isImageUploading.set(false);
      },
      error: (error) => {
        const err = this.userService.apiService.extractApiErrorMessage(error);
        this.imageUploadError.set(err || 'Failed to update profile image.');
        this.isImageUploading.set(false);
      },
    });
  }


  private toSafeString(value: unknown): string {
    return value == null ? '' : String(value);
  }

  updateVendor(payload?: Partial<RequestVendor>) {
    if (!this.vendorId()) {
      this.errorMessage.set('Unable to update vendor: vendor not found.');
      return;
    }

    const source = payload ?? {
      full_name: this.vendorForm.value.full_name,
      email: this.vendorForm.value.email,
      phone: this.vendorForm.value.phone,
      company: {
        name: this.vendorForm.value.company?.name,
        email: this.vendorForm.value.company?.email,
        phone: this.vendorForm.value.company?.phone,
        address: {
          address_line1: this.vendorForm.value.company?.address?.address_line1,
          address_line2: this.vendorForm.value.company?.address?.address_line2,
          postal_code: this.vendorForm.value.company?.address?.postal_code,
          country: this.vendorForm.value.company?.address?.country,
        },
      },
    };

    const formPayload: Partial<RequestVendor> = {
      full_name: this.toSafeString(source.full_name),
      email: this.toSafeString(source.email),
      phone: this.toSafeString(source.phone),
      company: {
        name: this.toSafeString(source.company?.name),
        email: this.toSafeString(source.company?.email),
        phone: this.toSafeString(source.company?.phone),
        address: {
          address_line1: this.toSafeString(source.company?.address?.address_line1),
          address_line2: this.toSafeString(source.company?.address?.address_line2),
          postal_code: this.toSafeString(source.company?.address?.postal_code),
          country: this.toSafeString(source.company?.address?.country),
        },
      },
    };

    this.isUpdating.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.userService.updateVendor(this.vendorId(), formPayload).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (response) => {
        const updatedVendor = response?.data;
        this.#vendor.set(updatedVendor ?? null);
        this.successMessage.set('Vendor updated successfully.');
        this.isUpdating.set(false);
        this.metaCard?.showModal.set(false);
      },
      error: (error) => {
        const err = this.userService.apiService.extractApiErrorMessage(error);
        this.errorMessage.set(err || 'Failed to update vendor.');
        this.isUpdating.set(false);
      },
    });
  }


  
}
