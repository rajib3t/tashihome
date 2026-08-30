import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PageBreadcrumb } from '../../../../../shared/components/common/page-breadcrumb/page-breadcrumb';
import { Card } from '../../../../../shared/components/ui/card/card';
import { Modal } from '../../../../../shared/components/ui/modal/modal';
import { Avatar } from '../../../../../shared/components/users/avatar/avatar';
import { UserService } from '../../../../../services/user/user-service';
import { AdminUpdateCustomerDTO, Customer } from '../../../../../services/user/user.model';
import { environment } from '../../../../../../environments/environment';

@Component({
  selector: 'app-edit-customer',
  imports: [
    CommonModule,
    PageBreadcrumb,
    Card,
    ReactiveFormsModule,
    RouterModule,
    Avatar,
    Modal,
  ],
  templateUrl: './edit-customer.html',
  styleUrl: './edit-customer.css',
})
export class EditCustomer {
  public readonly assetUrl = environment.assetUrl;
  private readonly destroyRef = inject(DestroyRef);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly formBuilder = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);

  #customer = signal<Customer | null>(null);
  customer = computed(() => this.#customer());
  readonly customerId = signal('');
  readonly customerImagePreview = signal('');

  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly isImageUploading = signal(false);
  readonly imageUploadError = signal<string | null>(null);

  // Password reset modal state
  readonly isPasswordResetModalOpen = signal(false);
  readonly isSendingPasswordReset = signal(false);
  readonly passwordResetError = signal<string | null>(null);
  readonly passwordResetSuccess = signal<string | null>(null);

  readonly customerForm = this.formBuilder.group({
    full_name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    is_subscribed: [false],
  });

  readonly passwordResetForm = this.formBuilder.group({
    confirm: ['', [Validators.required, Validators.pattern(/^CONFIRM$/)]],
  });

  get fullNameControl() {
    return this.customerForm.get('full_name')!;
  }

  get emailControl() {
    return this.customerForm.get('email')!;
  }

  get phoneControl() {
    return this.customerForm.get('phone')!;
  }

 

  get resetConfirmControl() {
    return this.passwordResetForm.get('confirm')!;
  }

  ngOnInit(): void {
    this.activatedRoute.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const id = params.get('id') ?? '';
        this.customerId.set(id);

        if (id) {
          this.loadCustomerDetails(id);
        }
      });
  }

  private loadCustomerDetails(customerId: string): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.userService
      .getCustomerById(customerId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const customer = response.data;
          this.#customer.set(customer);

          if (customer) {
            this.customerForm.patchValue({
              full_name: customer.full_name,
              email: customer.email,
              phone: customer.phone,
              
              is_subscribed: !!customer.is_subscribed,
            });
            this.customerImagePreview.set(
              customer.is_profile_image_url ? (this.assetUrl + customer.is_profile_image_url) : ''
            );
          }

          this.isLoading.set(false);
        },
        error: (error) => {
          this.isLoading.set(false);
          const apiError = this.userService.apiService.extractApiErrorMessage(error);
          this.errorMessage.set(apiError || 'Unable to load customer details.');
        },
      });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];
    this.uploadAvatar(file);
  }

  uploadAvatar(file: File): void {
    if (!file || !this.customerId()) {
      this.imageUploadError.set('Unable to upload avatar: customer not found.');
      return;
    }

    this.isImageUploading.set(true);
    this.imageUploadError.set(null);
    this.successMessage.set(null);

    this.userService
      .updateCustomerProfileImage(this.customerId(), file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const updatedCustomer = response?.data;
          this.#customer.set(updatedCustomer ?? null);
          if (updatedCustomer?.is_profile_image_url) {
            this.customerImagePreview.set(this.assetUrl + updatedCustomer.is_profile_image_url);
          }
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

  onSubmitUpdate(): void {
    if (!this.customerId()) {
      this.errorMessage.set('Customer ID not found.');
      return;
    }

    if (this.customerForm.invalid) {
      this.customerForm.markAllAsTouched();
      this.errorMessage.set('Please fill out all required fields correctly.');
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const formVal = this.customerForm.getRawValue();
    const payload: AdminUpdateCustomerDTO = {
      full_name: formVal.full_name?.trim() || '',
      email: formVal.email?.trim() || '',
      phone: formVal.phone?.trim() || '',
   
      is_subscribed: !!formVal.is_subscribed,
    };

    this.userService
      .updateCustomer(this.customerId(), payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const updatedCustomer = response?.data;
          this.#customer.set(updatedCustomer ?? null);
          this.successMessage.set('Customer details updated successfully.');
          this.isSaving.set(false);
        },
        error: (error) => {
          const err = this.userService.apiService.extractApiErrorMessage(error);
          this.errorMessage.set(err || 'Failed to update customer.');
          this.isSaving.set(false);
        },
      });
  }

  openPasswordResetModal(): void {
    this.passwordResetForm.reset({ confirm: '' });
    this.passwordResetError.set(null);
    this.isSendingPasswordReset.set(false);
    this.isPasswordResetModalOpen.set(true);
  }

  closePasswordResetModal(): void {
    this.isPasswordResetModalOpen.set(false);
    this.passwordResetForm.reset({ confirm: '' });
    this.passwordResetError.set(null);
  }

  submitPasswordReset(): void {
    const id = this.customerId();
    if (!id) {
      this.passwordResetError.set('Customer ID not found.');
      return;
    }

    if (this.passwordResetForm.invalid) {
      this.passwordResetForm.markAllAsTouched();
      return;
    }

    const confirmText = this.passwordResetForm.value.confirm?.trim() || 'CONFIRM';
    this.isSendingPasswordReset.set(true);
    this.passwordResetError.set(null);

    this.userService
      .sendCustomerPasswordReset(id, confirmText)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.isSendingPasswordReset.set(false);
          const email = this.customer()?.email || 'customer';
          const successMsg =
            response?.message || `Password reset link has been successfully sent to ${email}.`;
          this.passwordResetSuccess.set(successMsg);
          this.closePasswordResetModal();
        },
        error: (error) => {
          this.isSendingPasswordReset.set(false);
          const apiError = this.userService.apiService.extractApiErrorMessage(error);
          this.passwordResetError.set(
            apiError ||
              error?.error?.message ||
              error?.message ||
              'Failed to send password reset link. Please try again.'
          );
        },
      });
  }
}

