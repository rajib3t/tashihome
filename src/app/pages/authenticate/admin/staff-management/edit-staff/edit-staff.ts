import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PageBreadcrumb } from '../../../../../shared/components/common/page-breadcrumb/page-breadcrumb';
import { Card } from '../../../../../shared/components/ui/card/card';
import { Modal } from '../../../../../shared/components/ui/modal/modal';
import { Avatar } from '../../../../../shared/components/users/avatar/avatar';
import { StaffService } from '../../../../../services/staff/staff-service';
import { StaffRole, StaffUser, UpdateStaffDTO } from '../../../../../services/staff/staff.model';
import { environment } from '../../../../../../environments/environment';

@Component({
  selector: 'app-edit-staff',
  imports: [
    CommonModule,
    PageBreadcrumb,
    Card,
    ReactiveFormsModule,
    RouterModule,
    Avatar,
    Modal,
  ],
  templateUrl: './edit-staff.html',
  styleUrl: './edit-staff.css',
})
export class EditStaff implements OnInit {
  public readonly assetUrl = environment.assetUrl;
  private readonly destroyRef = inject(DestroyRef);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly formBuilder = inject(FormBuilder);
  private readonly staffService = inject(StaffService);
  private readonly router = inject(Router);

  #staff = signal<StaffUser | null>(null);
  staff = computed(() => this.#staff());
  readonly staffId = signal('');
  readonly staffImagePreview = signal('');

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

  readonly staffForm = this.formBuilder.group({
    full_name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    role: ['staff' as StaffRole, [Validators.required]],
    is_subscribed: [false],
  });

  readonly passwordResetForm = this.formBuilder.group({
    confirm: ['', [Validators.required, Validators.pattern(/^CONFIRM$/)]],
  });

  get fullNameControl() {
    return this.staffForm.get('full_name')!;
  }

  get emailControl() {
    return this.staffForm.get('email')!;
  }

  get phoneControl() {
    return this.staffForm.get('phone')!;
  }

  get roleControl() {
    return this.staffForm.get('role')!;
  }

  get resetConfirmControl() {
    return this.passwordResetForm.get('confirm')!;
  }

  ngOnInit(): void {
    this.activatedRoute.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const id = params.get('id') ?? '';
        this.staffId.set(id);

        if (id) {
          this.loadStaffDetails(id);
        }
      });
  }

  private loadStaffDetails(staffId: string): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.staffService
      .getStaffById(staffId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const staff = response.data;
          this.#staff.set(staff);

          if (staff) {
            this.staffForm.patchValue({
              full_name: staff.full_name,
              email: staff.email,
              phone: staff.phone,
              role: staff.role || 'staff',
              is_subscribed: !!staff.is_subscribed,
            });
            this.staffImagePreview.set(
              staff.is_profile_image_url ? (this.assetUrl + staff.is_profile_image_url) : ''
            );
          }

          this.isLoading.set(false);
        },
        error: (error) => {
          this.isLoading.set(false);
          const apiError = this.staffService.apiService.extractApiErrorMessage(error);
          this.errorMessage.set(apiError || 'Unable to load staff details.');
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
    if (!file || !this.staffId()) {
      this.imageUploadError.set('Unable to upload avatar: staff account not found.');
      return;
    }

    this.isImageUploading.set(true);
    this.imageUploadError.set(null);
    this.successMessage.set(null);

    this.staffService
      .updateStaffProfileImage(this.staffId(), file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const updatedStaff = response?.data;
          this.#staff.set(updatedStaff ?? null);
          if (updatedStaff?.is_profile_image_url) {
            this.staffImagePreview.set(this.assetUrl + updatedStaff.is_profile_image_url);
          }
          this.successMessage.set('Profile image updated successfully.');
          this.isImageUploading.set(false);
        },
        error: (error) => {
          const err = this.staffService.apiService.extractApiErrorMessage(error);
          this.imageUploadError.set(err || 'Failed to update profile image.');
          this.isImageUploading.set(false);
        },
      });
  }

  onSubmitUpdate(): void {
    if (!this.staffId()) {
      this.errorMessage.set('Staff ID not found.');
      return;
    }

    if (this.staffForm.invalid) {
      this.staffForm.markAllAsTouched();
      this.errorMessage.set('Please fill out all required fields correctly.');
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const formVal = this.staffForm.getRawValue();
    const payload: UpdateStaffDTO = {
      full_name: formVal.full_name?.trim() || '',
      email: formVal.email?.trim() || '',
      phone: formVal.phone?.trim() || '',
      role: (formVal.role as StaffRole) || 'staff',
      is_subscribed: !!formVal.is_subscribed,
    };

    this.staffService
      .updateStaff(this.staffId(), payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const updatedStaff = response?.data;
          this.#staff.set(updatedStaff ?? null);
          this.successMessage.set('Staff details and role updated successfully.');
          this.isSaving.set(false);
        },
        error: (error) => {
          const err = this.staffService.apiService.extractApiErrorMessage(error);
          this.errorMessage.set(err || 'Failed to update staff account.');
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
    const id = this.staffId();
    if (!id) {
      this.passwordResetError.set('Staff ID not found.');
      return;
    }

    if (this.passwordResetForm.invalid) {
      this.passwordResetForm.markAllAsTouched();
      return;
    }

    const confirmText = this.passwordResetForm.value.confirm?.trim() || 'CONFIRM';
    this.isSendingPasswordReset.set(true);
    this.passwordResetError.set(null);

    this.staffService
      .sendStaffPasswordReset(id, confirmText)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.isSendingPasswordReset.set(false);
          const email = this.staff()?.email || 'staff member';
          const successMsg =
            response?.message || `Password reset link has been successfully sent to ${email}.`;
          this.passwordResetSuccess.set(successMsg);
          this.closePasswordResetModal();
        },
        error: (error) => {
          this.isSendingPasswordReset.set(false);
          const apiError = this.staffService.apiService.extractApiErrorMessage(error);
          this.passwordResetError.set(
            apiError ||
              error?.error?.message ||
              error?.message ||
              'Failed to send password reset link. Please try again.'
          );
        },
      });
  }

  getRoleBadgeClass(role?: string): string {
    switch (role?.toLowerCase()) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'staff':
        return 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300 border-teal-200 dark:border-teal-800';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    }
  }
}

