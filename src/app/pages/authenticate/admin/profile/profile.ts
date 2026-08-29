import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PageBreadcrumb } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb';
import { Card } from '../../../../shared/components/ui/card/card';
import { Modal } from '../../../../shared/components/ui/modal/modal';
import { Avatar } from '../../../../shared/components/users/avatar/avatar';
import { UserService } from '../../../../services/user/user-service';
import { AuthService } from '../../../../services/auth/auth-service';
import { UserBasicProfileResponse } from '../../../../services/user/user.model';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-admin-profile',
  imports: [
    CommonModule,
    PageBreadcrumb,
    Card,
    Modal,
    Avatar,
    ReactiveFormsModule,
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class AdminProfile implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);

  public readonly assetUrl = environment.assetUrl;

  public readonly user = signal<UserBasicProfileResponse | null>(null);
  public readonly isLoading = signal<boolean>(true);
  public readonly isUpdatingInfo = signal<boolean>(false);
  public readonly isUpdatingPassword = signal<boolean>(false);
  public readonly isUploadingImage = signal<boolean>(false);
  public readonly isDeletingImage = signal<boolean>(false);

  public readonly infoSuccessMessage = signal<string | null>(null);
  public readonly infoErrorMessage = signal<string | null>(null);

  public readonly passwordSuccessMessage = signal<string | null>(null);
  public readonly passwordErrorMessage = signal<string | null>(null);

  public readonly imageSuccessMessage = signal<string | null>(null);
  public readonly imageErrorMessage = signal<string | null>(null);

  public readonly showCurrentPassword = signal<boolean>(false);
  public readonly showNewPassword = signal<boolean>(false);
  public readonly showConfirmPassword = signal<boolean>(false);

  public readonly isDeleteModalOpen = signal<boolean>(false);

  public readonly infoForm = this.fb.group({
    full_name: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.required]],
    is_subscribed: [false],
  });

  public readonly passwordForm = this.fb.group({
    current_password: ['', [Validators.required]],
    new_password: ['', [Validators.required, Validators.minLength(8)]],
    confirm_password: ['', [Validators.required]],
  });

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadProfile();
    }
  }

  public loadProfile(): void {
    this.isLoading.set(true);
    this.userService.getProfile()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const profile = response.data;
          this.user.set(profile);
          if (profile) {
            this.authService.updateCurrentUser(profile);
            this.infoForm.patchValue({
              full_name: profile.full_name || '',
              phone: profile.phone || '',
              is_subscribed: !!profile.is_subscribed,
            });
          }
          this.isLoading.set(false);
        },
        error: (error) => {
          const cached = this.authService.getUser();
          if (cached) {
            this.user.set(cached as UserBasicProfileResponse);
            this.infoForm.patchValue({
              full_name: cached.full_name || '',
              phone: cached.phone || '',
              is_subscribed: !!cached.is_subscribed,
            });
          }
          this.isLoading.set(false);
          const err = this.userService.apiService.extractApiErrorMessage(error);
          this.infoErrorMessage.set(err || 'Failed to load profile details.');
        },
      });
  }

  public onUpdateInfo(): void {
    this.infoSuccessMessage.set(null);
    this.infoErrorMessage.set(null);

    if (this.infoForm.invalid) {
      this.infoForm.markAllAsTouched();
      return;
    }

    const { full_name, phone, is_subscribed } = this.infoForm.getRawValue();
    this.isUpdatingInfo.set(true);

    this.userService.updateProfileInfo({
      full_name: full_name?.trim() || '',
      phone: phone?.trim() || '',
      is_subscribed: !!is_subscribed,
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const updated = response.data;
          this.user.set(updated);
          if (updated) {
            this.authService.updateCurrentUser(updated);
          }
          this.isUpdatingInfo.set(false);
          this.infoSuccessMessage.set('Profile information updated successfully.');
        },
        error: (error) => {
          this.isUpdatingInfo.set(false);
          const err = this.userService.apiService.extractApiErrorMessage(error);
          this.infoErrorMessage.set(err || 'Failed to update profile information.');
        },
      });
  }

  public onUpdatePassword(): void {
    this.passwordSuccessMessage.set(null);
    this.passwordErrorMessage.set(null);

    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const { current_password, new_password, confirm_password } = this.passwordForm.getRawValue();

    if (new_password !== confirm_password) {
      this.passwordErrorMessage.set('New password and confirm password do not match.');
      return;
    }

    this.isUpdatingPassword.set(true);

    this.userService.updatePassword({
      current_password: current_password || '',
      old_password: current_password || '',
      password: new_password || '',
      new_password: new_password || '',
      confirm_password: confirm_password || '',
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isUpdatingPassword.set(false);
          this.passwordSuccessMessage.set('Password changed successfully.');
          this.passwordForm.reset();
        },
        error: (error) => {
          this.isUpdatingPassword.set(false);
          const err = this.userService.apiService.extractApiErrorMessage(error);
          this.passwordErrorMessage.set(err || 'Failed to change password. Please verify your current password.');
        },
      });
  }

  public onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.uploadImage(file);
    input.value = '';
  }

  public uploadImage(file: File): void {
    this.imageSuccessMessage.set(null);
    this.imageErrorMessage.set(null);
    this.isUploadingImage.set(true);

    this.userService.uploadProfileImage(file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const updated = response.data;
          this.user.set(updated);
          if (updated) {
            this.authService.updateCurrentUser(updated);
          }
          this.isUploadingImage.set(false);
          this.imageSuccessMessage.set('Profile image updated successfully.');
        },
        error: (error) => {
          this.isUploadingImage.set(false);
          const err = this.userService.apiService.extractApiErrorMessage(error);
          this.imageErrorMessage.set(err || 'Failed to upload profile image.');
        },
      });
  }

  public openDeleteModal(): void {
    this.isDeleteModalOpen.set(true);
  }

  public closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
  }

  public confirmDeleteImage(): void {
    this.isDeletingImage.set(true);
    this.imageSuccessMessage.set(null);
    this.imageErrorMessage.set(null);

    this.userService.deleteProfileImage()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const updated = response.data;
          if (updated) {
            this.user.set(updated);
            this.authService.updateCurrentUser(updated);
          } else {
            const currentUser = this.user();
            if (currentUser) {
              const updatedUser = { ...currentUser, is_profile_image_url: '' };
              this.user.set(updatedUser);
              this.authService.updateCurrentUser(updatedUser);
            }
          }
          this.isDeletingImage.set(false);
          this.closeDeleteModal();
          this.imageSuccessMessage.set('Profile image removed successfully.');
        },
        error: (error) => {
          this.isDeletingImage.set(false);
          this.closeDeleteModal();
          const err = this.userService.apiService.extractApiErrorMessage(error);
          this.imageErrorMessage.set(err || 'Failed to remove profile image.');
        },
      });
  }

  public getProfileImageUrl(): string | undefined {
    const url = this.user()?.is_profile_image_url;
    if (!url) return undefined;
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
      return url;
    }
    const base = this.assetUrl.endsWith('/') ? this.assetUrl : `${this.assetUrl}/`;
    const cleanPath = url.startsWith('/') ? url.substring(1) : url;
    return `${base}${cleanPath}`;
  }
}

