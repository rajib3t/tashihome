import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../services/auth/auth-service';
import { UserService } from '../../../../services/user/user-service';
import { UserBasicProfileResponse } from '../../../../services/user/user.model';
import { Avatar } from '../../../../shared/components/users/avatar/avatar';
import { Modal } from '../../../../shared/components/ui/modal/modal';
import { environment } from '../../../../../environments/environment';
import { BookingService } from '../../../../services/booking/booking-service';
import { BookingData, RazorpayVerifyRequest } from '../../../../services/booking/booking.model';
import { RazorpayService } from '../../../../services/booking/razorpay-service';
import { SettingsService } from '../../../../services/settings/settings-service';
import { AppDatePipe } from '../../../../pipes/app-date-pipe/app-date-pipe';


export type ProfileTab = 'trips' | 'saved' | 'reviews' | 'account' | 'security';

@Component({
  selector: 'app-profile',
  imports: [
    CommonModule,
    RouterLink,
    Avatar,
    Modal,
    ReactiveFormsModule,
    AppDatePipe,
  ],
  styleUrl: './profile.css',
  templateUrl: './profile.html',
})
export class Profile implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);
  public readonly bookingService = inject(BookingService);
  private readonly razorpayService = inject(RazorpayService);
  private readonly settingsService = inject(SettingsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);



  public readonly assetUrl = environment.assetUrl;
  public readonly isPaymentDisabled = !!environment.disablePayment;

  public readonly authUser = this.authService.authUser;
  public readonly user = signal<UserBasicProfileResponse | null>(null);
  public readonly activeTab = signal<ProfileTab>('account');

  public readonly userBookings = signal<BookingData[]>([]);
  public readonly isLoadingBookings = signal<boolean>(false);

  public readonly isLoading = signal<boolean>(false);
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

  // Booking Cancellation State
  public readonly selectedBookingToCancel = signal<BookingData | null>(null);
  public readonly isCancelModalOpen = signal<boolean>(false);
  public readonly isCancellingBooking = signal<boolean>(false);
  public readonly cancelReason = signal<string>('');
  public readonly cancelSuccessMessage = signal<string | null>(null);
  public readonly cancelErrorMessage = signal<string | null>(null);

  // Booking Payment State
  public readonly isCompletingPayment = signal<string | null>(null);
  public readonly paymentSuccessMessage = signal<string | null>(null);
  public readonly paymentErrorMessage = signal<string | null>(null);

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

  public selectTab(tab: ProfileTab): void {
    this.activeTab.set(tab);
    this.infoSuccessMessage.set(null);
    this.infoErrorMessage.set(null);
    this.passwordSuccessMessage.set(null);
    this.passwordErrorMessage.set(null);

    if (tab === 'trips') {
      this.loadUserBookings();
    }
  }

  public loadUserBookings(): void {
    this.isLoadingBookings.set(true);
    this.bookingService.getUserBookings()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: any) => {
          const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
          this.userBookings.set(list);
          this.isLoadingBookings.set(false);
        },
        error: () => {
          this.isLoadingBookings.set(false);
        }
      });
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
        error: () => {
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
          this.infoSuccessMessage.set('Profile details updated successfully.');
        },
        error: (error) => {
          this.isUpdatingInfo.set(false);
          const err = this.userService.apiService.extractApiErrorMessage(error);
          this.infoErrorMessage.set(err || 'Failed to update personal information.');
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
          this.passwordSuccessMessage.set('Password has been changed securely.');
          this.passwordForm.reset();
        },
        error: (error) => {
          this.isUpdatingPassword.set(false);
          const err = this.userService.apiService.extractApiErrorMessage(error);
          this.passwordErrorMessage.set(err || 'Failed to update password. Please check your current password.');
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

  public openCancelBookingModal(booking: BookingData): void {
    this.selectedBookingToCancel.set(booking);
    this.cancelReason.set('');
    this.cancelSuccessMessage.set(null);
    this.cancelErrorMessage.set(null);
    this.isCancelModalOpen.set(true);
  }

  public closeCancelBookingModal(): void {
    this.isCancelModalOpen.set(false);
    this.selectedBookingToCancel.set(null);
    this.cancelReason.set('');
    this.cancelErrorMessage.set(null);
  }

  public confirmCancelBooking(): void {
    const booking = this.selectedBookingToCancel();
    if (!booking?.id) return;

    // Preserve this before closing the modal, which intentionally clears the input state.
    const cancellationReason = this.cancelReason().trim();

    this.isCancellingBooking.set(true);
    this.cancelErrorMessage.set(null);

    this.bookingService
      .cancelBooking(booking.id, {
        reason: cancellationReason || undefined,
        cancellation_reason: cancellationReason || undefined,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.isCancellingBooking.set(false);
          this.closeCancelBookingModal();

          // Update booking in local list
          const updatedList = this.userBookings().map((b) =>
            b.id === booking.id
              ? { ...b, status: 'cancelled', cancellation_reason: cancellationReason }
              : b
          );
          this.userBookings.set(updatedList);
          this.cancelSuccessMessage.set('Booking has been cancelled successfully.');
        },
        error: (err) => {
          this.isCancellingBooking.set(false);
          const msg = this.bookingService.extractApiErrorMessage(err);
          this.cancelErrorMessage.set(msg || 'Failed to cancel booking. Please try again.');
        },
      });
  }

  public payBookingNow(booking: BookingData): void {
    if (!booking?.id) return;
    if (this.isPaymentDisabled) {
      this.paymentErrorMessage.set('Online payment is currently disabled.');
      return;
    }

    this.isCompletingPayment.set(booking.id);
    this.paymentSuccessMessage.set(null);
    this.paymentErrorMessage.set(null);

    // Load Razorpay SDK lazily (only on user action)
    this.razorpayService.load().then((loaded) => {
      if (!loaded) {
        this.isCompletingPayment.set(null);
        this.paymentErrorMessage.set('Unable to load payment gateway. Please check your internet connection.');
        return;
      }

      this.bookingService
        .createRazorpayOrder(booking.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res) => {
            const order = res.data;
            this.openPaymentModal(booking, order);
          },
          error: () => {
            // Fallback order
            this.openPaymentModal(booking, {});
          },
        });
    });
  }

  private openPaymentModal(booking: BookingData, orderData: any): void {
    if (!isPlatformBrowser(this.platformId) || typeof window === 'undefined') {
      this.isCompletingPayment.set(null);
      return;
    }

    const RazorpayConstructor = (window as any).Razorpay;
    if (!RazorpayConstructor) {
      this.isCompletingPayment.set(null);
      this.paymentErrorMessage.set('Payment gateway is initializing. Please try again in a moment.');
      return;
    }

    const authUser = this.authUser() || this.user() || this.authService.getUser();
    const guestPhone = (authUser?.phone || booking.guest?.phone || '').toString().trim();
    const guestName = (authUser?.full_name || booking.guest?.full_name || '').toString().trim();
    const guestEmail = (authUser?.email || booking.guest?.email || '').toString().trim();

    const totalAmount = booking.total_amount || 0;
    const amountInPaise = orderData?.amount ?? (totalAmount * 100);

    const settings = this.settingsService.settingsData();
    const appName = settings['app_name'] || 'Tashi Home';
    const appLogoPath = settings['app_logo'] || '';
    const appLogoUrl = appLogoPath ? this.settingsService.resolveAssetUrl(appLogoPath) : '';

    const options = {
      key: orderData?.key || orderData?.key_id || orderData?.razorpay_key || 'rzp_test_key',
      amount: amountInPaise,
      currency: orderData?.currency || booking.currency || 'INR',
      name: appName,
      image: appLogoUrl || undefined,
      description: `Complete Booking Payment - ${booking.property?.name || 'Stay'}`,
      order_id: orderData?.order_id || orderData?.id || undefined,
      prefill: {
        name: guestName,
        email: guestEmail,
        contact: guestPhone,
        phone: guestPhone,
      },
      notes: {
        phone: guestPhone,
        email: guestEmail,
      },
      theme: {
        color: '#0C4550',
      },
      handler: (response: any) => {
        const verifyData: RazorpayVerifyRequest = {
          razorpay_order_id: response.razorpay_order_id || orderData?.order_id || '',
          razorpay_payment_id: response.razorpay_payment_id || '',
          razorpay_signature: response.razorpay_signature || '',
        };

        this.bookingService
          .verifyRazorpayPayment(booking.id, verifyData)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.isCompletingPayment.set(null);
              // Update local state to confirmed & paid
              const updatedList = this.userBookings().map((b) =>
                b.id === booking.id
                  ? { ...b, status: 'confirmed', payment_status: 'paid' }
                  : b
              );
              this.userBookings.set(updatedList);
              this.paymentSuccessMessage.set(
                `Payment successful! Your booking for "${booking.property?.name || 'Homestay'}" is now confirmed.`
              );
            },
            error: (err) => {
              this.isCompletingPayment.set(null);
              const errTxt = this.bookingService.extractApiErrorMessage(err);
              this.paymentErrorMessage.set(errTxt || 'Payment verification failed. Please contact support.');
            },
          });
      },
      modal: {
        ondismiss: () => {
          this.isCompletingPayment.set(null);
        },
      },
    };

    try {
      const rzp = new RazorpayConstructor(options);
      rzp.open();
    } catch (e) {
      console.error('Failed to open Razorpay modal:', e);
      this.isCompletingPayment.set(null);
      this.paymentErrorMessage.set('Could not open payment window. Please try again.');
    }
  }

  public getProfileImageUrl(): string | undefined {
    const url = this.user()?.is_profile_image_url || this.authUser()?.is_profile_image_url;
    if (!url) return undefined;
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
      return url;
    }
    const base = this.assetUrl.endsWith('/') ? this.assetUrl : `${this.assetUrl}/`;
    const cleanPath = url.startsWith('/') ? url.substring(1) : url;
    return `${base}${cleanPath}`;
  }
}
