import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, signal, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PageBreadcrumb } from '../../../../../shared/components/common/page-breadcrumb/page-breadcrumb';
import { UploadImage } from '../../../../../shared/components/common/upload-image/upload-image';
import { Card } from '../../../../../shared/components/ui/card/card';
import { UserService } from '../../../../../services/user/user-service';
import { RequestVendor, VendorDetail } from '../../../../../services/user/user.model';
import { MetaCard } from '../../../../../shared/components/users/admin/meta-card/meta-card';
import { CompanyCard } from '../../../../../shared/components/users/admin/company-card/company-card';
import { InfoCard } from '../../../../../shared/components/users/admin/info-card/info-card';
import { Modal } from '../../../../../shared/components/ui/modal/modal';
import { environment } from '../../../../../../environments/environment';
import { AgreementService } from '../../../../../services/agreement/agreement-service';
import { AgreementTemplateItem } from '../../../../../core/models/agreement-template.model';
import { SettingsService } from '../../../../../services/settings/settings-service';


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
    CompanyCard,
    InfoCard,
    Modal
  ],
  templateUrl: './edit-vendor.html',
  styleUrl: './edit-vendor.css',
})
export class EditVendor {
  public readonly assetUrl = environment.assetUrl;
  private readonly destroyRef = inject(DestroyRef);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly formBuilder = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly agreementService = inject(AgreementService);
  private readonly settingsService = inject(SettingsService);
  private readonly router = inject(Router);
  @ViewChild(MetaCard) private readonly metaCard?: MetaCard;
  @ViewChild(CompanyCard) private readonly companyCard?: CompanyCard;
  @ViewChild(InfoCard) private readonly infoCard?: InfoCard;
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
  readonly isPasswordResetModalOpen = signal(false);
  readonly isSendingPasswordReset = signal(false);
  readonly passwordResetError = signal<string | null>(null);
  readonly passwordResetSuccess = signal<string | null>(null);

  // Send Agreement state
  readonly isSendAgreementModalOpen = signal(false);
  readonly isSendingAgreement = signal(false);
  readonly sendAgreementError = signal<string | null>(null);
  readonly sendAgreementSuccess = signal<string | null>(null);

  // Available templates for Send Agreement modal
  readonly availableTemplates = signal<AgreementTemplateItem[]>([]);
  readonly loadingTemplates = signal<boolean>(false);

  // Duplicate Prevention & Version Management
  readonly isDuplicateBlocked = signal<boolean>(false);
  readonly hasPendingAgreement = signal<boolean>(false);
  readonly hasSignedAgreement = signal<boolean>(false);
  readonly pendingAgreementForSelectedVendor = signal<any | null>(null);
  readonly signedAgreementForSelectedVendor = signal<any | null>(null);
  readonly checkingVendorStatus = signal<boolean>(false);
  readonly isAmendmentMode = signal<boolean>(false);
  readonly suggestedNextVersion = signal<string>('1.0');

  readonly sendAgreementForm = this.formBuilder.group({
    template_id: [''],
    commission_percentage: [10.0, [Validators.required, Validators.min(0), Validators.max(100)]],
    valid_days: [7, [Validators.required, Validators.min(1), Validators.max(90)]],
    version: ['1.0', [Validators.required]],
    custom_notes: [''],
  });

  readonly passwordResetForm = this.formBuilder.group({
    confirm: ['', [Validators.required, Validators.pattern(/^CONFIRM$/)]],
  });

  get resetConfirmControl() {
    return this.passwordResetForm.get('confirm')!;
  }
  
  readonly vendorForm = this.formBuilder.group({
    full_name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.required],
    company: this.formBuilder.group({
      name: [''],
      email: ['', [Validators.email]],
      phone: [''],
      address: this.formBuilder.group({
        address_line1: [''],
        address_line2: [''],
        postal_code: [''],
        country: [''],
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
          this.updateFromData(vendor);
          this.vendorImagePreview.set( vendor.is_profile_image_url ? this.assetUrl + vendor.is_profile_image_url : '');
        }

        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('Unable to load vendor details.');
      },
    });
  }

  updateFromData(vendor: VendorDetail) {
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
        this.companyCard?.showEditForm.set(false);
        this.infoCard?.showModal.set(false);
         this.updateFromData(updatedVendor);
          this.vendorImagePreview.set(updatedVendor.is_profile_image_url ? updatedVendor.is_profile_image_url : '');
      },
      error: (error) => {
        const err = this.userService.apiService.extractApiErrorMessage(error);
        this.errorMessage.set(err || 'Failed to update vendor.');
        this.isUpdating.set(false);
      },
    });
  }

  openPasswordResetModal() {
    this.passwordResetForm.reset({ confirm: '' });
    this.passwordResetError.set(null);
    this.isSendingPasswordReset.set(false);
    this.isPasswordResetModalOpen.set(true);
  }

  closePasswordResetModal() {
    this.isPasswordResetModalOpen.set(false);
    this.passwordResetForm.reset({ confirm: '' });
    this.passwordResetError.set(null);
  }

  submitPasswordReset() {
    const id = this.vendorId();
    if (!id) {
      this.passwordResetError.set('Vendor ID not found.');
      return;
    }

    if (this.passwordResetForm.invalid) {
      this.passwordResetForm.markAllAsTouched();
      return;
    }

    const confirmText = this.passwordResetForm.value.confirm?.trim() || 'CONFIRM';
    this.isSendingPasswordReset.set(true);
    this.passwordResetError.set(null);

    this.userService.sendVendorPasswordReset(id, confirmText)
      .pipe(
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {
          this.isSendingPasswordReset.set(false);
          const email = this.vendor()?.email || 'vendor';
          const successMsg = response?.message || `Password reset link has been successfully sent to ${email}.`;
          this.passwordResetSuccess.set(successMsg);
          this.closePasswordResetModal();
        },
        error: (error) => {
          this.isSendingPasswordReset.set(false);
          const apiError = this.userService.apiService.extractApiErrorMessage(error);
          this.passwordResetError.set(
            apiError || error?.error?.message || error?.message || 'Failed to send password reset link. Please try again.'
          );
        }
      });
  }

  openSendAgreementModal(isAmendment: boolean = false, customVersion?: string): void {
    const id = this.vendorId();
    const defaultValidity = this.settingsService.agreementDefaultValidityDays() || 7;
    const defaultCommission = this.settingsService.commissionPercentage() || 10.0;
    this.isAmendmentMode.set(isAmendment);
    this.sendAgreementError.set(null);
    this.isDuplicateBlocked.set(false);
    this.pendingAgreementForSelectedVendor.set(null);
    this.signedAgreementForSelectedVendor.set(null);

    this.sendAgreementForm.reset({
      template_id: '',
      commission_percentage: defaultCommission,
      valid_days: defaultValidity,
      version: customVersion || '1.0',
      custom_notes: '',
    });

    if (id) {
      this.checkVendorAgreements(id, customVersion);
    }

    this.isSendAgreementModalOpen.set(true);
    this.loadTemplatesForModal();
  }

  checkVendorAgreements(vendorId: string, explicitVersion?: string): void {
    if (!vendorId) {
      this.isDuplicateBlocked.set(false);
      this.hasPendingAgreement.set(false);
      this.hasSignedAgreement.set(false);
      this.pendingAgreementForSelectedVendor.set(null);
      this.signedAgreementForSelectedVendor.set(null);
      this.isAmendmentMode.set(false);
      this.suggestedNextVersion.set('1.0');
      this.sendAgreementError.set(null);
      return;
    }

    this.checkingVendorStatus.set(true);
    this.sendAgreementError.set(null);

    this.agreementService
      .getVendorAgreementStatus(vendorId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.checkingVendorStatus.set(false))
      )
      .subscribe({
        next: (status: any) => {
          const pending = status?.pending_agreement || null;
          const signed = status?.signed_agreement || null;

          this.hasPendingAgreement.set(!!status?.has_pending);
          this.pendingAgreementForSelectedVendor.set(pending);

          this.hasSignedAgreement.set(!!status?.has_signed);
          this.signedAgreementForSelectedVendor.set(signed);

          this.isDuplicateBlocked.set(false);

          if (explicitVersion) {
            this.suggestedNextVersion.set(explicitVersion);
            this.isAmendmentMode.set(true);
            this.sendAgreementForm.patchValue({ version: explicitVersion });
          } else if (status?.has_signed) {
            const nextVer = status?.suggested_next_version || '2.0';
            this.suggestedNextVersion.set(nextVer);
            this.isAmendmentMode.set(true);
            this.sendAgreementForm.patchValue({
              version: nextVer,
              custom_notes: `Amendment v${nextVer} (Supersedes v${signed?.version || '1.0'} upon execution)`,
            });
          } else if (status?.has_pending) {
            const curVer = pending?.version || '1.0';
            this.suggestedNextVersion.set(curVer);
            this.isAmendmentMode.set(false);
            this.sendAgreementForm.patchValue({ version: curVer });
          } else {
            this.suggestedNextVersion.set('1.0');
            this.isAmendmentMode.set(false);
            this.sendAgreementForm.patchValue({ version: '1.0' });
          }
        },
        error: () => {
          this.hasPendingAgreement.set(false);
          this.hasSignedAgreement.set(false);
        },
      });
  }

  resendPendingFromModal(): void {
    const pending = this.pendingAgreementForSelectedVendor();
    if (!pending) return;

    this.isSendingAgreement.set(true);
    this.agreementService
      .resendAgreement(pending.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSendingAgreement.set(false))
      )
      .subscribe({
        next: () => {
          this.sendAgreementSuccess.set(
            `Pending agreement invitation (v${pending.version || '1.0'}) successfully resent to host.`
          );
          this.closeSendAgreementModal();
        },
        error: (err) => {
          const msg = this.agreementService.extractApiErrorMessage(err) || 'Failed to resend agreement.';
          this.sendAgreementError.set(msg);
        },
      });
  }

  private loadTemplatesForModal(): void {
    this.loadingTemplates.set(true);
    this.agreementService
      .getAgreementTemplates({ status: 'active', size: 100 })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingTemplates.set(false))
      )
      .subscribe({
        next: (res: any) => {
          const list: AgreementTemplateItem[] = res?.data || [];
          this.availableTemplates.set(list);
          const def = list.find((t: AgreementTemplateItem) => t.is_default);
          if (def && !this.sendAgreementForm.get('template_id')?.value) {
            this.sendAgreementForm.patchValue({ template_id: def.id });
          }
        },
        error: () => {
          // Fallback
        },
      });
  }

  closeSendAgreementModal(): void {
    this.isSendAgreementModalOpen.set(false);
    this.isDuplicateBlocked.set(false);
    this.hasPendingAgreement.set(false);
    this.hasSignedAgreement.set(false);
    this.pendingAgreementForSelectedVendor.set(null);
    this.signedAgreementForSelectedVendor.set(null);
    this.isAmendmentMode.set(false);
    this.sendAgreementError.set(null);
  }

  submitSendAgreement(): void {
    const id = this.vendorId();
    if (!id) {
      this.sendAgreementError.set('Vendor ID not found.');
      return;
    }

    if (this.sendAgreementForm.invalid) {
      this.sendAgreementForm.markAllAsTouched();
      return;
    }

    const { template_id, commission_percentage, valid_days, version, custom_notes } =
      this.sendAgreementForm.getRawValue();

    const hadPending = this.hasPendingAgreement();

    this.isSendingAgreement.set(true);
    this.sendAgreementError.set(null);

    const fullNotes = version && !custom_notes?.includes(`v${version}`)
      ? `[Agreement Version: v${version}] ${custom_notes || ''}`.trim()
      : custom_notes || undefined;

    this.agreementService
      .sendAgreementToVendor(id, {
        commission_percentage: Number(commission_percentage) || this.settingsService.commissionPercentage() || 10.0,
        valid_days: Number(valid_days) || 7,
        version: version || '1.0',
        custom_notes: fullNotes,
        template_id: template_id || undefined,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSendingAgreement.set(false))
      )
      .subscribe({
        next: (res: any) => {
          const email = this.vendor()?.email || 'vendor';
          this.sendAgreementSuccess.set(
            hadPending
              ? `New agreement (v${version || '1.0'}) dispatched successfully! Previous pending invitation was superseded.`
              : (res?.message || `Host Partnership Agreement (v${version || '1.0'}) sent successfully to ${email}!`)
          );
          this.closeSendAgreementModal();
        },
        error: (err) => {
          const msg =
            this.agreementService.extractApiErrorMessage(err) ||
            err?.error?.message ||
            'Failed to dispatch agreement. Please try again.';
          this.sendAgreementError.set(msg);
        },
      });
  }
}

