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
import { CommonModule, DecimalPipe, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, catchError } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { PropertyService } from '../../../services/property/property-service';
import {
  PropertyData,
  PropertyQuery,
  PropertySearch,
  PROPERTY_TYPES,
  PROPERTY_TYPES_LABELS,
  PropertyType,
} from '../../../services/property/property.model';
import { CityService } from '../../../services/city/city-service';
import { City, CityQuery } from '../../../services/city/city-model';
import { SettingsService } from '../../../services/settings/settings-service';
import { PaginationMeta } from '../../../services/api/api-response.model';
import { environment } from '../../../../environments/environment';
import { computed } from '@angular/core';

@Component({
  selector: 'app-properties',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, DecimalPipe],
  templateUrl: './properties.html',
  styleUrl: './properties.css',
})
export class Properties implements OnInit, AfterViewInit, OnDestroy {
  public readonly assetUrl = environment.assetUrl;
  public  readonly appName = environment.applicationName;
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

  // State Signals
  public readonly currencySymbol = computed(() => this.settingsService.currencySymbol() || '₹');
  public properties = signal<Partial<PropertyData>[]>([]);
  public cities = signal<City[]>([]);
  public loading = signal<boolean>(true);
  public error = signal<string | null>(null);
  public viewMode = signal<'grid' | 'list'>('grid');

  // Filter & Search Signals
  public searchKeyword = signal<string>('');
  public selectedCityId = signal<string>('');
  public selectedType = signal<string>('');
  public isFeaturedOnly = signal<boolean>(false);
  public sortOption = signal<string>('default');

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

  // RxJS Search subject for debouncing
  private searchSubject = new Subject<string>();

  // Canvas & Observer handles
  private canvasCleanupFn?: () => void;
  private revealObserver?: IntersectionObserver;
  private reduceMotion = false;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit(): void {
    // Setup debounced search handler
    this.searchSubject
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((query) => {
        this.searchKeyword.set(query);
        this.meta.update((m) => ({ ...m, page: 1 }));
        this.updateUrlAndFetch();
      });

    // Load available cities for filter
    this.loadCities();

    // Listen to query parameters from URL for deep linking & bookmarking
    this.route.queryParams
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const query = params['search'] || '';
        const city = params['city'] || '';
        const type = params['type'] || '';
        const featured = params['featured'] === 'true';
        const sort = params['sort'] || 'default';
        const page = parseInt(params['page'], 10) || 1;
        const size = parseInt(params['size'], 10) || 9;
        const view = params['view'] === 'list' ? 'list' : 'grid';

        this.searchKeyword.set(query);
        this.selectedCityId.set(city);
        this.selectedType.set(type);
        this.isFeaturedOnly.set(featured);
        this.sortOption.set(sort);
        this.viewMode.set(view);
        this.meta.set({ page, size, total: this.meta().total });

        this.fetchProperties();
      });
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.initRevealObserver();

      this.zone.runOutsideAngular(() => {
        this.canvasCleanupFn = this.initHeroCanvas('#staysHeroCanvas');
      });
    }
  }

  ngOnDestroy(): void {
    this.canvasCleanupFn?.();
    this.revealObserver?.disconnect();
  }

  // ================= DATA FETCHING =================

  public fetchProperties(): void {
    this.loading.set(true);
    this.error.set(null);

    const search: PropertySearch = {};
    if (this.searchKeyword().trim()) {
      search.name = this.searchKeyword().trim();
    }
    if (this.selectedCityId()) {
      search.city_id = this.selectedCityId();
    }
    if (this.selectedType()) {
      search.type = this.selectedType() as PropertyType;
    }
    if (this.isFeaturedOnly()) {
      search.is_featured = true;
    }

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

    const query: PropertyQuery = {
      page: this.meta().page,
      size: this.meta().size,
      search,
      sortBy,
      sortOrder,
    };

    this.propertyService.public
      .getProperties(query)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => {
          console.error('Error fetching public properties:', err);
          const errorMsg =
            this.propertyService.extractApiErrorMessage(err) ||
            'Unable to load homestays at this moment. Please check your connection and try again.';
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

  public clearSearch(): void {
    this.searchKeyword.set('');
    this.meta.update((m) => ({ ...m, page: 1 }));
    this.updateUrlAndFetch();
  }

  public onCitySelect(cityId: string): void {
    this.selectedCityId.set(cityId);
    this.meta.update((m) => ({ ...m, page: 1 }));
    this.updateUrlAndFetch();
  }

  public onTypeSelect(type: string): void {
    this.selectedType.set(type);
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
        this.selectedType() ||
        this.isFeaturedOnly() ||
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
      const el = document.getElementById('stays-results-anchor');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  private updateUrlAndFetch(): void {
    const queryParams: Record<string, any> = {};

    if (this.searchKeyword().trim()) {
      queryParams['search'] = this.searchKeyword().trim();
    }
    if (this.selectedCityId()) {
      queryParams['city'] = this.selectedCityId();
    }
    if (this.selectedType()) {
      queryParams['type'] = this.selectedType();
    }
    if (this.isFeaturedOnly()) {
      queryParams['featured'] = true;
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
              ? tier.sale_per_night
              : tier.price_per_night;
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

  public getRoomTypeNames(item: Partial<PropertyData>): string {
    if (item.room_type?.name) {
      return item.room_type.name;
    }
    if (item.property_room_types && item.property_room_types.length > 0) {
      return item.property_room_types.map((r) => r.room_type?.name).filter(Boolean).join(', ');
    }
    return '';
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

      // Draw subtle drifting mist clouds
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

      // Draw golden alpine sparks
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
