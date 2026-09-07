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
  computed,
} from '@angular/core';
import { CommonModule, DecimalPipe, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, catchError } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { PropertyService } from '../../../services/property/property-service';
import {
  PropertyData,
  PropertyPublicSearchParams,
  PROPERTY_TYPES,
  PROPERTY_TYPES_LABELS,
  PropertyType,
} from '../../../services/property/property.model';
import { CityService } from '../../../services/city/city-service';
import { City, CityQuery } from '../../../services/city/city-model';
import { SettingsService } from '../../../services/settings/settings-service';
import { PaginationMeta } from '../../../services/api/api-response.model';
import { environment } from '../../../../environments/environment';

export interface CalendarDay {
  dateStr: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isPast: boolean;
  isToday: boolean;
}

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, DecimalPipe],
  templateUrl: './search.html',
  styleUrl: './search.css',
})
export class Search implements OnInit, AfterViewInit, OnDestroy {
  public readonly assetUrl = environment.assetUrl;

  // Services
  public readonly propertyService = inject(PropertyService);
  public readonly cityService = inject(CityService);
  public readonly settingsService = inject(SettingsService);
  public readonly router = inject(Router);
  public readonly route = inject(ActivatedRoute);
  private readonly el = inject(ElementRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly zone = inject(NgZone);

  // Currency signal
  public readonly currencySymbol = computed(() => this.settingsService.currencySymbol() || '₹');

  // State Signals
  public properties = signal<Partial<PropertyData>[]>([]);
  public cities = signal<City[]>([]);
  public loading = signal<boolean>(true);
  public error = signal<string | null>(null);
  public viewMode = signal<'grid' | 'list'>('grid');

  // Search & Filter State
  public searchKeyword = signal<string>('');
  public selectedCityId = signal<string>('');
  public checkInDate = signal<string>('');
  public checkOutDate = signal<string>('');
  public adults = signal<number>(2);
  public children = signal<number>(0);
  public rooms = signal<number>(1);
  public minPrice = signal<number | null>(null);
  public maxPrice = signal<number | null>(null);
  public selectedType = signal<string>('');
  public isFeaturedOnly = signal<boolean>(false);
  public sortOption = signal<string>('default');

  // UI state
  public showGuestsDropdown = signal<boolean>(false);
  public showDatesDropdown = signal<boolean>(false);
  public showAdvancedFilters = signal<boolean>(false);
  public calendarViewDate = signal<Date>(new Date());
  public calendarDays = signal<CalendarDay[]>([]);
  public readonly weekdays: string[] = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  // Pagination State
  public meta = signal<PaginationMeta>({
    page: 1,
    size: 9,
    total: 0,
  });
  public readonly pageSizeOptions: number[] = [6, 9, 12, 18, 24];

  // Constants
  public readonly propertyTypes = PROPERTY_TYPES;
  public readonly propertyTypeLabels = PROPERTY_TYPES_LABELS;

  // RxJS Search subject for debouncing keyword typing
  private searchSubject = new Subject<string>();

  // Canvas & Observer handles
  private canvasCleanupFn?: () => void;
  private revealObserver?: IntersectionObserver;
  private reduceMotion = false;

  // Date constraints (minimum today's date)
  public minTodayDate: string = '';

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    const today = new Date();
    this.minTodayDate = today.toISOString().split('T')[0];
  }

  ngOnInit(): void {
    // Setup debounced keyword search
    this.searchSubject
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((query) => {
        this.searchKeyword.set(query);
        this.meta.update((m) => ({ ...m, page: 1 }));
        this.updateUrlAndFetch();
      });

    // Load list of cities for filter dropdown and quick chips
    this.loadCities();

    // Listen to query parameters from URL for deep-linking
    this.route.queryParams
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const search = params['search'] || params['q'] || '';
        const cityId = params['city_id'] || params['city'] || '';
        const checkIn = params['check_in_date'] || '';
        const checkOut = params['check_out_date'] || '';
        const adultsVal = params['adults'] ? parseInt(params['adults'], 10) : (params['guests'] ? parseInt(params['guests'], 10) : 2);
        const childrenVal = params['children'] ? parseInt(params['children'], 10) : 0;
        const roomsVal = params['rooms'] ? parseInt(params['rooms'], 10) : 1;
        const minPriceVal = params['min_price'] ? parseFloat(params['min_price']) : null;
        const maxPriceVal = params['max_price'] ? parseFloat(params['max_price']) : null;
        const type = params['type'] || '';
        const featured = params['is_featured'] === 'true' || params['featured'] === 'true';
        const sort = params['sort'] || params['sortBy'] || 'default';
        const page = parseInt(params['page'], 10) || 1;
        const size = parseInt(params['size'], 10) || 9;
        const view = params['view'] === 'list' ? 'list' : 'grid';

        this.searchKeyword.set(search);
        this.selectedCityId.set(cityId);
        this.checkInDate.set(checkIn);
        this.checkOutDate.set(checkOut);
        this.adults.set(isNaN(adultsVal) ? 2 : adultsVal);
        this.children.set(isNaN(childrenVal) ? 0 : childrenVal);
        this.rooms.set(isNaN(roomsVal) ? 1 : roomsVal);
        this.minPrice.set(minPriceVal);
        this.maxPrice.set(maxPriceVal);
        this.selectedType.set(type);
        this.isFeaturedOnly.set(featured);
        this.sortOption.set(sort);
        this.viewMode.set(view);
        this.meta.set({ page, size, total: this.meta().total });

        this.fetchSearchResults();
      });
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.initRevealObserver();

      this.zone.runOutsideAngular(() => {
        this.canvasCleanupFn = this.initHeroCanvas('#searchHeroCanvas');
      });
    }
  }

  ngOnDestroy(): void {
    this.canvasCleanupFn?.();
    this.revealObserver?.disconnect();
  }

  // ================= DATA FETCHING =================

  public fetchSearchResults(): void {
    this.loading.set(true);
    this.error.set(null);

    let sortBy: string | undefined;
    let sortOrder: 'asc' | 'desc' | undefined;

    switch (this.sortOption()) {
      case 'price_asc':
        sortBy = 'price';
        sortOrder = 'asc';
        break;
      case 'price_desc':
        sortBy = 'price';
        sortOrder = 'desc';
        break;
      case 'name_asc':
        sortBy = 'name';
        sortOrder = 'asc';
        break;
      case 'name_desc':
        sortBy = 'name';
        sortOrder = 'desc';
        break;
      default:
        sortBy = undefined;
        sortOrder = undefined;
    }

    const totalGuests = this.adults() + this.children();
    const hasValidDates = Boolean(
      this.checkInDate() && this.checkOutDate() && this.checkOutDate() > this.checkInDate()
    );

    const searchParams: PropertyPublicSearchParams = {
      page: this.meta().page,
      size: this.meta().size,
      search: this.searchKeyword().trim() || undefined,
      q: this.searchKeyword().trim() || undefined,
      city_id: this.selectedCityId() || undefined,
      check_in_date: hasValidDates ? this.checkInDate() : undefined,
      check_out_date: hasValidDates ? this.checkOutDate() : undefined,
      guests: totalGuests > 0 ? totalGuests : undefined,
      adults: this.adults() > 0 ? this.adults() : undefined,
      children: this.children() > 0 ? this.children() : undefined,
      rooms: this.rooms() > 0 ? this.rooms() : undefined,
      min_price: this.minPrice() !== null ? this.minPrice()! : undefined,
      max_price: this.maxPrice() !== null ? this.maxPrice()! : undefined,
      type: (this.selectedType() as PropertyType) || undefined,
      is_featured: this.isFeaturedOnly() ? true : undefined,
      sortBy,
      sortOrder,
    };

    this.propertyService.public
      .searchProperties(searchParams)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => {
          console.error('Error in public property search:', err);
          const errorMsg =
            this.propertyService.extractApiErrorMessage(err) ||
            'Unable to complete search at this moment. Please check your network connection and try again.';
          this.error.set(errorMsg);
          this.loading.set(false);
          return of({
            data: [],
            meta: { total: 0, page: this.meta().page, size: this.meta().size },
            status: 'error',
            message: errorMsg,
          });
        })
      )
      .subscribe((res) => {
        this.loading.set(false);
        this.properties.set(res?.data || []);
        if (res?.meta) {
          this.meta.set({
            total: res.meta.total,
            page: res.meta.page,
            size: res.meta.size,
          });
        }
        this.cdr.markForCheck();
        this.refreshRevealObserver();
      });
  }

  private loadCities(): void {
    const query: CityQuery = {
      page: 1,
      size: 50,
      sortBy: 'name',
      sortOrder: 'asc',
    };

    this.cityService.public
      .getCities(query)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => {
          console.warn('Could not load public cities:', err);
          return of({ data: [], total: 0, page: 1, size: 50, status: '', message: '' });
        })
      )
      .subscribe((res) => {
        this.cities.set(res?.data || []);
        this.cdr.markForCheck();
      });
  }

  // ================= USER INTERACTIONS =================

  public onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchSubject.next(input.value);
  }

  public clearKeyword(): void {
    this.searchKeyword.set('');
    this.meta.update((m) => ({ ...m, page: 1 }));
    this.updateUrlAndFetch();
  }

  public onCitySelect(cityId: string): void {
    this.selectedCityId.set(cityId);
    this.meta.update((m) => ({ ...m, page: 1 }));
    this.updateUrlAndFetch();
  }

  public getNextDay(dateStr: string): string {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      d.setDate(d.getDate() + 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
    return '';
  }

  // ================= CALENDAR DATE PICKER =================
  public toggleDatesDropdown(): void {
    this.showDatesDropdown.update((v) => !v);
    if (this.showDatesDropdown()) {
      this.showGuestsDropdown.set(false);
      if (this.checkInDate()) {
        const parts = this.checkInDate().split('-');
        if (parts.length === 3) {
          this.calendarViewDate.set(new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1));
        }
      } else {
        this.calendarViewDate.set(new Date());
      }
      this.generateCalendar();
    }
  }

  public closeDatesDropdown(): void {
    this.showDatesDropdown.set(false);
  }

  public prevMonth(): void {
    const cur = this.calendarViewDate();
    this.calendarViewDate.set(new Date(cur.getFullYear(), cur.getMonth() - 1, 1));
    this.generateCalendar();
  }

  public nextMonth(): void {
    const cur = this.calendarViewDate();
    this.calendarViewDate.set(new Date(cur.getFullYear(), cur.getMonth() + 1, 1));
    this.generateCalendar();
  }

  public getCalendarMonthYearLabel(): string {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const cur = this.calendarViewDate();
    return `${monthNames[cur.getMonth()]} ${cur.getFullYear()}`;
  }

  public generateCalendar(): void {
    const cur = this.calendarViewDate();
    const year = cur.getFullYear();
    const month = cur.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const totalDaysInPrevMonth = new Date(year, month, 0).getDate();

    const days: CalendarDay[] = [];

    // Leading days
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

    // Trailing days
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

    this.calendarDays.set(days);
  }

  private formatDateIso(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  public onDateClick(dateStr: string): void {
    if (dateStr < this.minTodayDate) return;

    if (!this.checkInDate() || (this.checkInDate() && this.checkOutDate())) {
      this.checkInDate.set(dateStr);
      this.checkOutDate.set('');
    } else if (this.checkInDate() && !this.checkOutDate()) {
      if (dateStr > this.checkInDate()) {
        this.checkOutDate.set(dateStr);
      } else {
        this.checkInDate.set(dateStr);
        this.checkOutDate.set('');
      }
    }
    this.meta.update((m) => ({ ...m, page: 1 }));
    this.updateUrlAndFetch();
  }

  public isDateCheckIn(dateStr: string): boolean {
    return this.checkInDate() === dateStr;
  }

  public isDateCheckOut(dateStr: string): boolean {
    return this.checkOutDate() === dateStr;
  }

  public isDateInRange(dateStr: string): boolean {
    return Boolean(
      this.checkInDate() &&
      this.checkOutDate() &&
      dateStr > this.checkInDate() &&
      dateStr < this.checkOutDate()
    );
  }

  public applyQuickPreset(preset: 'this_weekend' | 'next_weekend' | 'next_3_days' | 'next_week'): void {
    const today = new Date();
    const dayOfWeek = today.getDay();

    if (preset === 'this_weekend') {
      const daysUntilFri = (5 - dayOfWeek + 7) % 7 || 7;
      const fri = new Date(today);
      fri.setDate(today.getDate() + (dayOfWeek === 5 ? 0 : (dayOfWeek === 6 ? 6 : daysUntilFri)));
      const sun = new Date(fri);
      sun.setDate(fri.getDate() + 2);

      this.checkInDate.set(this.formatDateIso(fri));
      this.checkOutDate.set(this.formatDateIso(sun));
    } else if (preset === 'next_weekend') {
      const daysUntilFri = ((5 - dayOfWeek + 7) % 7 || 7) + 7;
      const fri = new Date(today);
      fri.setDate(today.getDate() + daysUntilFri);
      const sun = new Date(fri);
      sun.setDate(fri.getDate() + 2);

      this.checkInDate.set(this.formatDateIso(fri));
      this.checkOutDate.set(this.formatDateIso(sun));
    } else if (preset === 'next_3_days') {
      const start = new Date(today);
      start.setDate(today.getDate() + 1);
      const end = new Date(start);
      end.setDate(start.getDate() + 3);

      this.checkInDate.set(this.formatDateIso(start));
      this.checkOutDate.set(this.formatDateIso(end));
    } else if (preset === 'next_week') {
      const start = new Date(today);
      start.setDate(today.getDate() + 1);
      const end = new Date(start);
      end.setDate(start.getDate() + 7);

      this.checkInDate.set(this.formatDateIso(start));
      this.checkOutDate.set(this.formatDateIso(end));
    }

    if (this.checkInDate()) {
      const parts = this.checkInDate().split('-');
      this.calendarViewDate.set(new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1));
      this.generateCalendar();
    }
    this.meta.update((m) => ({ ...m, page: 1 }));
    this.updateUrlAndFetch();
  }

  public getFormattedDatesSummary(): string {
    if (!this.checkInDate() && !this.checkOutDate()) {
      return 'Add dates';
    }
    if (this.checkInDate() && !this.checkOutDate()) {
      return `From ${this.formatDisplayDate(this.checkInDate())}`;
    }
    if (this.checkInDate() && this.checkOutDate()) {
      const nights = this.getNightsCount();
      const nightLabel = nights === 1 ? '1 night' : `${nights} nights`;
      return `${this.formatDisplayDate(this.checkInDate())} – ${this.formatDisplayDate(this.checkOutDate())} (${nightLabel})`;
    }
    return 'Add dates';
  }

  public formatDisplayDate(dateStr: string): string {
    if (!dateStr) return '';
    return this.settingsService.formatDate(dateStr);
  }

  public getNightsCount(): number {
    if (!this.checkInDate() || !this.checkOutDate()) return 0;
    const d1 = new Date(this.checkInDate());
    const d2 = new Date(this.checkOutDate());
    const diffTime = d2.getTime() - d1.getTime();
    return Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24)));
  }

  public clearDates(): void {
    this.checkInDate.set('');
    this.checkOutDate.set('');
    this.meta.update((m) => ({ ...m, page: 1 }));
    this.updateUrlAndFetch();
  }

  public clearCheckIn(): void {
    this.checkInDate.set('');
    this.meta.update((m) => ({ ...m, page: 1 }));
    this.updateUrlAndFetch();
  }

  public clearCheckOut(): void {
    this.checkOutDate.set('');
    this.meta.update((m) => ({ ...m, page: 1 }));
    this.updateUrlAndFetch();
  }

  public resetGuests(): void {
    this.adults.set(2);
    this.children.set(0);
    this.rooms.set(1);
    this.meta.update((m) => ({ ...m, page: 1 }));
    this.updateUrlAndFetch();
  }

  public updateGuests(field: 'adults' | 'children' | 'rooms', delta: number): void {
    if (field === 'adults') {
      const nextVal = Math.max(1, Math.min(20, this.adults() + delta));
      this.adults.set(nextVal);
    } else if (field === 'children') {
      const nextVal = Math.max(0, Math.min(10, this.children() + delta));
      this.children.set(nextVal);
    } else if (field === 'rooms') {
      const nextVal = Math.max(1, Math.min(10, this.rooms() + delta));
      this.rooms.set(nextVal);
    }
  }

  public applyGuests(): void {
    this.showGuestsDropdown.set(false);
    this.meta.update((m) => ({ ...m, page: 1 }));
    this.updateUrlAndFetch();
  }

  public toggleGuestsDropdown(): void {
    this.showGuestsDropdown.update((v) => !v);
  }

  public toggleAdvancedFilters(): void {
    this.showAdvancedFilters.update((v) => !v);
  }

  public onTypeSelect(type: string): void {
    this.selectedType.set(type);
    this.meta.update((m) => ({ ...m, page: 1 }));
    this.updateUrlAndFetch();
  }

  public setPriceRange(min: number | null, max: number | null): void {
    this.minPrice.set(min);
    this.maxPrice.set(max);
    this.meta.update((m) => ({ ...m, page: 1 }));
    this.updateUrlAndFetch();
  }

  public onMinPriceInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.minPrice.set(val ? parseFloat(val) : null);
  }

  public onMaxPriceInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.maxPrice.set(val ? parseFloat(val) : null);
  }

  public applyCustomPrice(): void {
    this.meta.update((m) => ({ ...m, page: 1 }));
    this.updateUrlAndFetch();
  }

  public toggleFeatured(): void {
    this.isFeaturedOnly.update((prev) => !prev);
    this.meta.update((m) => ({ ...m, page: 1 }));
    this.updateUrlAndFetch();
  }

  public onSortChange(option: string): void {
    this.sortOption.set(option);
    this.meta.update((m) => ({ ...m, page: 1 }));
    this.updateUrlAndFetch();
  }

  public setViewMode(mode: 'grid' | 'list'): void {
    this.viewMode.set(mode);
    this.updateUrlAndFetch();
  }

  public resetAllFilters(): void {
    this.searchKeyword.set('');
    this.selectedCityId.set('');
    this.checkInDate.set('');
    this.checkOutDate.set('');
    this.adults.set(2);
    this.children.set(0);
    this.rooms.set(1);
    this.minPrice.set(null);
    this.maxPrice.set(null);
    this.selectedType.set('');
    this.isFeaturedOnly.set(false);
    this.sortOption.set('default');
    this.meta.update((m) => ({ ...m, page: 1 }));
    this.updateUrlAndFetch();
  }

  public hasActiveFilters(): boolean {
    return Boolean(
      this.searchKeyword().trim() ||
        this.selectedCityId() ||
        this.checkInDate() ||
        this.checkOutDate() ||
        this.adults() !== 2 ||
        this.children() !== 0 ||
        this.rooms() !== 1 ||
        this.minPrice() !== null ||
        this.maxPrice() !== null ||
        this.sortOption() !== 'default'
    );
  }

  public getSelectedCityName(): string {
    const cityId = this.selectedCityId();
    if (!cityId) return '';
    const found = this.cities().find((c) => c.id === cityId);
    return found ? found.name : '';
  }

  public getSelectedTypeLabel(): string {
    const type = this.selectedType();
    if (!type) return '';
    return this.propertyTypeLabels[type] || type;
  }

  public getGuestsSummaryLabel(): string {
    const totalGuests = this.adults() + this.children();
    const guestText = totalGuests === 1 ? '1 Guest' : `${totalGuests} Guests`;
    const roomText = this.rooms() === 1 ? '1 Room' : `${this.rooms()} Rooms`;
    return `${guestText}, ${roomText}`;
  }

  // ================= PAGINATION =================

  public getTotalPages(): number {
    const total = this.meta().total;
    const size = this.meta().size;
    if (!total || !size) return 1;
    return Math.ceil(total / size);
  }

  public getPageNumbers(): (number | string)[] {
    const totalPages = this.getTotalPages();
    const current = this.meta().page;

    if (totalPages <= 7) {
      const pages: (number | string)[] = [];
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
      return pages;
    }

    const pages: (number | string)[] = [1];
    if (current > 3) {
      pages.push('...');
    }

    const start = Math.max(2, current - 1);
    const end = Math.min(totalPages - 1, current + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (current < totalPages - 2) {
      pages.push('...');
    }
    pages.push(totalPages);

    return pages;
  }

  public onPageChange(page: number | string): void {
    if (typeof page !== 'number') return;
    const totalPages = this.getTotalPages();
    if (page < 1 || page > totalPages || page === this.meta().page) return;

    this.meta.update((m) => ({ ...m, page }));
    this.updateUrlAndFetch();
    this.scrollToResultsTop();
  }

  public onPageSizeChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const size = parseInt(target.value, 10);
    if (!size || size === this.meta().size) return;

    this.meta.update((m) => ({ ...m, size, page: 1 }));
    this.updateUrlAndFetch();
    this.scrollToResultsTop();
  }

  public getShowingFrom(): number {
    if (this.meta().total === 0) return 0;
    return (this.meta().page - 1) * this.meta().size + 1;
  }

  public getShowingTo(): number {
    return Math.min(this.meta().page * this.meta().size, this.meta().total);
  }

  private scrollToResultsTop(): void {
    if (isPlatformBrowser(this.platformId)) {
      const el = document.getElementById('search-results-anchor');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  public updateUrlAndFetch(): void {
    const queryParams: Record<string, any> = {};

    if (this.searchKeyword().trim()) {
      queryParams['search'] = this.searchKeyword().trim();
    }
    if (this.selectedCityId()) {
      queryParams['city_id'] = this.selectedCityId();
    }
    if (this.checkInDate() && this.checkOutDate() && this.checkOutDate() > this.checkInDate()) {
      queryParams['check_in_date'] = this.checkInDate();
      queryParams['check_out_date'] = this.checkOutDate();
    } else if (this.checkInDate()) {
      queryParams['check_in_date'] = this.checkInDate();
    }
    if (this.adults() !== 2) {
      queryParams['adults'] = this.adults();
    }
    if (this.children() !== 0) {
      queryParams['children'] = this.children();
    }
    if (this.rooms() !== 1) {
      queryParams['rooms'] = this.rooms();
    }
    if (this.minPrice() !== null) {
      queryParams['min_price'] = this.minPrice();
    }
    if (this.maxPrice() !== null) {
      queryParams['max_price'] = this.maxPrice();
    }
    if (this.selectedType()) {
      queryParams['type'] = this.selectedType();
    }
    if (this.isFeaturedOnly()) {
      queryParams['is_featured'] = true;
    }
    if (this.sortOption() !== 'default') {
      queryParams['sort'] = this.sortOption();
    }
    if (this.meta().page > 1) {
      queryParams['page'] = this.meta().page;
    }
    if (this.meta().size !== 9) {
      queryParams['size'] = this.meta().size;
    }
    if (this.viewMode() !== 'grid') {
      queryParams['view'] = this.viewMode();
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
    });
  }

  // ================= PROPERTY DETAILS & HELPERS =================

  public goToPropertyDetail(slug?: string, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (slug) {
      this.router.navigate(['/stay', slug]);
    }
  }

  public getFoodOptionTags(item: Partial<PropertyData>): string[] {
    const foodOptions = item?.property_food_options ?? [];
    const included = foodOptions
      .filter((opt) => opt && opt.is_included && opt.name)
      .map((opt) => opt.name);
    return included.length > 0 ? included.slice(0, 3) : ['Himalayan tea & breakfast'];
  }

  public getEffectivePrice(item: Partial<PropertyData>): number {
    if (item.property_room_types && item.property_room_types.length > 0) {
      let minPrice = Infinity;
      for (const prt of item.property_room_types) {
        if (prt.pricing_tiers && prt.pricing_tiers.length > 0) {
          for (const tier of prt.pricing_tiers) {
            const effective = (tier.sale_per_night && tier.sale_per_night > 0 && tier.sale_per_night < tier.price_per_night)
              ? Number(tier.sale_per_night)
              : Number(tier.price_per_night);
            if (effective > 0 && effective < minPrice) {
              minPrice = effective;
            }
          }
        }
        const roomSale = Number(prt.sale_per_night ?? 0);
        const roomPrice = Number(prt.price_per_night ?? 0);
        const roomEff = (roomSale > 0 && roomSale < roomPrice) ? roomSale : roomPrice;
        if (roomEff > 0 && roomEff < minPrice) {
          minPrice = roomEff;
        }
      }
      if (minPrice !== Infinity && minPrice > 0) {
        return minPrice;
      }
    }

    const sale = Number(item.sale_per_night ?? item.sale_price ?? 0);
    if (sale > 0) {
      return sale;
    }
    return Number(item.price_per_night ?? (item as any)?.price ?? 0);
  }

  public hasDiscount(item: Partial<PropertyData>): boolean {
    const sale = Number(item.sale_per_night ?? item.sale_price ?? 0);
    const regular = Number(item.price_per_night ?? (item as any)?.price ?? 0);
    if (sale > 0 && regular > sale) return true;
    if (item.property_room_types && item.property_room_types.length > 0) {
      return item.property_room_types.some((prt) => {
        if (prt.pricing_tiers && prt.pricing_tiers.length > 0) {
          return prt.pricing_tiers.some((t) => !!(t.sale_per_night && t.sale_per_night > 0 && t.sale_per_night < t.price_per_night));
        }
        return !!(prt.sale_per_night && prt.sale_per_night > 0 && prt.price_per_night && prt.sale_per_night < prt.price_per_night);
      });
    }
    return false;
  }

  public getRegularPrice(item: Partial<PropertyData>): number {
    if (item.property_room_types && item.property_room_types.length > 0) {
      let minRegular = Infinity;
      for (const prt of item.property_room_types) {
        if (prt.pricing_tiers && prt.pricing_tiers.length > 0) {
          for (const tier of prt.pricing_tiers) {
            const price = Number(tier.price_per_night ?? 0);
            if (price > 0 && price < minRegular) {
              minRegular = price;
            }
          }
        }
        const roomPrice = Number(prt.price_per_night ?? 0);
        if (roomPrice > 0 && roomPrice < minRegular) {
          minRegular = roomPrice;
        }
      }
      if (minRegular !== Infinity && minRegular > 0) {
        return minRegular;
      }
    }
    return Number(item.price_per_night ?? (item as any)?.price ?? 0);
  }

  public getRating(item: Partial<PropertyData>): number {
    return Number(item?.average_rating ?? (item as any)?.rating ?? 0);
  }

  public getReviewsCount(item: Partial<PropertyData>): number {
    return Number(item?.total_reviews ?? item?.rating_summary?.total_reviews ?? (item as any)?.reviews_count ?? (item as any)?.review_count ?? 0);
  }

  public getReviewTag(item: Partial<PropertyData>): string {
    const count = this.getReviewsCount(item);
    const rating = this.getRating(item);
    if (count === 0 || rating === 0) return 'New Stay';
    if (rating >= 4.8) return 'Guest Favorite';
    if (rating >= 4.5) return 'Top Rated';
    if (rating >= 4.0) return 'Highly Rated';
    return 'Verified Stay';
  }

  public onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    const parent = img.parentElement;
    if (parent) {
      parent.style.background = 'linear-gradient(160deg,#3E4E37,#55694A 55%,#8AA07D)';
    }
  }

  // ================= ANIMATIONS & CANVAS =================

  private initRevealObserver(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.revealObserver?.disconnect();

    const revealEls = this.el.nativeElement.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      revealEls.forEach((el: Element) => el.classList.add('in', 'is-visible'));
      return;
    }

    this.revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in', 'is-visible');
            this.revealObserver?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    revealEls.forEach((el: Element) => this.revealObserver?.observe(el));
  }

  private refreshRevealObserver(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    queueMicrotask(() => this.initRevealObserver());
  }

  private initHeroCanvas(selector: string): () => void {
    if (this.reduceMotion) return () => {};

    const canvas = this.el.nativeElement.querySelector(selector) as HTMLCanvasElement | null;
    if (!canvas) return () => {};

    const ctx = canvas.getContext('2d');
    if (!ctx) return () => {};

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let raf = 0;
    const start = performance.now();

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

    let mistBlobs: Array<{
      x: number;
      y: number;
      r: number;
      speed: number;
      bob: number;
      bobSpeed: number;
      phase: number;
      opacity: number;
    }> = [];

    const build = () => {
      sparkles = [];
      const count = Math.min(Math.floor(w / 35), 40);
      for (let i = 0; i < count; i++) {
        sparkles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          size: 0.8 + Math.random() * 2.2,
          speedY: 0.15 + Math.random() * 0.35,
          speedX: (Math.random() - 0.5) * 0.2,
          opacity: 0.25 + Math.random() * 0.5,
          pulseSpeed: 1 + Math.random() * 2.5,
          phase: Math.random() * Math.PI * 2,
          color: Math.random() > 0.45 ? '250, 165, 45' : '143, 199, 212',
        });
      }

      mistBlobs = [];
      for (let i = 0; i < 5; i++) {
        mistBlobs.push({
          x: Math.random() * w,
          y: h * (0.2 + Math.random() * 0.6),
          r: 160 + Math.random() * 200,
          speed: 5 + Math.random() * 10,
          bob: 8 + Math.random() * 14,
          bobSpeed: 0.15 + Math.random() * 0.2,
          phase: Math.random() * Math.PI * 2,
          opacity: 0.04 + Math.random() * 0.04,
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

      for (const b of mistBlobs) {
        const bx = ((b.x + t * b.speed) % (w + b.r * 2)) - b.r;
        const by = b.y + Math.sin(t * b.bobSpeed + b.phase) * b.bob;
        const grad = ctx.createRadialGradient(bx, by, 0, bx, by, b.r);
        grad.addColorStop(0, `rgba(243, 250, 251, ${b.opacity})`);
        grad.addColorStop(0.6, `rgba(243, 250, 251, ${b.opacity * 0.3})`);
        grad.addColorStop(1, 'rgba(243, 250, 251, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(bx, by, b.r, 0, Math.PI * 2);
        ctx.fill();
      }

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
}
