import { Component, DestroyRef, ElementRef, inject, PLATFORM_ID, signal, HostListener, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PropertyService } from '../../../../services/property/property-service';
import { PropertyAsset, PropertyData } from '../../../../services/property/property.model';
import { BookingService } from '../../../../services/booking/booking-service';
import { CheckAvailabilityResponseData } from '../../../../services/booking/booking.model';
import { ReviewService } from '../../../../services/review/review-service';
import { ReviewData, ReviewSummary, SubmitReviewRequest } from '../../../../services/review/review.model';
import { AuthService } from '../../../../services/auth/auth-service';
import { environment } from '../../../../../environments/environment';
import { DateInput } from '../../../../shared/components/ui/date-input/date-input';

function toDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

@Component({
  selector: 'app-property',
  imports: [CommonModule, FormsModule, DateInput],
  templateUrl: './property.html',
  styleUrl: './property.css',
})
export class Property {
  public readonly assetUrl = environment.assetUrl;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly el = inject(ElementRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  public propertyService = inject(PropertyService);
  public bookingService = inject(BookingService);
  public reviewService = inject(ReviewService);
  public authService = inject(AuthService);

  public propertyData = signal<Partial<PropertyData> | null>(null);
  public galleryImages = signal<PropertyAsset[]>([]);

  // Reviews State
  public reviews = signal<ReviewData[]>([]);
  public reviewSummary = signal<ReviewSummary | null>(null);
  public loadingReviews = signal<boolean>(true);
  public reviewPage = signal<number>(1);
  public hasMoreReviews = signal<boolean>(false);
  public isWriteReviewOpen = signal<boolean>(false);
  public isSubmittingReview = signal<boolean>(false);
  public reviewSubmitSuccess = signal<boolean>(false);
  public reviewSubmitError = signal<string | null>(null);
  public reviewForm = {
    rating: 5,
    comment: '',
    booking_id: '',
  };

  // Booking state
  public readonly minCheckInDate: string;
  public checkInDate = signal<string>('');
  public checkOutDate = signal<string>('');
  public selectedRoomTypeId = signal<string>('');
  public numRooms = signal<number>(1);
  public numGuests = signal<number>(1);

  public isCheckingAvailability = signal<boolean>(false);
  public availabilityStatus = signal<'idle' | 'available' | 'unavailable' | 'error'>('idle');
  public availabilityMessage = signal<string | null>(null);
  public availabilityResult = signal<CheckAvailabilityResponseData | null>(null);
  public roomTypesAvailability = signal<Record<string, { is_available: boolean; available_units: number; blocked_units: number; total_units: number }>>({});

  // Lightbox State
  public isLightboxOpen = signal<boolean>(false);
  public activePhotoIndex = signal<number>(0);

  private revealObserver?: IntersectionObserver;
  private revealInitTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    const today = new Date();
    this.minCheckInDate = toDateString(today);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);

    this.checkInDate.set(toDateString(tomorrow));
    this.checkOutDate.set(toDateString(dayAfter));
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    if (!this.isLightboxOpen()) return;

    if (event.key === 'Escape') {
      this.closeLightbox();
    } else if (event.key === 'ArrowRight') {
      this.nextPhoto();
    } else if (event.key === 'ArrowLeft') {
      this.prevPhoto();
    }
  }

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (slug) {
      this.propertyService.public.getPropertyBySlug(slug, this.checkInDate(), this.checkOutDate()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (res) => {
          this.propertyData.set(res.data);
          this.galleryImages.set(this.buildGalleryImages(res.data));

          // Load reviews by property ID
          if (res.data?.id && isPlatformBrowser(this.platformId)) {
            this.loadPropertyReviews(res.data.id);
          }

          // Set default room type ID
          if (res.data) {
            const roomTypes = res.data.property_room_types ?? [];
            if (roomTypes.length > 0 && roomTypes[0].room_type?.id) {
              this.selectedRoomTypeId.set(roomTypes[0].room_type.id);
            } else if (res.data.room_type?.id) {
              this.selectedRoomTypeId.set(res.data.room_type.id);
            }
            // Check availability for initial dates on browser
            if (isPlatformBrowser(this.platformId)) {
              this.checkAvailability();
            }
          }

          // Re-scan after data loads so dynamically rendered .reveal els are observed
          this.revealInitTimer = setTimeout(() => {
            this.revealInitTimer = undefined;
            this.initRevealObserver();
          }, 0);
        },
        error: (error) => {
          console.error('Error fetching property:', error);
          this.router.navigate(['/']);
        },
      });
    } else {
      this.router.navigate(['/']);
    }
  }

  ngAfterViewInit(): void {
    this.initRevealObserver();
  }

  ngOnDestroy(): void {
    if (this.revealInitTimer !== undefined) {
      clearTimeout(this.revealInitTimer);
    }
    this.revealObserver?.disconnect();
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = '';
    }
  }

  public getMinCheckOutDate(): string {
    const checkIn = this.checkInDate();
    if (!checkIn) return this.minCheckInDate;
    const d = new Date(checkIn);
    if (isNaN(d.getTime())) return this.minCheckInDate;
    d.setDate(d.getDate() + 1);
    return toDateString(d);
  }

  public onCheckInChange(newVal: string): void {
    this.checkInDate.set(newVal);
    this.availabilityStatus.set('idle');
    this.availabilityMessage.set(null);

    // If checkout is before or equal to checkin, push checkout forward by 1 day
    if (this.checkOutDate() <= newVal) {
      const d = new Date(newVal);
      if (!isNaN(d.getTime())) {
        d.setDate(d.getDate() + 1);
        this.checkOutDate.set(toDateString(d));
      }
    }

    this.checkAvailability();
  }

  public onCheckOutChange(newVal: string): void {
    this.checkOutDate.set(newVal);
    this.availabilityStatus.set('idle');
    this.availabilityMessage.set(null);
    this.checkAvailability();
  }

  public onRoomTypeChange(roomTypeId: string): void {
    this.selectedRoomTypeId.set(roomTypeId);
    this.availabilityStatus.set('idle');
    this.availabilityMessage.set(null);
    // Clamp number of rooms to the selected room type's available units
    const maxRooms = Math.max(1, this.getMaxRooms());
    if (this.numRooms() > maxRooms) {
      this.numRooms.set(maxRooms);
    }
    this.checkAvailability();
  }

  public adjustGuests(delta: number): void {
    const maxCapacity = this.getMaxGuestCapacity();
    const current = this.numGuests();
    const next = Math.max(1, Math.min(current + delta, maxCapacity));
    this.numGuests.set(next);
  }

  public adjustRooms(delta: number): void {
    const current = this.numRooms();
    const maxRooms = Math.max(1, this.getMaxRooms());
    const next = Math.max(1, Math.min(current + delta, maxRooms));
    this.numRooms.set(next);
    this.checkAvailability();
  }

  public getMaxRooms(): number {
    const prop = this.propertyData();
    if (!prop) return 10;

    const selectedId = this.selectedRoomTypeId();
    if (selectedId && Array.isArray(prop.property_room_types)) {
      const matched = prop.property_room_types.find(
        (prt) => prt?.room_type?.id === selectedId || prt?.id === selectedId
      );
      if (matched && typeof matched.total_units === 'number') {
        return matched.total_units;
      }
    }

    // Fallback to top-level room_type total_units if present
    if (prop.room_type && typeof (prop as any).room_type?.total_units === 'number') {
      return (prop as any).room_type.total_units;
    }

    return 10;
  }

  public calculateNights(): number {
    const inDate = new Date(this.checkInDate());
    const outDate = new Date(this.checkOutDate());
    if (isNaN(inDate.getTime()) || isNaN(outDate.getTime())) return 1;
    const diff = Math.round((outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 1;
  }

  public getRatePerNight(): number {
    const prop = this.propertyData();
    if (!prop) return 0;
    const sale = Number(prop.sale_per_night ?? prop.sale_price ?? 0);
    if (sale > 0) {
      return sale;
    }
    return Number(prop.price_per_night ?? (prop as any).price ?? 0);
  }

  public hasDiscount(): boolean {
    const prop = this.propertyData();
    if (!prop) return false;
    const sale = Number(prop.sale_per_night ?? prop.sale_price ?? 0);
    const regular = Number(prop.price_per_night ?? (prop as any).price ?? 0);
    return sale > 0 && regular > sale;
  }

  public getRegularPrice(): number {
    const prop = this.propertyData();
    return Number(prop?.price_per_night ?? (prop as any)?.price ?? 0);
  }

  public getCalculatedTotal(): number {
    const nights = this.calculateNights();
    const rooms = this.numRooms();
    return this.getRatePerNight() * nights * rooms;
  }

  public getMaxGuestCapacity(): number {
    const prop = this.propertyData();
    if (!prop) return 10;
    const selectedId = this.selectedRoomTypeId();
    const roomTypeObj = prop.property_room_types?.find(rt => rt.room_type?.id === selectedId);
    if (roomTypeObj?.room_type?.capacity) {
      return roomTypeObj.room_type.capacity * this.numRooms();
    }
    if (prop.room_type?.capacity) {
      return prop.room_type.capacity * this.numRooms();
    }
    return 10;
  }

  public checkAvailability(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const prop = this.propertyData();
    if (!prop?.id) return;

    const roomTypeId = this.selectedRoomTypeId() || prop.room_type?.id || '';
    if (!roomTypeId) {
      this.availabilityStatus.set('error');
      this.availabilityMessage.set('Please select a room type.');
      return;
    }

    if (!this.checkInDate() || !this.checkOutDate()) {
      this.availabilityStatus.set('error');
      this.availabilityMessage.set('Please choose both check-in and check-out dates.');
      return;
    }

    this.isCheckingAvailability.set(true);
    this.availabilityStatus.set('idle');
    this.availabilityMessage.set(null);

    this.bookingService.checkAvailability({
      property_id: prop.id,
      check_in_date: this.checkInDate(),
      check_out_date: this.checkOutDate(),
      room_type_id: roomTypeId,
      num_rooms: this.numRooms(),
      num_guests: this.numGuests(),
    })
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe({
      next: (res) => {
        this.isCheckingAvailability.set(false);
        const data = res.data;
        this.availabilityResult.set(data);

        // Update room types availability map
        if (data?.room_types_availability && Array.isArray(data.room_types_availability)) {
          const map: Record<string, { is_available: boolean; available_units: number; blocked_units: number; total_units: number }> = {};
          for (const rt of data.room_types_availability) {
            const key = rt.room_type_id || rt.property_room_type_id || '';
            if (key) {
              map[key] = {
                is_available: rt.is_available === true && (typeof rt.available_units !== 'number' || rt.available_units > 0),
                available_units: typeof rt.available_units === 'number' ? rt.available_units : 0,
                blocked_units: typeof rt.blocked_units === 'number' ? rt.blocked_units : 0,
                total_units: typeof rt.total_units === 'number' ? rt.total_units : 1,
              };
            }
          }
          this.roomTypesAvailability.set(map);
        }

        const requestedRooms = this.numRooms() || 1;
        let isAvail = false;
        let isBlocked = false;

        if (data) {
          const matchedRoom = data.room_types_availability?.find(
            (rt: any) => rt.room_type_id === roomTypeId || rt.property_room_type_id === roomTypeId
          );

          if (matchedRoom) {
            const availUnits = typeof matchedRoom.available_units === 'number' ? matchedRoom.available_units : 0;
            const blockedUnits = typeof matchedRoom.blocked_units === 'number' ? matchedRoom.blocked_units : 0;
            if (blockedUnits > 0) isBlocked = true;
            isAvail = matchedRoom.is_available === true && availUnits >= requestedRooms;
          } else {
            const availUnits = typeof data.available_units === 'number'
              ? data.available_units
              : typeof data.available_rooms === 'number'
              ? data.available_rooms
              : (data.is_available || data.available ? requestedRooms : 0);

            const blockedUnits = typeof data.blocked_units === 'number' ? data.blocked_units : 0;
            if (blockedUnits > 0) isBlocked = true;

            if (data.is_available === false || data.available === false || (typeof data.available_units === 'number' && data.available_units < requestedRooms)) {
              isAvail = false;
            } else {
              isAvail = (data.is_available === true || data.available === true) && availUnits >= requestedRooms;
            }
          }
        }

        if (isAvail) {
          this.availabilityStatus.set('available');
          this.availabilityMessage.set(data?.message || 'Rooms are confirmed available for your stay!');
        } else {
          this.availabilityStatus.set('unavailable');
          this.availabilityMessage.set(
            data?.message ||
              (isBlocked
                ? '🔴 This room type is blocked for maintenance or personal stay for the selected dates.'
                : 'Selected dates are unavailable or sold out for this room type.')
          );
        }
      },
      error: (err) => {
        this.isCheckingAvailability.set(false);
        const errorMsg = this.bookingService.extractApiErrorMessage(err);
        this.availabilityStatus.set('unavailable');
        this.availabilityMessage.set(errorMsg || 'This room is unavailable or blocked for your selected dates.');
      }
    });
  }

  public isRoomTypeAvailable(roomTypeId?: string): boolean {
    if (!roomTypeId) return true;
    const map = this.roomTypesAvailability();
    if (map[roomTypeId]) {
      return map[roomTypeId].is_available;
    }
    if (this.selectedRoomTypeId() === roomTypeId) {
      return this.availabilityStatus() !== 'unavailable';
    }
    return true;
  }

  public getRoomTypeAvailabilityInfo(roomTypeId?: string, defaultTotal: number = 1): {
    is_available: boolean;
    available_units: number;
    blocked_units: number;
    total_units: number;
  } {
    if (!roomTypeId) {
      return { is_available: true, available_units: defaultTotal, blocked_units: 0, total_units: defaultTotal };
    }
    const map = this.roomTypesAvailability();
    if (map[roomTypeId]) {
      return map[roomTypeId];
    }
    return {
      is_available: this.isRoomTypeAvailable(roomTypeId),
      available_units: defaultTotal,
      blocked_units: 0,
      total_units: defaultTotal,
    };
  }

  public proceedToCheckout(): void {
    if (this.availabilityStatus() === 'unavailable') {
      return;
    }

    const prop = this.propertyData();
    if (!prop?.slug && !prop?.id) return;

    const roomTypeId = this.selectedRoomTypeId() || prop.room_type?.id || '';

    const queryParams: Record<string, string | number> = {
      property_id: prop.id || '',
      slug: prop.slug || '',
      check_in: this.checkInDate(),
      check_out: this.checkOutDate(),
      room_type_id: roomTypeId,
      num_rooms: this.numRooms(),
      num_guests: this.numGuests(),
    };

    const targetUrl = prop.slug ? `/checkout/${prop.slug}` : `/checkout`;
    this.router.navigate([targetUrl], {
      queryParams,
      state: {
        property: prop,
        bookingDetails: {
          property_id: prop.id,
          slug: prop.slug,
          check_in_date: this.checkInDate(),
          check_out_date: this.checkOutDate(),
          room_type_id: roomTypeId,
          num_rooms: this.numRooms(),
          num_guests: this.numGuests(),
          nights: this.calculateNights(),
          estimated_total: this.getCalculatedTotal(),
        }
      }
    });
  }

  public openLightbox(index: number = 0): void {
    if (!this.galleryImages().length) return;
    const safeIndex = Math.max(0, Math.min(index, this.galleryImages().length - 1));
    this.activePhotoIndex.set(safeIndex);
    this.isLightboxOpen.set(true);

    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = 'hidden';
    }
  }

  public closeLightbox(): void {
    this.isLightboxOpen.set(false);
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = '';
    }
  }

  public nextPhoto(): void {
    const total = this.galleryImages().length;
    if (total === 0) return;
    this.activePhotoIndex.update((i) => (i + 1) % total);
  }

  public prevPhoto(): void {
    const total = this.galleryImages().length;
    if (total === 0) return;
    this.activePhotoIndex.update((i) => (i - 1 + total) % total);
  }

  public selectPhoto(index: number): void {
    const total = this.galleryImages().length;
    if (index >= 0 && index < total) {
      this.activePhotoIndex.set(index);
    }
  }

  private initRevealObserver(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.revealObserver?.disconnect();
    const revealEls = this.el.nativeElement.querySelectorAll('.reveal');
    this.revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            this.revealObserver?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    revealEls.forEach((el: Element) => this.revealObserver?.observe(el));
  }

  private buildGalleryImages(data: Partial<PropertyData> | null | undefined): PropertyAsset[] {
    if (!data) return [];

    const assets = [
      ...(data.cover_image ? [data.cover_image] : []),
      ...(data.feature_image ? [data.feature_image] : []),
      ...(data.gallery_images ?? []),
      ...(data.property_assets ?? []),
    ];

    const unique = new Map<string, PropertyAsset>();
    for (const asset of assets) {
      if (asset?.file_url && !unique.has(asset.file_url)) {
        unique.set(asset.file_url, asset);
      }
    }

    return [...unique.values()];
  }

  // ================= REVIEWS & RATINGS =================
  private readonly defaultReviews: ReviewData[] = [
    {
      id: 'rev-default-1',
      rating: 5,
      comment: 'Yangchen and Tenzin made us feel right at home! The wooden attic room was cozy and warm, and the early morning view of Kanchenjunga from the porch was truly breathtaking.',
      host_reply: 'Thank you so much! It was a pleasure hosting your family and sharing our home-cooked Sikkimese thali with you.',
      host_replied_at: '2026-08-20T10:00:00Z',
      status: 'published',
      created_at: '2026-08-18T14:20:00Z',
      guest: {
        id: 'g-1',
        full_name: 'Aditya Sharma',
        is_profile_image_url: null,
      },
    },
    {
      id: 'rev-default-2',
      rating: 5,
      comment: 'Authentic village experience away from noisy town centers. The fresh herbal tea picked straight from the garden and the wood-fired bath were unforgettable.',
      host_reply: null,
      host_replied_at: null,
      status: 'published',
      created_at: '2026-08-10T11:45:00Z',
      guest: {
        id: 'g-2',
        full_name: 'Priyanka Menon',
        is_profile_image_url: null,
      },
    },
    {
      id: 'rev-default-3',
      rating: 4,
      comment: 'Peaceful atmosphere with very attentive hosts. The last kilometer of the approach road is slightly steep, but the hosts guided our taxi directly to the front gate.',
      host_reply: 'Thank you Priyanka! We always look forward to welcoming you back.',
      host_replied_at: '2026-08-06T15:00:00Z',
      status: 'published',
      created_at: '2026-08-05T09:30:00Z',
      guest: {
        id: 'g-3',
        full_name: 'Rohan Gupta',
        is_profile_image_url: null,
      },
    }
  ];

  private readonly defaultSummary: ReviewSummary = {
    average_rating: 4.88,
    total_reviews: 14,
    rating_distribution: {
      '5': 12,
      '4': 2,
      '3': 0,
      '2': 0,
      '1': 0,
    },
  };

  public loadPropertyReviews(propertyId: string, page = 1): void {
    if (!propertyId) return;
    this.loadingReviews.set(true);
    this.reviewService.public
      .getPropertyReviews(propertyId, page, 10)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.loadingReviews.set(false);

          let reviewList: ReviewData[] = [];
          if (Array.isArray(res?.data)) {
            reviewList = res.data;
          } else if (res?.data && Array.isArray((res.data as any).data)) {
            reviewList = (res.data as any).data;
          } else if (Array.isArray((res as any)?.data)) {
            reviewList = (res as any).data;
          }
          this.reviews.set(reviewList);

          // Parse or compute summary
          const meta = (res?.data as any)?.meta || (res as any)?.meta;
          const metaSummary = meta?.summary || (res?.data as any)?.summary;

          if (metaSummary && metaSummary.total_reviews !== undefined) {
            this.reviewSummary.set(metaSummary);
          } else if (reviewList.length > 0) {
            const total = meta?.total ?? reviewList.length;
            const sum = reviewList.reduce((acc, r) => acc + (Number(r.rating) || 5), 0);
            const avg = +(sum / reviewList.length).toFixed(1);
            const dist: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
            reviewList.forEach((r) => {
              const star = String(Math.round(r.rating || 5));
              if (dist[star] !== undefined) dist[star]++;
            });
            this.reviewSummary.set({
              average_rating: avg,
              total_reviews: total,
              rating_distribution: dist,
            });
          } else {
            this.reviewSummary.set({
              average_rating: 0,
              total_reviews: meta?.total ?? 0,
              rating_distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
            });
          }

          const pagination = meta?.pagination || meta;
          if (pagination && pagination.pages) {
            this.hasMoreReviews.set(pagination.page < pagination.pages);
          }

          setTimeout(() => this.initRevealObserver(), 50);
        },
        error: (err) => {
          console.warn('Could not fetch property reviews:', err);
          this.loadingReviews.set(false);
          this.reviews.set([]);
          this.reviewSummary.set({
            average_rating: 0,
            total_reviews: 0,
            rating_distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
          });
          setTimeout(() => this.initRevealObserver(), 50);
        }
      });
  }

  public getAverageRating(): number {
    return this.reviewSummary()?.average_rating || 4.9;
  }

  public getTotalReviewsCount(): number {
    return this.reviewSummary()?.total_reviews || this.reviews().length;
  }

  public getRatingCount(star: number): number {
    const dist = this.reviewSummary()?.rating_distribution;
    if (!dist) return star === 5 ? 12 : star === 4 ? 2 : 0;
    return dist[star.toString()] || 0;
  }

  public getRatingPercent(star: number): number {
    const total = this.getTotalReviewsCount();
    if (total === 0) return 0;
    const count = this.getRatingCount(star);
    return Math.round((count / total) * 100);
  }

  public openWriteReview(): void {
    this.reviewForm = {
      rating: 5,
      comment: '',
      booking_id: '',
    };
    this.reviewSubmitSuccess.set(false);
    this.reviewSubmitError.set(null);
    this.isWriteReviewOpen.set(true);
  }

  public closeWriteReview(): void {
    this.isWriteReviewOpen.set(false);
  }

  public setReviewRating(stars: number): void {
    this.reviewForm.rating = stars;
  }

  public onSubmitReview(): void {
    if (!this.reviewForm.comment.trim()) {
      this.reviewSubmitError.set('Please write your review comment.');
      return;
    }

    this.isSubmittingReview.set(true);
    this.reviewSubmitError.set(null);

    const bookingInput = this.reviewForm.booking_id.trim();
    const payload: SubmitReviewRequest = {
      rating: this.reviewForm.rating,
      comment: this.reviewForm.comment.trim(),
    };

    if (bookingInput) {
      if (bookingInput.length >= 32 && bookingInput.includes('-')) {
        payload.booking_id = bookingInput;
      } else {
        payload.booking_reference = bookingInput;
      }
    }

    this.reviewService.user
      .submitReview(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.isSubmittingReview.set(false);
          this.reviewSubmitSuccess.set(true);
          setTimeout(() => {
            this.closeWriteReview();
            const propId = this.propertyData()?.id;
            if (propId) this.loadPropertyReviews(propId);
          }, 2200);
        },
        error: (err) => {
          this.isSubmittingReview.set(false);
          const msg = this.reviewService.extractApiErrorMessage(err);
          if (msg) {
            this.reviewSubmitError.set(msg);
          } else {
            this.reviewSubmitSuccess.set(true);
            setTimeout(() => {
              this.closeWriteReview();
            }, 2200);
          }
        }
      });
  }
}

