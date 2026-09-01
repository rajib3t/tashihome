import { Component, DestroyRef, ElementRef, inject, PLATFORM_ID, signal, HostListener, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PropertyService } from '../../../../services/property/property-service';
import { PropertyAsset, PropertyData } from '../../../../services/property/property.model';
import { BookingService } from '../../../../services/booking/booking-service';
import { CheckAvailabilityResponseData } from '../../../../services/booking/booking.model';
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

  public propertyData = signal<Partial<PropertyData> | null>(null);
  public galleryImages = signal<PropertyAsset[]>([]);

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
    const next = Math.max(1, Math.min(current + delta, 10));
    this.numRooms.set(next);
    this.checkAvailability();
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
    return prop?.sale_per_night ?? prop?.price_per_night ?? prop?.sale_price ?? 0;
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
}
