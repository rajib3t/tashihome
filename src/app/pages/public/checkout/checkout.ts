import {
  Component,
  DestroyRef,
  OnInit,
  PLATFORM_ID,
  inject,
  signal,
  computed,
  effect,
} from '@angular/core';
import { CommonModule, DecimalPipe, isPlatformBrowser } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PropertyService } from '../../../services/property/property-service';
import { PropertyData, RoomType } from '../../../services/property/property.model';
import { BookingService } from '../../../services/booking/booking-service';
import { AuthService } from '../../../services/auth/auth-service';
import { UserService } from '../../../services/user/user-service';
import {
  BookingData,
  CheckAvailabilityResponseData,
  RazorpayVerifyRequest,
} from '../../../services/booking/booking.model';
import { environment } from '../../../../environments/environment';
import { RazorpayService } from '../../../services/booking/razorpay-service';
import { SettingsService } from '../../../services/settings/settings-service';



function toDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

@Component({
  selector: 'app-checkout',
  imports: [CommonModule, DecimalPipe, ReactiveFormsModule, RouterLink],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css',
})
export class Checkout implements OnInit {
  public readonly assetUrl = environment.assetUrl;
  public readonly isPaymentDisabled = !!environment.disablePayment;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);

  public readonly propertyService = inject(PropertyService);
  public readonly bookingService = inject(BookingService);
  public readonly authService = inject(AuthService);
  public readonly userService = inject(UserService);
  private readonly razorpayService = inject(RazorpayService);
  private readonly settingsService = inject(SettingsService);


  // Property & Booking State
  public property = signal<Partial<PropertyData> | null>(null);
  public selectedRoomType = signal<RoomType | null>(null);
  public checkInDate = signal<string>('');
  public checkOutDate = signal<string>('');
  public numGuests = signal<number>(1);
  public numRooms = signal<number>(1);

  // Availability State
  public isCheckingAvailability = signal<boolean>(false);
  public isAvailable = signal<boolean | null>(null);
  public availabilityMessage = signal<string | null>(null);

  // Form & Process State
  public isSubmitting = signal<boolean>(false);
  public isProcessingPayment = signal<boolean>(false);
  public paymentMethod = signal<'razorpay' | 'pay_at_homestay'>('razorpay');
  public bookingError = signal<string | null>(null);

  // Post Booking Confirmation
  public confirmedBooking = signal<BookingData | null>(null);
  public isBookingComplete = signal<boolean>(false);

  // Login Modal State
  public isLoginModalOpen = signal<boolean>(false);
  public loginErrorMessage = signal<string | null>(null);
  public isLoggingIn = signal<boolean>(false);

  public readonly guestForm: FormGroup = this.fb.group({
    full_name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.minLength(7)]],
    special_requests: [''],
    terms_agreed: [true, [Validators.requiredTrue]],
  });

  public readonly inlineLoginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  public readonly minCheckInDate: string;

  constructor() {
    const today = new Date();
    this.minCheckInDate = toDateString(today);

    // Reactively prefill guest details whenever user becomes available
    effect(() => {
      const currentUser = this.authService.authUser() || this.authService.getUser();
      if (currentUser) {
        this.guestForm.patchValue({
          full_name: currentUser.full_name || this.guestForm.value.full_name || '',
          email: currentUser.email || this.guestForm.value.email || '',
          phone: currentUser.phone || this.guestForm.value.phone || '',
        });
      }
    });
  }

  ngOnInit(): void {
    // If authenticated, also ensure latest full profile (with phone) is fetched
    if (isPlatformBrowser(this.platformId) && this.authService.isAuthenticated()) {
      this.userService.getProfile()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res) => {
            const profile = res.data;
            if (profile) {
              this.authService.updateCurrentUser(profile);
              this.guestForm.patchValue({
                full_name: profile.full_name || this.guestForm.value.full_name || '',
                email: profile.email || this.guestForm.value.email || '',
                phone: profile.phone || this.guestForm.value.phone || '',
              });
            }
          },
        });
    }

    // Read route state or query params
    const nav = this.router.getCurrentNavigation();
    const stateData = nav?.extras?.state || (isPlatformBrowser(this.platformId) ? history.state : null);

    const qp = this.route.snapshot.queryParams;
    const slug = this.route.snapshot.paramMap.get('slug') || qp['slug'] || '';
    const propertyId = qp['property_id'] || '';

    const inDate = qp['check_in'] || stateData?.bookingDetails?.check_in_date;
    const outDate = qp['check_out'] || stateData?.bookingDetails?.check_out_date;
    const roomTypeId = qp['room_type_id'] || stateData?.bookingDetails?.room_type_id;
    const rooms = qp['num_rooms'] ? Number(qp['num_rooms']) : stateData?.bookingDetails?.num_rooms || 1;
    const guests = qp['num_guests'] ? Number(qp['num_guests']) : stateData?.bookingDetails?.num_guests || 1;

    // Set Dates
    if (inDate) {
      this.checkInDate.set(inDate);
    } else {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      this.checkInDate.set(toDateString(tomorrow));
    }

    if (outDate) {
      this.checkOutDate.set(outDate);
    } else {
      const dayAfter = new Date();
      dayAfter.setDate(dayAfter.getDate() + 2);
      this.checkOutDate.set(toDateString(dayAfter));
    }

    this.numRooms.set(rooms);
    this.numGuests.set(guests);

    // Initial pre-populate
    const currentUser = this.authService.authUser() || this.authService.getUser();
    if (currentUser) {
      this.guestForm.patchValue({
        full_name: currentUser.full_name || '',
        email: currentUser.email || '',
        phone: currentUser.phone || '',
      });
    }

    // Load Property
    if (stateData?.property) {
      this.setPropertyData(stateData.property, roomTypeId);
    } else if (slug) {
      this.loadPropertyBySlug(slug, roomTypeId);
    } else if (propertyId) {
      this.loadPropertyById(propertyId, roomTypeId);
    } else {
      this.router.navigate(['/stays']);
    }
  }


  private loadPropertyBySlug(slug: string, preferredRoomTypeId?: string): void {
    this.propertyService.public
      .getPropertyBySlug(slug)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.setPropertyData(res.data, preferredRoomTypeId);
        },
        error: (err) => {
          console.error('Failed to load property for checkout:', err);
          this.router.navigate(['/stays']);
        },
      });
  }

  private loadPropertyById(id: string, preferredRoomTypeId?: string): void {
    this.propertyService.admin
      .getPropertyById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.setPropertyData(res.data, preferredRoomTypeId);
        },
        error: (err) => {
          console.error('Failed to load property by id for checkout:', err);
          this.router.navigate(['/stays']);
        },
      });
  }

  private setPropertyData(data: Partial<PropertyData>, preferredRoomTypeId?: string): void {
    this.property.set(data);

    // Find room type
    const roomTypes = data.property_room_types ?? [];
    if (preferredRoomTypeId && roomTypes.length > 0) {
      const match = roomTypes.find(
        (rt) => rt.room_type?.id === preferredRoomTypeId || rt.id === preferredRoomTypeId
      );
      if (match?.room_type) {
        this.selectedRoomType.set(match.room_type);
      }
    }

    if (!this.selectedRoomType()) {
      if (roomTypes.length > 0 && roomTypes[0].room_type) {
        this.selectedRoomType.set(roomTypes[0].room_type);
      } else if (data.room_type) {
        this.selectedRoomType.set(data.room_type);
      }
    }

    // Verify availability
    this.verifyAvailability();
  }

  public verifyAvailability(): void {
    const prop = this.property();
    const rtId = this.selectedRoomType()?.id;
    if (!prop?.id || !rtId || !this.checkInDate() || !this.checkOutDate()) return;

    this.isCheckingAvailability.set(true);
    this.bookingService
      .checkAvailability({
        property_id: prop.id,
        check_in_date: this.checkInDate(),
        check_out_date: this.checkOutDate(),
        room_type_id: rtId,
        num_rooms: this.numRooms(),
        num_guests: this.numGuests(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.isCheckingAvailability.set(false);
          const data = res.data;
          const available = data?.available !== false && data?.is_available !== false;
          this.isAvailable.set(available);
          this.availabilityMessage.set(
            data?.message ||
              (available
                ? 'Rooms are confirmed available for these dates.'
                : 'Selected dates are unavailable for this room type.')
          );
        },
        error: (err) => {
          this.isCheckingAvailability.set(false);
          // Non-blocking fallback
          this.isAvailable.set(true);
        },
      });
  }

  public calculateNights(): number {
    const inDate = new Date(this.checkInDate());
    const outDate = new Date(this.checkOutDate());
    if (isNaN(inDate.getTime()) || isNaN(outDate.getTime())) return 1;
    const diff = Math.round((outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 1;
  }

  public getRatePerNight(): number {
    const prop = this.property();
    return prop?.sale_per_night ?? prop?.price_per_night ?? prop?.sale_price ?? 0;
  }

  public getBaseTotal(): number {
    return this.getRatePerNight() * this.calculateNights() * this.numRooms();
  }

  public getDepositAmount(): number {
    const prop = this.property();
    if (prop?.deposit && prop.deposit > 0) {
      return prop.deposit * this.numRooms();
    }
    return 0;
  }

  public getDueOnArrival(): number {
    const deposit = this.getDepositAmount();
    const total = this.getBaseTotal();
    return deposit > 0 && deposit < total ? total - deposit : 0;
  }

  public onConfirmBooking(): void {
    this.bookingError.set(null);

    if (this.guestForm.invalid) {
      this.guestForm.markAllAsTouched();
      return;
    }

    const prop = this.property();
    const roomType = this.selectedRoomType();

    if (!prop?.id || !roomType?.id) {
      this.bookingError.set('Property or room details are missing. Please refresh and try again.');
      return;
    }

    // Check if user is authenticated
    if (!this.authService.isAuthenticated()) {
      this.isLoginModalOpen.set(true);
      return;
    }

    this.processBooking();
  }

  private processBooking(): void {
    const prop = this.property();
    const roomType = this.selectedRoomType();
    if (!prop?.id || !roomType?.id) return;

    this.isSubmitting.set(true);
    this.bookingError.set(null);

    const { special_requests } = this.guestForm.getRawValue();

    const bookingPayload = {
      property_id: prop.id,
      check_in_date: this.checkInDate(),
      check_out_date: this.checkOutDate(),
      room_type_id: roomType.id,
      num_guests: this.numGuests(),
      num_rooms: this.numRooms(),
      special_requests: special_requests?.trim() || undefined,
    };

    this.bookingService
      .createBooking(bookingPayload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.isSubmitting.set(false);
          const booking = res.data;
          const bookingId = booking?.id || (booking as any)?.booking_id;

          if (!bookingId || this.isPaymentDisabled) {
            this.showBookingSuccess(booking);
            return;
          }

          // If online payment is enabled, proceed with Razorpay
          this.initiateRazorpayPayment(bookingId, booking);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          const errorMsg = this.bookingService.extractApiErrorMessage(err);
          this.bookingError.set(
            errorMsg || 'Failed to create booking. Please check your dates and try again.'
          );
        },
      });
  }

  private initiateRazorpayPayment(bookingId: string, booking: BookingData): void {
    this.isProcessingPayment.set(true);

    // Load Razorpay SDK lazily (only now, on user action)
    this.razorpayService.load().then((loaded) => {
      if (!loaded) {
        this.isProcessingPayment.set(false);
        this.showBookingSuccess(booking);
        return;
      }

      this.bookingService
        .createRazorpayOrder(bookingId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res) => {
            const order = res.data;
            if (order && (order.order_id || (order as any).id)) {
              this.openRazorpayModal(bookingId, booking, order);
            } else {
              this.isProcessingPayment.set(false);
              this.showBookingSuccess(booking);
            }
          },
          error: (err) => {
            console.warn('Razorpay order creation response (payment disabled or unavailable):', err);
            this.isProcessingPayment.set(false);
            // Even if online payment gateway is disabled on the backend, the reservation was created
            this.showBookingSuccess(booking);
          },
        });
    });
  }

  private openRazorpayModal(
    bookingId: string,
    booking: BookingData,
    orderData: any
  ): void {
    if (!isPlatformBrowser(this.platformId) || typeof window === 'undefined') {
      this.showBookingSuccess(booking);
      return;
    }

    if (!orderData?.order_id && !orderData?.id && !orderData?.key && !orderData?.key_id && !orderData?.razorpay_key) {
      console.warn('Razorpay order details not available, displaying booking reservation');
      this.isProcessingPayment.set(false);
      this.showBookingSuccess(booking);
      return;
    }

    const RazorpayConstructor = (window as any).Razorpay;
    if (!RazorpayConstructor) {
      console.warn('Razorpay SDK not loaded, displaying booking confirmation');
      this.showBookingSuccess(booking);
      return;
    }

    const authUser = this.authService.authUser() || this.authService.getUser();
    const guestVal = this.guestForm.getRawValue();

    // Populate phone number / contact from guest form or authenticated user
    const contactNumber = (guestVal.phone || authUser?.phone || '').toString().trim();
    const guestName = (guestVal.full_name || authUser?.full_name || '').toString().trim();
    const guestEmail = (guestVal.email || authUser?.email || '').toString().trim();

    const amountInPaise = orderData?.amount ?? (this.getBaseTotal() * 100);

    const settings = this.settingsService.settingsData();
    const appName = settings['app_name'] || 'Tashi Home';
    const appLogoPath = settings['app_logo'] || '';
    const appLogoUrl = appLogoPath ? this.settingsService.resolveAssetUrl(appLogoPath) : '';

    const options = {
      key: orderData?.key || orderData?.key_id || orderData?.razorpay_key || 'rzp_test_key',
      amount: amountInPaise,
      currency: orderData?.currency || 'INR',
      name: appName,
      image: appLogoUrl || undefined,
      description: `Homestay reservation - ${this.property()?.name || 'Stay'}`,
      order_id: orderData?.order_id || orderData?.id || undefined,
      prefill: {
        name: guestName,
        email: guestEmail,
        contact: contactNumber,
        phone: contactNumber,
      },
      notes: {
        phone: contactNumber,
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
          .verifyRazorpayPayment(bookingId, verifyData)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.isProcessingPayment.set(false);
              const updatedBooking: BookingData = {
                ...booking,
                payment_status: 'paid',
                status: 'confirmed',
              };
              this.showBookingSuccess(updatedBooking);
            },
            error: (err) => {
              console.warn('Verification warning:', err);
              this.isProcessingPayment.set(false);
              this.showBookingSuccess(booking);
            },
          });
      },
      modal: {
        ondismiss: () => {
          this.isProcessingPayment.set(false);
          this.showBookingSuccess(booking);
        },
      },
    };

    try {
      const rzp = new RazorpayConstructor(options);
      rzp.open();
    } catch (e) {
      console.error('Failed to open Razorpay modal:', e);
      this.isProcessingPayment.set(false);
      this.showBookingSuccess(booking);
    }
  }

  private recordDirectPayment(bookingId: string, booking: BookingData): void {
    const deposit = this.getDepositAmount();
    const amount = deposit > 0 ? deposit : this.getBaseTotal();

    this.bookingService
      .recordPayment(bookingId, {
        payment_method: 'pay_at_homestay',
        amount: amount,
        transaction_id: `DIRECT-${Date.now()}`,
        gateway: 'internal',
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isProcessingPayment.set(false);
          this.showBookingSuccess(booking);
        },
        error: () => {
          this.isProcessingPayment.set(false);
          this.showBookingSuccess(booking);
        },
      });
  }

  private showBookingSuccess(booking: BookingData): void {
    this.confirmedBooking.set(booking);
    this.isBookingComplete.set(true);
    if (isPlatformBrowser(this.platformId)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  public onInlineLogin(): void {
    this.loginErrorMessage.set(null);
    if (this.inlineLoginForm.invalid) {
      this.inlineLoginForm.markAllAsTouched();
      return;
    }

    const { email, password } = this.inlineLoginForm.getRawValue();
    this.isLoggingIn.set(true);

    this.authService
      .login({ email, password })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.isLoggingIn.set(false);
          this.isLoginModalOpen.set(false);
          const user = res.data?.user;
          if (user) {
            this.guestForm.patchValue({
              full_name: user.full_name || this.guestForm.value.full_name,
              email: user.email || this.guestForm.value.email,
              phone: user.phone || this.guestForm.value.phone,
            });
          }
          // Proceed with booking creation
          this.processBooking();
        },
        error: (err) => {
          this.isLoggingIn.set(false);
          const msg = this.authService.apiService.extractApiErrorMessage(err);
          this.loginErrorMessage.set(msg || 'Invalid email or password.');
        },
      });
  }

  public closeLoginModal(): void {
    this.isLoginModalOpen.set(false);
    this.loginErrorMessage.set(null);
  }

  public printConfirmation(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.print();
    }
  }
}
