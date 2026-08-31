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
import { AdminUpdateUserDTO, User, UserRole } from '../../../../../services/user/user.model';
import { environment } from '../../../../../../environments/environment';

@Component({
  selector: 'app-edit-user',
  imports: [
    CommonModule,
    PageBreadcrumb,
    Card,
    ReactiveFormsModule,
    RouterModule,
    Avatar,
    Modal,
  ],
  templateUrl: './edit-user.html',
  styleUrl: './edit-user.css',
})
export class EditUser {
  public readonly assetUrl = environment.assetUrl;
  private readonly destroyRef = inject(DestroyRef);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly formBuilder = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);

  #user = signal<User | null>(null);
  user = computed(() => this.#user());
  readonly userId = signal('');
  readonly userImagePreview = signal('');

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

  readonly userForm = this.formBuilder.group({
    full_name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    role: ['user' as UserRole, [Validators.required]],
    status: ['active', [Validators.required]],
    is_subscribed: [false],
  });

  readonly passwordResetForm = this.formBuilder.group({
    confirm: ['', [Validators.required, Validators.pattern(/^CONFIRM$/)]],
  });

  get fullNameControl() {
    return this.userForm.get('full_name')!;
  }

  get emailControl() {
    return this.userForm.get('email')!;
  }

  get phoneControl() {
    return this.userForm.get('phone')!;
  }

  get roleControl() {
    return this.userForm.get('role')!;
  }

  get statusControl() {
    return this.userForm.get('status')!;
  }

  get resetConfirmControl() {
    return this.passwordResetForm.get('confirm')!;
  }

  ngOnInit(): void {
    this.activatedRoute.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const id = params.get('id') ?? '';
        this.userId.set(id);

        if (id) {
          this.loadUserDetails(id);
        }
      });
  }

  private loadUserDetails(userId: string): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.userService
      .getUserById(userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const user = response.data;
          this.#user.set(user);

          if (user) {
            this.userForm.patchValue({
              full_name: user.full_name,
              email: user.email,
              phone: user.phone,
              role: user.role,
              status: user.status,
              is_subscribed: !!user.is_subscribed,
            });
            this.userImagePreview.set(
              user.is_profile_image_url ? (this.assetUrl + user.is_profile_image_url) : ''
            );
          }

          this.isLoading.set(false);
        },
        error: (error) => {
          this.isLoading.set(false);
          const apiError = this.userService.apiService.extractApiErrorMessage(error);
          this.errorMessage.set(apiError || 'Unable to load user details.');
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
    if (!file || !this.userId()) {
      this.imageUploadError.set('Unable to upload avatar: user not found.');
      return;
    }

    this.isImageUploading.set(true);
    this.imageUploadError.set(null);
    this.successMessage.set(null);

    this.userService
      .updateUserProfileImage(this.userId(), file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const updatedUser = response?.data;
          this.#user.set(updatedUser ?? null);
          if (updatedUser?.is_profile_image_url) {
            this.userImagePreview.set(this.assetUrl + updatedUser.is_profile_image_url);
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
    if (!this.userId()) {
      this.errorMessage.set('User ID not found.');
      return;
    }

    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      this.errorMessage.set('Please fill out all required fields correctly.');
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const formVal = this.userForm.getRawValue();
    const payload: AdminUpdateUserDTO = {
      full_name: formVal.full_name?.trim() || '',
      email: formVal.email?.trim() || '',
      phone: formVal.phone?.trim() || '',
      
     
      is_subscribed: !!formVal.is_subscribed,
    };

    this.userService
      .updateUser(this.userId(), payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const updatedUser = response?.data;
          this.#user.set(updatedUser ?? null);
          this.successMessage.set('User details updated successfully.');
          this.isSaving.set(false);
        },
        error: (error) => {
          const err = this.userService.apiService.extractApiErrorMessage(error);
          this.errorMessage.set(err || 'Failed to update user.');
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
    const id = this.userId();
    if (!id) {
      this.passwordResetError.set('User ID not found.');
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
      .sendUserPasswordReset(id, confirmText)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.isSendingPasswordReset.set(false);
          const email = this.user()?.email || 'user';
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

  getRoleBadgeClass(role?: string): string {
    switch (role?.toLowerCase()) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'staff':
        return 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300 border-teal-200 dark:border-teal-800';
      case 'vendor':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    }
  }
}

