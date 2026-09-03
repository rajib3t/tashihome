import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ElementRef,
  Inject,
  PLATFORM_ID,
  ChangeDetectorRef,
  DestroyRef,
  NgZone,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PropertyService } from '../../../services/property/property-service';
import { PropertyData, PropertyQuery, PropertySearch } from '../../../services/property/property.model';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter, catchError, of, forkJoin, retry, timeout } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CityService } from '../../../services/city/city-service';
import { City, CityQuery, CitySearch } from '../../../services/city/city-model';
import { DashboardService } from '../../../services/dashboard/dashboard-service';
import { SettingsService } from '../../../services/settings/settings-service';
import { environment } from '../../../../environments/environment';
import { SingleProperty } from '../../../shared/components/properties/single-property/single-property';

import { TestimonialService } from '../../../services/testimonial/testimonial-service';
import { TestimonialData } from '../../../services/testimonial/testimonial.model';
import { AuthService } from '../../../services/auth/auth-service';

export interface StatItem {
  key?: string;
  target: number;
  current: number;
  suffix?: string;
  decimals?: number;
  label: string;
}

export interface CalendarDay {
  dateStr: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isPast: boolean;
  isToday: boolean;
}

interface MistBlob {
  x: number;
  y: number;
  r: number;
  speed: number;
  bob: number;
  bobSpeed: number;
  phase: number;
  opacity: number;
}

@Component({
  selector: 'app-home',
  imports: [
    CommonModule, 
    FormsModule,
    RouterModule,
    SingleProperty
  ],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit, AfterViewInit, OnDestroy {
  public readonly assetUrl = environment.assetUrl;
  public properties = signal<Partial<PropertyData>[]>([]);
  public cities = signal<Partial<City>[]>([]);
  public testimonials = signal<TestimonialData[]>([]);
  public loadingProperties = signal<boolean>(true);
  public loadingCities = signal<boolean>(true);
  public loadingTestimonials = signal<boolean>(true);
  public loadingStats = signal<boolean>(true);
  public testimonialTab = signal<'all' | 'guest' | 'host'>('all');

  // Testimonial Submission Modal State
  public isSubmitTestimonialOpen = signal<boolean>(false);
  public isSubmittingTestimonial = signal<boolean>(false);
  public testimonialSubmitSuccess = signal<boolean>(false);
  public testimonialSubmitError = signal<string | null>(null);
  public testimonialForm = {
    name: '',
    designation: '',
    rating: 5,
    content: '',
    role: 'user' as 'user' | 'vendor',
  };

  private statsAnimated = false;
  public readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly zone = inject(NgZone);
  private revealObserver?: IntersectionObserver;
  private statsObserver?: IntersectionObserver;
  private statsAnimationFrame?: number;
  private destroyed = false;

  // cleanup handles for canvases / card tilt / parallax effects
  private mistCleanupFns: Array<() => void> = [];
  private tiltCleanupFn?: () => void;
  private parallaxCleanupFn?: () => void;
  private reduceMotion = false;

  selectedCityId: string = '';
  checkInDate: string = '';
  checkOutDate: string = '';
  adultsCount: number = 2;
  childrenCount: number = 0;
  roomsCount: number = 1;
  showGuestsDropdown: boolean = false;
  showDatesDropdown: boolean = false;
  calendarViewDate: Date = new Date();
  calendarDays: CalendarDay[] = [];
  readonly weekdays: string[] = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  minTodayDate: string = new Date().toISOString().split('T')[0];

  newsletterEmail: string = '';
  newsletterSubmitted: boolean = false;

  stats: StatItem[] = [
    { key: 'homes', target: 61, current: 0, label: 'homes on the register' },
    { key: 'states', target: 7, current: 0, label: 'hill states, one circuit' },
    { key: 'verified', target: 100, current: 0, suffix: '%', label: 'visited on foot by us first' },
    { key: 'rating', target: 4.9, current: 0, decimals: 1, label: 'average guest rating' },
  ];

  public readonly propertyService: PropertyService = inject(PropertyService);
  public readonly cityService: CityService = inject(CityService);
  public readonly testimonialService: TestimonialService = inject(TestimonialService);
  public readonly authService: AuthService = inject(AuthService);
  public readonly settingsService: SettingsService = inject(SettingsService);
  public readonly dashboardService: DashboardService = inject(DashboardService);
  constructor(
    private el: ElementRef,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  ngOnInit(): void {
    this.generateCalendar();
    if (isPlatformBrowser(this.platformId)) {
      this.loadAllData();
    }

    let initialNav = true;
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        if (initialNav) {
          initialNav = false;
          return;
        }
        if (event.urlAfterRedirects === '/' || event.urlAfterRedirects.startsWith('/?')) {
          if (isPlatformBrowser(this.platformId)) {
            this.loadAllData();
            window.scrollTo({ top: 0, behavior: 'auto' });
          }
        }
      });
  }

  private loadAllData(): void {
    this.loadProperties();
    this.loadCities();
    this.loadStats();
    this.loadTestimonials();
  }

  getFoodOptionTags(item: Partial<PropertyData>): string[] {
    const foodOptions = item?.property_food_options ?? [];
    const included = foodOptions
      .filter((opt) => opt && opt.is_included && opt.name)
      .map((opt) => opt.name);
    return included.length > 0 ? included.slice(0, 3) : ['Family stay'];
  }

  public onCitySelect(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.selectedCityId = target.value;
  }

  // ================= GUESTS DROPDOWN =================
  public toggleGuestsDropdown(): void {
    this.showGuestsDropdown = !this.showGuestsDropdown;
    if (this.showGuestsDropdown) {
      this.showDatesDropdown = false;
    }
  }

  public updateGuests(field: 'adults' | 'children' | 'rooms', delta: number): void {
    if (field === 'adults') {
      this.adultsCount = Math.max(1, Math.min(20, this.adultsCount + delta));
    } else if (field === 'children') {
      this.childrenCount = Math.max(0, Math.min(10, this.childrenCount + delta));
    } else if (field === 'rooms') {
      this.roomsCount = Math.max(1, Math.min(10, this.roomsCount + delta));
    }
  }

  public getGuestsSummary(): string {
    const totalGuests = this.adultsCount + this.childrenCount;
    const guestText = totalGuests === 1 ? '1 guest' : `${totalGuests} guests`;
    const roomText = this.roomsCount === 1 ? '1 room' : `${this.roomsCount} rooms`;
    return `${guestText}, ${roomText}`;
  }

  // ================= CALENDAR DATE PICKER =================
  public toggleDatesDropdown(): void {
    this.showDatesDropdown = !this.showDatesDropdown;
    if (this.showDatesDropdown) {
      this.showGuestsDropdown = false;
      if (this.checkInDate) {
        const parts = this.checkInDate.split('-');
        if (parts.length === 3) {
          this.calendarViewDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
        }
      } else {
        this.calendarViewDate = new Date();
      }
      this.generateCalendar();
    }
  }

  public closeDatesDropdown(): void {
    this.showDatesDropdown = false;
  }

  public prevMonth(): void {
    this.calendarViewDate = new Date(
      this.calendarViewDate.getFullYear(),
      this.calendarViewDate.getMonth() - 1,
      1
    );
    this.generateCalendar();
  }

  public nextMonth(): void {
    this.calendarViewDate = new Date(
      this.calendarViewDate.getFullYear(),
      this.calendarViewDate.getMonth() + 1,
      1
    );
    this.generateCalendar();
  }

  public getCalendarMonthYearLabel(): string {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${monthNames[this.calendarViewDate.getMonth()]} ${this.calendarViewDate.getFullYear()}`;
  }

  public generateCalendar(): void {
    const year = this.calendarViewDate.getFullYear();
    const month = this.calendarViewDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const totalDaysInPrevMonth = new Date(year, month, 0).getDate();

    const days: CalendarDay[] = [];

    // Leading days from previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = totalDaysInPrevMonth - i;
      const d = new Date(year, month - 1, dayNum);
      const dateStr = this.formatDateIso(d);
      days.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isPast: dateStr < this.minTodayDate,
        isToday: dateStr === this.minTodayDate,
      });
    }

    // Days in current month
    for (let dayNum = 1; dayNum <= totalDaysInMonth; dayNum++) {
      const d = new Date(year, month, dayNum);
      const dateStr = this.formatDateIso(d);
      days.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: true,
        isPast: dateStr < this.minTodayDate,
        isToday: dateStr === this.minTodayDate,
      });
    }

    // Trailing days from next month to complete the row
    const totalSlots = Math.ceil(days.length / 7) * 7;
    const remaining = totalSlots - days.length;
    for (let dayNum = 1; dayNum <= remaining; dayNum++) {
      const d = new Date(year, month + 1, dayNum);
      const dateStr = this.formatDateIso(d);
      days.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isPast: dateStr < this.minTodayDate,
        isToday: dateStr === this.minTodayDate,
      });
    }

    this.calendarDays = days;
  }

  private formatDateIso(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  public onDateClick(dateStr: string): void {
    if (dateStr < this.minTodayDate) return;

    if (!this.checkInDate || (this.checkInDate && this.checkOutDate)) {
      // First click: select check-in
      this.checkInDate = dateStr;
      this.checkOutDate = '';
    } else if (this.checkInDate && !this.checkOutDate) {
      if (dateStr > this.checkInDate) {
        // Second click: select check-out
        this.checkOutDate = dateStr;
      } else {
        // Clicked before check-in: reset check-in
        this.checkInDate = dateStr;
        this.checkOutDate = '';
      }
    }
  }

  public isDateCheckIn(dateStr: string): boolean {
    return this.checkInDate === dateStr;
  }

  public isDateCheckOut(dateStr: string): boolean {
    return this.checkOutDate === dateStr;
  }

  public isDateInRange(dateStr: string): boolean {
    return Boolean(
      this.checkInDate &&
      this.checkOutDate &&
      dateStr > this.checkInDate &&
      dateStr < this.checkOutDate
    );
  }

  public clearDates(): void {
    this.checkInDate = '';
    this.checkOutDate = '';
  }

  public applyQuickPreset(preset: 'this_weekend' | 'next_weekend' | 'next_3_days' | 'next_week'): void {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sun, 5 = Fri, 6 = Sat

    if (preset === 'this_weekend') {
      const daysUntilFri = (5 - dayOfWeek + 7) % 7 || 7;
      const fri = new Date(today);
      fri.setDate(today.getDate() + (dayOfWeek === 5 ? 0 : (dayOfWeek === 6 ? 6 : daysUntilFri)));
      const sun = new Date(fri);
      sun.setDate(fri.getDate() + 2);

      this.checkInDate = this.formatDateIso(fri);
      this.checkOutDate = this.formatDateIso(sun);
    } else if (preset === 'next_weekend') {
      const daysUntilFri = ((5 - dayOfWeek + 7) % 7 || 7) + 7;
      const fri = new Date(today);
      fri.setDate(today.getDate() + daysUntilFri);
      const sun = new Date(fri);
      sun.setDate(fri.getDate() + 2);

      this.checkInDate = this.formatDateIso(fri);
      this.checkOutDate = this.formatDateIso(sun);
    } else if (preset === 'next_3_days') {
      const start = new Date(today);
      start.setDate(today.getDate() + 1);
      const end = new Date(start);
      end.setDate(start.getDate() + 3);

      this.checkInDate = this.formatDateIso(start);
      this.checkOutDate = this.formatDateIso(end);
    } else if (preset === 'next_week') {
      const start = new Date(today);
      start.setDate(today.getDate() + 1);
      const end = new Date(start);
      end.setDate(start.getDate() + 7);

      this.checkInDate = this.formatDateIso(start);
      this.checkOutDate = this.formatDateIso(end);
    }

    if (this.checkInDate) {
      const parts = this.checkInDate.split('-');
      this.calendarViewDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
      this.generateCalendar();
    }
  }

  public getFormattedDatesSummary(): string {
    if (!this.checkInDate && !this.checkOutDate) {
      return 'Add dates';
    }
    if (this.checkInDate && !this.checkOutDate) {
      return `From ${this.formatDisplayDate(this.checkInDate)}`;
    }
    if (this.checkInDate && this.checkOutDate) {
      const nights = this.getNightsCount();
      const nightLabel = nights === 1 ? '1 night' : `${nights} nights`;
      return `${this.formatDisplayDate(this.checkInDate)} – ${this.formatDisplayDate(this.checkOutDate)} (${nightLabel})`;
    }
    return 'Add dates';
  }

  public formatDisplayDate(dateStr: string): string {
    if (!dateStr) return '';
    return this.settingsService.formatDate(dateStr);
  }

  public getNightsCount(): number {
    if (!this.checkInDate || !this.checkOutDate) return 0;
    const d1 = new Date(this.checkInDate);
    const d2 = new Date(this.checkOutDate);
    const diffTime = d2.getTime() - d1.getTime();
    return Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24)));
  }

  public goToSearch(): void {
    const totalGuests = this.adultsCount + this.childrenCount;
    const queryParams: Record<string, any> = {};
    if (this.selectedCityId) queryParams['city_id'] = this.selectedCityId;
    if (this.checkInDate && this.checkOutDate && this.checkOutDate > this.checkInDate) {
      queryParams['check_in_date'] = this.checkInDate;
      queryParams['check_out_date'] = this.checkOutDate;
    }
    if (this.adultsCount !== 2) queryParams['adults'] = this.adultsCount;
    if (this.childrenCount > 0) queryParams['children'] = this.childrenCount;
    if (this.roomsCount !== 1) queryParams['rooms'] = this.roomsCount;
    if (totalGuests > 0) queryParams['guests'] = totalGuests;

    this.router.navigate(['/search'], { queryParams });
  }

  public filterStays(): void {
    this.goToSearch();
  }

  public onCityCardClick(cityId?: string): void {
    if (!cityId) return;
    this.router.navigate(['/search'], { queryParams: { city_id: cityId } });
  }

  private loadStats(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.loadingStats.set(true);

    this.dashboardService
      .getPublicStats()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        timeout({ first: 8000 }),
        retry(2),
        catchError((error) => {
          console.warn('Could not load public stats:', error);
          return of(null);
        })
      )
      .subscribe((response) => {
        this.loadingStats.set(false);
        if (response?.data?.stats && response.data.stats.length > 0) {
          const wasAnimated = this.statsAnimated;
          this.stats = response.data.stats.map((s) => ({
            key: s.key,
            target: s.target,
            current: wasAnimated ? s.target : 0,
            suffix: s.suffix || undefined,
            decimals: s.decimals || 0,
            label: s.label,
          }));
          this.cdr.markForCheck();

          if (!wasAnimated && this.isStatSectionVisible()) {
            this.animateStats();
          }
        }
      });
  }

  private loadCities(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.loadingCities.set(true);

    const query: CitySearch = {
      is_featured: true,
    };
    const cityQuery: CityQuery = {
      search: query,
      page: 1,
      size: 8,
    };

    this.cityService.public
      .getCities(cityQuery)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        timeout({ first: 8000 }),
        retry(2),
        catchError((error) => {
          console.warn('Could not load public cities:', error);
          return of({ data: [], total: 0, page: 1, size: 8 });
        })
      )
      .subscribe((response) => {
        this.loadingCities.set(false);
        const data = response?.data || [];
        this.cities.set(data);
        this.cdr.markForCheck();
        this.refreshRevealObserver();
      });
  }

  private loadProperties(cityId?: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.loadingProperties.set(true);

    const search: PropertySearch = {
      is_featured: true,
    };

    if (cityId) {
      search.city_id = cityId;
    }

    const query: PropertyQuery = {
      page: 1,
      size: 6,
      search,
    };

    this.propertyService
      .public.getProperties(query)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        timeout({ first: 8000 }),
        retry(2),
        catchError((error) => {
          console.warn('Could not load featured properties:', error);
          return of({ data: [], total: 0, page: 1, size: 6 });
        })
      )
      .subscribe((response) => {
        this.loadingProperties.set(false);
        this.properties.set(response?.data || []);
        this.cdr.markForCheck();
        this.refreshRevealObserver();
        this.refreshCardTilt();
      });
  }

  // ================= TESTIMONIALS =================
  private readonly defaultTestimonials: TestimonialData[] = [
    {
      id: 'default-1',
      name: 'Ritika Roy',
      designation: 'Nongriat Bridgehouse, Meghalaya',
      rating: 5,
      content: 'Woke up to prayer flags and the smell of someone\'s breakfast fire. Didn\'t want the three days to end.',
      status: 'approved',
      user_role: 'user',
      is_featured: true,
      created_at: '2026-08-10T10:00:00Z',
    },
    {
      id: 'default-2',
      name: 'Farhan Zaidi',
      designation: 'Ziro Paddy House, Arunachal Pradesh',
      rating: 5,
      content: 'Our host taught my daughter to read the clouds for rain. She still does it every morning at home in Delhi.',
      status: 'approved',
      user_role: 'user',
      is_featured: true,
      created_at: '2026-08-12T14:30:00Z',
    },
    {
      id: 'default-3',
      name: 'Meera Nambiar',
      designation: 'Komic Stone House, Spiti Valley',
      rating: 5,
      content: 'No wifi, no problem. Best sleep I\'ve had in years under three handmade wool quilts, with milky Himalayan chai.',
      status: 'approved',
      user_role: 'user',
      is_featured: true,
      created_at: '2026-08-18T09:15:00Z',
    },
    {
      id: 'default-4',
      name: 'Sonam Lepcha',
      designation: 'Homestay Host in Pelling, West Sikkim',
      rating: 5,
      content: 'Listing our wooden cottage on TashiHome helped us welcome respectful guests who truly cherish our village culture.',
      status: 'approved',
      user_role: 'vendor',
      is_featured: true,
      created_at: '2026-08-20T11:00:00Z',
    },
    {
      id: 'default-5',
      name: 'Ananya & Tenzing',
      designation: 'Tinchuley Tea Ridge, Darjeeling',
      rating: 5,
      content: 'The sunrise over Mt. Kanchenjunga from the attic bedroom was purely magical. The organic nettle soup was unforgettable.',
      status: 'approved',
      user_role: 'user',
      is_featured: true,
      created_at: '2026-08-22T08:00:00Z',
    },
    {
      id: 'default-6',
      name: 'Dawa Norbu',
      designation: 'Monastery View Host, Rumtek',
      rating: 5,
      content: 'TashiHome brings conscious travelers to our door. It keeps our traditional organic farming traditions alive and thriving.',
      status: 'approved',
      user_role: 'vendor',
      is_featured: true,
      created_at: '2026-08-25T16:20:00Z',
    }
  ];

  public loadTestimonials(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.testimonials.set(this.defaultTestimonials);
      this.loadingTestimonials.set(false);
      return;
    }
    this.loadingTestimonials.set(true);

    this.testimonialService.public
      .getTestimonials({ is_featured: true, page_size: 6 })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        timeout({ first: 6000 }),
        retry(1),
        catchError((error) => {
          console.warn('Using default featured testimonials:', error);
          return of({ data: this.defaultTestimonials, status: 200, message: '' });
        })
      )
      .subscribe((response) => {
        this.loadingTestimonials.set(false);
        const data = response?.data && response.data.length > 0 ? response.data : this.defaultTestimonials;
        this.testimonials.set(data);
        this.cdr.markForCheck();
        this.refreshRevealObserver();
      });
  }

  public getFilteredTestimonials(): TestimonialData[] {
    const list = this.testimonials();
    const tab = this.testimonialTab();
    if (tab === 'guest') {
      return list.filter((t) => (t.user_role ?? 'user') === 'user');
    }
    if (tab === 'host') {
      return list.filter((t) => t.user_role === 'vendor');
    }
    return list;
  }

  public setTestimonialTab(tab: 'all' | 'guest' | 'host'): void {
    this.testimonialTab.set(tab);
    setTimeout(() => this.refreshRevealObserver(), 50);
  }

  public openSubmitTestimonial(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/#testimonials' } });
      return;
    }
    const user = this.authService.authUser() || this.authService.getUser();
    this.testimonialForm = {
      name: user?.full_name || '',
      designation: user?.role === 'vendor' ? 'Homestay Host' : 'Himalayan Traveler',
      rating: 5,
      content: '',
      role: user?.role === 'vendor' ? 'vendor' : 'user',
    };
    this.testimonialSubmitSuccess.set(false);
    this.testimonialSubmitError.set(null);
    this.isSubmitTestimonialOpen.set(true);
  }

  public closeSubmitTestimonial(): void {
    this.isSubmitTestimonialOpen.set(false);
  }

  public setTestimonialRating(stars: number): void {
    this.testimonialForm.rating = stars;
  }

  public onSubmitTestimonial(): void {
    if (!this.testimonialForm.content.trim()) {
      this.testimonialSubmitError.set('Please write a few words about your stay or hosting experience.');
      return;
    }

    this.isSubmittingTestimonial.set(true);
    this.testimonialSubmitError.set(null);

    const payload = {
      name: this.testimonialForm.name.trim() || undefined,
      designation: this.testimonialForm.designation.trim() || undefined,
      rating: this.testimonialForm.rating,
      content: this.testimonialForm.content.trim(),
    };

    const submitObs = this.testimonialForm.role === 'vendor'
      ? this.testimonialService.vendor.submitTestimonial(payload)
      : this.testimonialService.user.submitTestimonial(payload);

    submitObs.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.isSubmittingTestimonial.set(false);
        this.testimonialSubmitSuccess.set(true);
        setTimeout(() => {
          this.closeSubmitTestimonial();
        }, 2200);
      },
      error: (err) => {
        this.isSubmittingTestimonial.set(false);
        const msg = this.testimonialService.extractApiErrorMessage(err) || 'Failed to submit testimonial. Please try again.';
        this.testimonialSubmitError.set(msg);
      }
    });
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const isMobile = window.innerWidth < 768;
      this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches || isMobile;

      this.initRevealObserver();
      this.initStatsObserver();

      // Defer decorative canvas and motion effects to idle time so they do not block initial paint
      if (!this.reduceMotion) {
        const scheduleIdle = typeof window.requestIdleCallback === 'function'
          ? (fn: () => void) => (window as any).requestIdleCallback(fn, { timeout: 1500 })
          : (fn: () => void) => setTimeout(fn, 300);

        scheduleIdle(() => {
          if (this.destroyed) return;
          this.zone.runOutsideAngular(() => {
            this.mistCleanupFns.push(this.initHeroCanvas('#mistCanvas'));
            this.mistCleanupFns.push(this.initStaysCanvas('#staysCanvas'));
            this.mistCleanupFns.push(this.initExpCanvas('#expCanvas'));
            this.mistCleanupFns.push(this.initConstellationCanvas('#constellationCanvas'));
            this.mistCleanupFns.push(this.initFooterCanvas('#mistCanvasFooter'));
            this.tiltCleanupFn = this.initCardTilt('.card-tilt');
            this.parallaxCleanupFn = this.initParallax('#ridgeParallax', 0.15);
          });
        });
      }
    }
  }

  scrollToStays(): void {
    if (isPlatformBrowser(this.platformId)) {
      const el = document.getElementById('stays');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }

  onNewsletterSubmit(): void {
    if (this.newsletterEmail.trim()) {
      this.newsletterSubmitted = true;
    }
  }

  private initRevealObserver(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const revealEls: NodeListOf<HTMLElement> = this.el.nativeElement.querySelectorAll('.reveal');
    if (!revealEls.length) return;

    if (!('IntersectionObserver' in window)) {
      revealEls.forEach((el) => {
        el.classList.add('in', 'is-visible');
      });
      return;
    }

    if (!this.revealObserver) {
      this.revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('in', 'is-visible');
              this.revealObserver?.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.08, rootMargin: '60px' }
      );
    }

    revealEls.forEach((el) => {
      if (el.classList.contains('in') || el.classList.contains('is-visible')) {
        return;
      }
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight + 60 && rect.bottom > -60) {
        el.classList.add('in', 'is-visible');
      } else {
        this.revealObserver?.observe(el);
      }
    });
  }

  private refreshRevealObserver(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Allow Angular change detection to complete template stamping
    setTimeout(() => {
      requestAnimationFrame(() => this.initRevealObserver());
    }, 50);
  }

  private isStatSectionVisible(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    const statSection = this.el.nativeElement.querySelector('.stat-section');
    if (!statSection) return false;
    const rect = statSection.getBoundingClientRect();
    return rect.top < window.innerHeight && rect.bottom > 0;
  }

  private initStatsObserver(): void {
    const statSection = this.el.nativeElement.querySelector('.stat-section');
    if (!statSection) return;

    if (this.isStatSectionVisible()) {
      this.animateStats();
      return;
    }

    this.statsObserver?.disconnect();
    this.statsObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.animateStats();
            this.statsObserver?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    this.statsObserver.observe(statSection);
  }

  private animateStats(): void {
    this.statsAnimated = true;
    if (this.reduceMotion) {
      this.stats.forEach((stat) => {
        stat.current = stat.target;
      });
      this.cdr.markForCheck();
      return;
    }

    const duration = 1400;
    const startTime = performance.now();

    const update = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      this.stats.forEach((stat) => {
        stat.current = stat.target * eased;
      });

      this.cdr.markForCheck();

      if (progress < 1) {
        this.statsAnimationFrame = requestAnimationFrame(update);
      } else {
        this.stats.forEach((stat) => {
          stat.current = stat.target;
        });
        this.cdr.markForCheck();
      }
    };

    if (this.statsAnimationFrame !== undefined) {
      cancelAnimationFrame(this.statsAnimationFrame);
    }
    this.statsAnimationFrame = requestAnimationFrame(update);
  }

  goToPropertyDetail(slug?: string): void {
    if (!slug) return;

    this.router.navigate(['/stay', slug]);
  }

  // ============================================================
  // 1. HERO CANVAS: Layered drifting mist + shimmering stardust
  // with interactive cursor ambient swirl
  // ============================================================
  private initHeroCanvas(selector: string): () => void {
    if (this.reduceMotion) return () => { };

    const canvas = this.el.nativeElement.querySelector(selector) as HTMLCanvasElement | null;
    if (!canvas) return () => { };

    const ctx = canvas.getContext('2d');
    if (!ctx) return () => { };

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let raf = 0;
    const start = performance.now();

    // Mouse coordinates for ambient interactivity
    let mouse = { x: -9999, y: -9999, active: false };

    let blobs: MistBlob[] = [];
    let sparkles: Array<{
      x: number;
      y: number;
      size: number;
      speedY: number;
      speedX: number;
      opacity: number;
      pulseSpeed: number;
      phase: number;
      color: string;
    }> = [];

    const build = () => {
      blobs = [];
      const layerCount = 6;
      for (let i = 0; i < layerCount; i++) {
        const depth = layerCount > 1 ? i / (layerCount - 1) : 0;
        blobs.push({
          x: Math.random() * w,
          y: h * (0.15 + Math.random() * 0.65),
          r: (160 + Math.random() * 240) * (1 - depth * 0.35),
          speed: (7 + Math.random() * 12) * (0.4 + depth * 0.7),
          bob: 10 + Math.random() * 18,
          bobSpeed: 0.12 + Math.random() * 0.2,
          phase: Math.random() * Math.PI * 2,
          opacity: 0.04 + (1 - depth) * 0.08,
        });
      }

      sparkles = [];
      const sparkleCount = Math.min(Math.floor(w / 35), 45);
      for (let i = 0; i < sparkleCount; i++) {
        sparkles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          size: 0.8 + Math.random() * 2,
          speedY: 0.15 + Math.random() * 0.35,
          speedX: (Math.random() - 0.5) * 0.25,
          opacity: 0.2 + Math.random() * 0.6,
          pulseSpeed: 1 + Math.random() * 2.5,
          phase: Math.random() * Math.PI * 2,
          color: Math.random() > 0.4 ? '250, 165, 45' : '143, 199, 212', // ochre gold or mist teal
        });
      }
    };

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
    };

    const onMouseLeave = () => {
      mouse.active = false;
    };

    const draw = (now: number) => {
      const t = (now - start) / 1000;
      ctx.clearRect(0, 0, w, h);

      // Draw misty volumetric cloud blobs
      for (const b of blobs) {
        let bx = ((b.x + t * b.speed) % (w + b.r * 2)) - b.r;
        let by = b.y + Math.sin(t * b.bobSpeed + b.phase) * b.bob;

        // Soft cursor deflection
        if (mouse.active) {
          const dx = bx - mouse.x;
          const dy = by - mouse.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 220 && dist > 0) {
            const force = (1 - dist / 220) * 15;
            bx += (dx / dist) * force;
            by += (dy / dist) * force;
          }
        }

        const grad = ctx.createRadialGradient(bx, by, 0, bx, by, b.r);
        grad.addColorStop(0, `rgba(243, 250, 251, ${b.opacity})`);
        grad.addColorStop(0.6, `rgba(243, 250, 251, ${b.opacity * 0.4})`);
        grad.addColorStop(1, 'rgba(243, 250, 251, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(bx, by, b.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw floating stardust particles
      for (const s of sparkles) {
        s.y -= s.speedY;
        s.x += s.speedX + Math.sin(t + s.phase) * 0.15;
        if (s.y < -10) s.y = h + 10;
        if (s.x < -10) s.x = w + 10;
        if (s.x > w + 10) s.x = -10;

        const currentOpacity = s.opacity * (0.6 + 0.4 * Math.sin(t * s.pulseSpeed + s.phase));

        ctx.fillStyle = `rgba(${s.color}, ${currentOpacity})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();

        // Soft glow halo
        if (s.size > 1.4) {
          ctx.fillStyle = `rgba(${s.color}, ${currentOpacity * 0.25})`;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.size * 2.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      raf = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('mouseleave', onMouseLeave);
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseleave', onMouseLeave);
    };
  }

  // ============================================================
  // 1.5 STAYS CANVAS: Ambient mountain cloud wisps & floating
  // golden alpine particles across the listings section
  // ============================================================
  private initStaysCanvas(selector: string): () => void {
    if (this.reduceMotion) return () => { };

    const canvas = this.el.nativeElement.querySelector(selector) as HTMLCanvasElement | null;
    if (!canvas) return () => { };

    const ctx = canvas.getContext('2d');
    if (!ctx) return () => { };

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let raf = 0;
    const start = performance.now();

    let particles: Array<{
      x: number;
      y: number;
      r: number;
      speedX: number;
      speedY: number;
      sway: number;
      swaySpeed: number;
      phase: number;
      alpha: number;
      color: string;
    }> = [];

    let mistPuffs: Array<{
      x: number;
      y: number;
      r: number;
      speed: number;
      opacity: number;
    }> = [];

    const build = () => {
      particles = [];
      const pCount = Math.min(Math.floor(w / 38), 35);
      for (let i = 0; i < pCount; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: 1 + Math.random() * 2.4,
          speedX: 0.15 + Math.random() * 0.35,
          speedY: (Math.random() - 0.5) * 0.15,
          sway: 8 + Math.random() * 14,
          swaySpeed: 0.3 + Math.random() * 0.6,
          phase: Math.random() * Math.PI * 2,
          alpha: 0.12 + Math.random() * 0.35,
          color: Math.random() > 0.4 ? '250, 165, 45' : '71, 159, 181', // ochre or moss
        });
      }

      mistPuffs = [];
      for (let i = 0; i < 4; i++) {
        mistPuffs.push({
          x: Math.random() * w,
          y: h * (0.2 + Math.random() * 0.6),
          r: 180 + Math.random() * 220,
          speed: 4 + Math.random() * 6,
          opacity: 0.035 + Math.random() * 0.035,
        });
      }
    };

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    };

    const draw = (now: number) => {
      const t = (now - start) / 1000;
      ctx.clearRect(0, 0, w, h);

      // Draw soft cloud wisps
      for (const m of mistPuffs) {
        const mx = ((m.x + t * m.speed) % (w + m.r * 2)) - m.r;
        const my = m.y + Math.sin(t * 0.15) * 12;
        const grad = ctx.createRadialGradient(mx, my, 0, mx, my, m.r);
        grad.addColorStop(0, `rgba(71, 159, 181, ${m.opacity})`);
        grad.addColorStop(0.7, `rgba(71, 159, 181, ${m.opacity * 0.3})`);
        grad.addColorStop(1, 'rgba(71, 159, 181, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(mx, my, m.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw particles
      for (const p of particles) {
        p.x += p.speedX;
        const py = p.y + Math.sin(t * p.swaySpeed + p.phase) * p.sway;

        if (p.x > w + 20) {
          p.x = -20;
          p.y = Math.random() * h;
        }

        const opacity = p.alpha * (0.6 + 0.4 * Math.sin(t * 1.2 + p.phase));
        ctx.fillStyle = `rgba(${p.color}, ${opacity})`;
        ctx.beginPath();
        ctx.arc(p.x, py, p.r, 0, Math.PI * 2);
        ctx.fill();

        if (p.r > 1.5) {
          ctx.fillStyle = `rgba(${p.color}, ${opacity * 0.25})`;
          ctx.beginPath();
          ctx.arc(p.x, py, p.r * 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      raf = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize);
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }

  // ============================================================
  // 2. EXPERIENCES CANVAS: Gentle floating morning pollen / breeze
  // spores across the misty tea hills background
  // ============================================================
  private initExpCanvas(selector: string): () => void {
    if (this.reduceMotion) return () => { };

    const canvas = this.el.nativeElement.querySelector(selector) as HTMLCanvasElement | null;
    if (!canvas) return () => { };

    const ctx = canvas.getContext('2d');
    if (!ctx) return () => { };

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let raf = 0;
    const start = performance.now();

    let spores: Array<{
      x: number;
      y: number;
      r: number;
      speedX: number;
      speedY: number;
      sway: number;
      swaySpeed: number;
      phase: number;
      alpha: number;
      color: string;
    }> = [];

    const build = () => {
      spores = [];
      const count = Math.min(Math.floor(w / 40), 36);
      for (let i = 0; i < count; i++) {
        spores.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: 1.2 + Math.random() * 2.6,
          speedX: 0.2 + Math.random() * 0.45,
          speedY: (Math.random() - 0.5) * 0.2,
          sway: 6 + Math.random() * 12,
          swaySpeed: 0.4 + Math.random() * 0.8,
          phase: Math.random() * Math.PI * 2,
          alpha: 0.15 + Math.random() * 0.4,
          color: Math.random() > 0.5 ? '250, 165, 45' : '71, 159, 181', // warm ochre or moss teal
        });
      }
    };

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    };

    const draw = (now: number) => {
      const t = (now - start) / 1000;
      ctx.clearRect(0, 0, w, h);

      for (const s of spores) {
        s.x += s.speedX;
        const currentY = s.y + Math.sin(t * s.swaySpeed + s.phase) * s.sway;

        if (s.x > w + 20) {
          s.x = -20;
          s.y = Math.random() * h;
        }

        const opacity = s.alpha * (0.7 + 0.3 * Math.sin(t * 1.5 + s.phase));
        ctx.fillStyle = `rgba(${s.color}, ${opacity})`;
        ctx.beginPath();
        ctx.arc(s.x, currentY, s.r, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(${s.color}, ${opacity * 0.25})`;
        ctx.beginPath();
        ctx.arc(s.x, currentY, s.r * 2.4, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize);
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }

  // ============================================================
  // 3. CONSTELLATION & FIREFLIES CANVAS: Dark Pine Forest Night
  // with interactive starlight & glowing connection threads
  // ============================================================
  private initConstellationCanvas(selector: string): () => void {
    if (this.reduceMotion) return () => { };

    const canvas = this.el.nativeElement.querySelector(selector) as HTMLCanvasElement | null;
    if (!canvas) return () => { };

    const ctx = canvas.getContext('2d');
    if (!ctx) return () => { };

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let raf = 0;
    const start = performance.now();

    let mouse = { x: -9999, y: -9999, active: false };

    let nodes: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
      alpha: number;
      pulseSpeed: number;
      phase: number;
      isFirefly: boolean;
    }> = [];

    const build = () => {
      nodes = [];
      const count = Math.min(Math.floor(w / 28), 50);
      for (let i = 0; i < count; i++) {
        const isFirefly = Math.random() < 0.3;
        nodes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * (isFirefly ? 0.45 : 0.2),
          vy: (Math.random() - 0.5) * (isFirefly ? 0.45 : 0.2),
          r: isFirefly ? 1.6 + Math.random() * 1.6 : 0.9 + Math.random() * 1.4,
          alpha: isFirefly ? 0.6 + Math.random() * 0.4 : 0.3 + Math.random() * 0.4,
          pulseSpeed: 1 + Math.random() * 2.5,
          phase: Math.random() * Math.PI * 2,
          isFirefly,
        });
      }
    };

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
    };

    const onMouseLeave = () => {
      mouse.active = false;
    };

    const draw = (now: number) => {
      const t = (now - start) / 1000;
      ctx.clearRect(0, 0, w, h);

      // Move nodes
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;

        if (n.x < 0) n.x = w;
        if (n.x > w) n.x = 0;
        if (n.y < 0) n.y = h;
        if (n.y > h) n.y = 0;
      }

      // Draw connection lines between nearby stars
      const maxDist = 110;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.hypot(dx, dy);

          if (dist < maxDist) {
            let lineAlpha = (1 - dist / maxDist) * 0.18;

            // Highlight connections near cursor
            if (mouse.active) {
              const mouseDist = Math.hypot(
                (nodes[i].x + nodes[j].x) / 2 - mouse.x,
                (nodes[i].y + nodes[j].y) / 2 - mouse.y
              );
              if (mouseDist < 140) {
                lineAlpha += (1 - mouseDist / 140) * 0.35;
              }
            }

            ctx.strokeStyle = `rgba(250, 165, 45, ${lineAlpha})`;
            ctx.lineWidth = 0.85;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw star/firefly nodes
      for (const n of nodes) {
        const pulse = 0.6 + 0.4 * Math.sin(t * n.pulseSpeed + n.phase);
        const currentAlpha = n.alpha * pulse;

        if (n.isFirefly) {
          // Warm glowing golden firefly
          ctx.fillStyle = `rgba(250, 165, 45, ${currentAlpha})`;
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = `rgba(250, 165, 45, ${currentAlpha * 0.3})`;
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r * 3, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Crisp starlight
          ctx.fillStyle = `rgba(243, 250, 251, ${currentAlpha})`;
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      raf = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('mouseleave', onMouseLeave);
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseleave', onMouseLeave);
    };
  }

  // ============================================================
  // 4. FOOTER CANVAS: Warm alpine sunset glow & rising embers
  // ============================================================
  private initFooterCanvas(selector: string): () => void {
    if (this.reduceMotion) return () => { };

    const canvas = this.el.nativeElement.querySelector(selector) as HTMLCanvasElement | null;
    if (!canvas) return () => { };

    const ctx = canvas.getContext('2d');
    if (!ctx) return () => { };

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let raf = 0;
    const start = performance.now();

    let embers: Array<{
      x: number;
      y: number;
      r: number;
      speedY: number;
      speedX: number;
      opacity: number;
      pulseSpeed: number;
      phase: number;
    }> = [];

    const build = () => {
      embers = [];
      const count = Math.min(Math.floor(w / 30), 40);
      for (let i = 0; i < count; i++) {
        embers.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: 1 + Math.random() * 2.2,
          speedY: 0.3 + Math.random() * 0.6,
          speedX: (Math.random() - 0.5) * 0.3,
          opacity: 0.25 + Math.random() * 0.5,
          pulseSpeed: 1.2 + Math.random() * 2,
          phase: Math.random() * Math.PI * 2,
        });
      }
    };

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    };

    const draw = (now: number) => {
      const t = (now - start) / 1000;
      ctx.clearRect(0, 0, w, h);

      for (const e of embers) {
        e.y -= e.speedY;
        e.x += e.speedX + Math.sin(t + e.phase) * 0.2;

        if (e.y < -10) {
          e.y = h + 10;
          e.x = Math.random() * w;
        }

        const currentOpacity = e.opacity * (0.6 + 0.4 * Math.sin(t * e.pulseSpeed + e.phase));

        ctx.fillStyle = `rgba(250, 165, 45, ${currentOpacity})`;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(250, 165, 45, ${currentOpacity * 0.25})`;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r * 2.8, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize);
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }

  // ============================================================
  // Card tilt — sets CSS custom properties consumed by .card-tilt
  // in home.css. Re-run after the property list loads since the
  // cards are rendered from the `properties` signal.
  // ============================================================
  private initCardTilt(selector: string): () => void {
    if (this.reduceMotion) return () => { };

    const cards = Array.from(
      this.el.nativeElement.querySelectorAll(selector)
    ) as HTMLElement[];
    const cleanups: Array<() => void> = [];

    cards.forEach((card) => {
      const onMove = (e: MouseEvent) => {
        const rect = card.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width - 0.5;
        const py = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.setProperty('--ry', `${(px * 8).toFixed(2)}deg`);
        card.style.setProperty('--rx', `${(py * -8).toFixed(2)}deg`);
      };
      const onLeave = () => {
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      };
      card.addEventListener('mousemove', onMove);
      card.addEventListener('mouseleave', onLeave);
      cleanups.push(() => {
        card.removeEventListener('mousemove', onMove);
        card.removeEventListener('mouseleave', onLeave);
      });
    });

    return () => cleanups.forEach((fn) => fn());
  }

  private refreshCardTilt(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    queueMicrotask(() => {
      if (this.destroyed) return;
      this.zone.runOutsideAngular(() => {
        this.tiltCleanupFn?.();
        this.tiltCleanupFn = this.initCardTilt('.card-tilt');
      });
    });
  }

  // ============================================================
  // Ridge parallax — subtle vertical drift on scroll.
  // ============================================================
  private initParallax(selector: string, factor: number): () => void {
    if (this.reduceMotion) return () => { };

    const target = this.el.nativeElement.querySelector(selector) as HTMLElement | null;
    if (!target) return () => { };

    const onScroll = () => {
      const y = window.scrollY * factor;
      target.style.transform = `translateY(${y}px)`;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.revealObserver?.disconnect();
    this.statsObserver?.disconnect();
    if (this.statsAnimationFrame !== undefined) {
      cancelAnimationFrame(this.statsAnimationFrame);
    }
    this.mistCleanupFns.forEach((stop) => stop());
    this.tiltCleanupFn?.();
    this.parallaxCleanupFn?.();
  }
}
