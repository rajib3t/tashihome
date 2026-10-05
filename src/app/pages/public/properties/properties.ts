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
import { Subject, of, combineLatest } from 'rxjs';
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
import { LocationService } from '../../../services/location/location-service';
import { LocationResponse, LocationQuery } from '../../../services/location/location-model';
import { SettingsService } from '../../../services/settings/settings-service';
import { SeoService } from '../../../services/seo/seo-service';
import { PaginationMeta } from '../../../services/api/api-response.model';
import { environment } from '../../../../environments/environment';
import { getPhysicalAddress } from '../../../utils/address.utils';

import { LocationAutocomplete } from '../../../shared/components/location-autocomplete/location-autocomplete';

export interface BreadcrumbItem {
  label: string;
  url?: string;
}

@Component({
  selector: 'app-properties',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, DecimalPipe, LocationAutocomplete],
  templateUrl: './properties.html',
  styleUrl: './properties.css',
})
export class Properties implements OnInit, AfterViewInit, OnDestroy {
  public readonly assetUrl = environment.assetUrl;
  public readonly appName = environment.applicationName;

  // Services
  public readonly propertyService = inject(PropertyService);
  public readonly cityService = inject(CityService);
  public readonly locationService = inject(LocationService);
  public readonly settingsService = inject(SettingsService);
  public readonly seoService = inject(SeoService);
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
  public locations = signal<LocationResponse[]>([]);
  public loading = signal<boolean>(true);
  public error = signal<string | null>(null);
  public viewMode = signal<'grid' | 'list'>('grid');

  // Route Path & Filter Signals
  public citySlug = signal<string>('');
  public locationSlug = signal<string>('');
  public searchKeyword = signal<string>('');
  public selectedCityId = signal<string>('');
  public selectedLocationId = signal<string>('');
  public selectedType = signal<string>('');
  public isFeaturedOnly = signal<boolean>(false);
  public minPrice = signal<number | null>(null);
  public maxPrice = signal<number | null>(null);
  public sortOption = signal<string>('default');

  // Price Modal / Temp input states
  public showPriceModal = signal<boolean>(false);
  public tempMinPrice = signal<number | null>(null);
  public tempMaxPrice = signal<number | null>(null);

  // Pagination State
  public meta = signal<PaginationMeta>({
    page: 1,
    size: 12,
    total: 0,
  });
  public readonly pageSizeOptions: number[] = [6, 9, 12, 18, 24];

  // Constants
  public readonly propertyTypes = PROPERTY_TYPES;
  public readonly propertyTypeLabels = PROPERTY_TYPES_LABELS;

  // Computed Helpers
  public currentCity = computed(() => {
    const slug = this.citySlug();
    const id = this.selectedCityId();
    if (slug) {
      return this.cities().find((c) => c.slug === slug || c.name?.toLowerCase().replace(/\s+/g, '-') === slug) || null;
    }
    if (id) {
      return this.cities().find((c) => c.id === id) || null;
    }
    return null;
  });

  public currentLocation = computed(() => {
    const slug = this.locationSlug();
    const id = this.selectedLocationId();
    if (slug) {
      return this.locations().find((l) => l.slug === slug || l.name?.toLowerCase().replace(/\s+/g, '-') === slug) || null;
    }
    if (id) {
      return this.locations().find((l) => l.id === id) || null;
    }
    return null;
  });

  public breadcrumbs = computed<BreadcrumbItem[]>(() => {
    const crumbs: BreadcrumbItem[] = [
      { label: 'Home', url: '/' },
      { label: 'Stays', url: '/stays' },
    ];

    const cSlug = this.citySlug();
    const cName = this.currentCity()?.name || this.formatSlugToName(cSlug);

    if (cSlug) {
      crumbs.push({
        label: cName,
        url: this.locationSlug() ? `/stays/${cSlug}` : undefined,
      });
    }

    const lSlug = this.locationSlug();
    const lName = this.currentLocation()?.name || this.formatSlugToName(lSlug);
    if (lSlug && cSlug) {
      crumbs.push({
        label: lName,
      });
    }

    return crumbs;
  });

  public pageHeroTitle = computed(() => {
    const lSlug = this.locationSlug();
    const cSlug = this.citySlug();
    const lName = this.currentLocation()?.name || this.formatSlugToName(lSlug);
    const cName = this.currentCity()?.name || this.formatSlugToName(cSlug);

    if (lSlug && cSlug) {
      return `Homestays in ${lName}, ${cName}`;
    }
    if (cSlug) {
      return `Homestays in ${cName}`;
    }
    return 'Discover genuine homestays in the hills.';
  });

  public pageHeroSubtitle = computed(() => {
    const cSlug = this.citySlug();
    const cName = this.currentCity()?.name || this.formatSlugToName(cSlug);
    if (cSlug) {
      return `Hand-picked verified stays and family cottages nestled in ${cName}. Visited on foot, hearth-warmed, and hosted with authentic Himalayan warmth.`;
    }
    return 'Hand-picked, visited on foot, and run by Himalayan families. Find quiet cottages, tea-estate porches, and hearth-warmed rooms across North Bengal & Sikkim.';
  });

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

    // Listen to route params & query params combined
    combineLatest([this.route.paramMap, this.route.queryParams])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([paramMap, queryParams]) => {
        const pathCitySlug = paramMap.get('city_slug') || '';
        const pathLocationSlug = paramMap.get('location_slug') || '';

        const query = queryParams['search'] || '';
        const cityParam = queryParams['city'] || queryParams['city_id'] || '';
        const citySlugParam = queryParams['city_slug'] || pathCitySlug;
        const locationParam = queryParams['location'] || queryParams['location_id'] || '';
        const locationSlugParam = queryParams['location_slug'] || pathLocationSlug;
        const type = queryParams['type'] || '';
        const featured = queryParams['featured'] === 'true' || queryParams['is_featured'] === 'true';
        const minP = queryParams['min_price'] ? Number(queryParams['min_price']) : null;
        const maxP = queryParams['max_price'] ? Number(queryParams['max_price']) : null;
        const sort = queryParams['sort'] || queryParams['sort_by'] || 'default';
        const sortOrd = queryParams['sort_order'];
        const page = parseInt(queryParams['page'], 10) || 1;
        const size = parseInt(queryParams['size'], 10) || 12;
        const view = queryParams['view'] === 'list' ? 'list' : 'grid';

        this.citySlug.set(citySlugParam);
        this.locationSlug.set(locationSlugParam);
        this.searchKeyword.set(query);
        this.selectedCityId.set(cityParam);
        this.selectedLocationId.set(locationParam);
        this.selectedType.set(type);
        this.isFeaturedOnly.set(featured);
        this.minPrice.set(minP);
        this.maxPrice.set(maxP);
        this.tempMinPrice.set(minP);
        this.tempMaxPrice.set(maxP);

        // Normalize sort option
        if (sort === 'price' && sortOrd === 'asc') {
          this.sortOption.set('price_asc');
        } else if (sort === 'price' && sortOrd === 'desc') {
          this.sortOption.set('price_desc');
        } else if (sort === 'name' && sortOrd === 'asc') {
          this.sortOption.set('name_asc');
        } else if (sort === 'name' && sortOrd === 'desc') {
          this.sortOption.set('name_desc');
        } else {
          this.sortOption.set(sort);
        }

        this.viewMode.set(view);
        this.meta.set({ page, size, total: this.meta().total });

        // Load locations for current city
        this.loadLocationsForCity(citySlugParam, cityParam);

        this.updateSeoMetadata();
        this.fetchProperties();
      });
  }

  private updateSeoMetadata(): void {
    const cSlug = this.citySlug();
    const lSlug = this.locationSlug();
    const cName = this.currentCity()?.name || (cSlug ? this.formatSlugToName(cSlug) : '');
    const lName = this.currentLocation()?.name || (lSlug ? this.formatSlugToName(lSlug) : '');

    let title = 'Verified Homestays, Tea Estate Retreats & Cottages';
    let description = 'Browse handpicked homestays across Darjeeling, Kalimpong, Kurseong, Mirik & Dooars. Enjoy mountain views, organic meals, and warm local hospitality.';

    if (lName && cName) {
      title = `Homestays in ${lName}, ${cName} — Verified Hill Stays`;
      description = `Discover handpicked homestays in ${lName}, ${cName}. Authentic Himalayan hospitality, local food, and real traveler reviews on Tashihomes.`;
    } else if (cName) {
      title = `Homestays in ${cName} — Verified Stays & Mountain Cottages`;
      description = `Find and book verified homestays in ${cName}. Real host photos, transparent pricing, and instant booking with Tashihomes.`;
    }

    const breadcrumbs = this.breadcrumbs().map((b) => ({ name: b.label, url: b.url || '/stays' }));
    const propList = this.properties();
    const schema = propList.length > 0
      ? this.seoService.generatePropertiesListingSchema(title, description, propList, breadcrumbs)
      : this.seoService.generateBreadcrumbSchema(breadcrumbs);

    this.seoService.updateSeo({
      title,
      description,
      type: 'website',
      canonical: this.router.url.split('?')[0].split('#')[0],
      structuredData: schema
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
    this.seoService.removeStructuredData();
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
    if (this.citySlug().trim()) {
      search.city_slug = this.citySlug().trim();
    }
    if (this.selectedCityId().trim()) {
      search.city_id = this.selectedCityId().trim();
    }
    if (this.locationSlug().trim()) {
      search.location_slug = this.locationSlug().trim();
    }
    if (this.selectedLocationId().trim()) {
      search.location_id = this.selectedLocationId().trim();
    }
    if (this.selectedType().trim()) {
      search.type = this.selectedType().trim() as PropertyType;
    }
    if (this.isFeaturedOnly()) {
      search.is_featured = true;
    }
    if (this.minPrice() !== null && this.minPrice() !== undefined) {
      search.min_price = this.minPrice()!;
    }
    if (this.maxPrice() !== null && this.maxPrice() !== undefined) {
      search.max_price = this.maxPrice()!;
    }

    let sortBy: 'created_at' | 'name' | 'price' | string = 'created_at';
    let sortOrder: 'asc' | 'desc' = 'desc';

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
      case 'created_at_desc':
      case 'default':
      default:
        sortBy = 'created_at';
        sortOrder = 'desc';
    }

    const query: PropertyQuery = {
      page: this.meta().page,
      size: this.meta().size,
      search,
      city_slug: this.citySlug().trim() || undefined,
      location_slug: this.locationSlug().trim() || undefined,
      city_id: this.selectedCityId().trim() || undefined,
      location_id: this.selectedLocationId().trim() || undefined,
      min_price: this.minPrice() !== null ? this.minPrice()! : undefined,
      max_price: this.maxPrice() !== null ? this.maxPrice()! : undefined,
      is_featured: this.isFeaturedOnly() ? true : undefined,
      sort_by: sortBy,
      sort_order: sortOrder,
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
            size: res.meta.size ?? this.meta().size,
          });
        }
        this.updateSeoMetadata();
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
        this.updateSeoMetadata();
        this.cdr.markForCheck();
      });
  }

  private loadLocationsForCity(citySlug?: string, cityId?: string): void {
    const query: LocationQuery = {
      page: 1,
      size: 50,
      city_slug: citySlug || undefined,
      city_id: cityId || undefined,
      sortBy: 'name',
      sortOrder: 'asc',
      sort_by: 'name',
      sort_order: 'asc',
    };

    this.locationService.public
      .getLocations(query)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => {
          console.warn('Could not load public locations:', err);
          return of({ data: [], total: 0, page: 1, size: 50, status: '', message: '' });
        })
      )
      .subscribe((res) => {
        this.locations.set(res?.data || []);
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

  public onCitySelect(cityIdOrSlug: string): void {
    if (!cityIdOrSlug) {
      this.citySlug.set('');
      this.locationSlug.set('');
      this.selectedCityId.set('');
      this.selectedLocationId.set('');
      this.meta.update((m) => ({ ...m, page: 1 }));
      this.router.navigate(['/stays'], {
        queryParams: this.buildCurrentQueryParams(),
      });
      return;
    }

    const city = this.cities().find((c) => c.id === cityIdOrSlug || c.slug === cityIdOrSlug);
    const targetSlug = city?.slug || city?.name?.toLowerCase().replace(/\s+/g, '-') || cityIdOrSlug;

    this.citySlug.set(targetSlug);
    this.locationSlug.set('');
    this.selectedCityId.set(city?.id || '');
    this.selectedLocationId.set('');
    this.meta.update((m) => ({ ...m, page: 1 }));

    this.router.navigate(['/stays', targetSlug], {
      queryParams: this.buildCurrentQueryParams(),
    });
  }

  public onLocationSelect(locationIdOrSlug: string): void {
    const cSlug = this.citySlug();
    if (!locationIdOrSlug) {
      this.locationSlug.set('');
      this.selectedLocationId.set('');
      this.meta.update((m) => ({ ...m, page: 1 }));
      if (cSlug) {
        this.router.navigate(['/stays', cSlug], {
          queryParams: this.buildCurrentQueryParams(),
        });
      } else {
        this.router.navigate(['/stays'], {
          queryParams: this.buildCurrentQueryParams(),
        });
      }
      return;
    }

    const loc = this.locations().find((l) => l.id === locationIdOrSlug || l.slug === locationIdOrSlug);
    const targetLocSlug = loc?.slug || loc?.name?.toLowerCase().replace(/\s+/g, '-') || locationIdOrSlug;

    this.locationSlug.set(targetLocSlug);
    this.selectedLocationId.set(loc?.id || '');
    this.meta.update((m) => ({ ...m, page: 1 }));

    if (cSlug) {
      this.router.navigate(['/stays', cSlug, targetLocSlug], {
        queryParams: this.buildCurrentQueryParams(),
      });
    } else {
      this.router.navigate(['/stays'], {
        queryParams: {
          ...this.buildCurrentQueryParams(),
          location_slug: targetLocSlug,
        },
      });
    }
  }

  public onLocationAutocompleteSelected(loc: LocationResponse | null): void {
    if (!loc) {
      this.onLocationSelect('');
      return;
    }
    const cSlug = loc.city?.slug || (loc.city?.name ? loc.city.name.toLowerCase().replace(/\s+/g, '-') : '');
    const lSlug = loc.slug || (loc.name ? loc.name.toLowerCase().replace(/\s+/g, '-') : '');

    this.locationSlug.set(lSlug);
    this.selectedLocationId.set(loc.id);
    if (loc.city?.id) {
      this.selectedCityId.set(loc.city.id);
    }
    this.meta.update((m) => ({ ...m, page: 1 }));

    if (cSlug) {
      this.citySlug.set(cSlug);
      this.router.navigate(['/stays', cSlug, lSlug], {
        queryParams: this.buildCurrentQueryParams(),
      });
    } else {
      this.router.navigate(['/stays'], {
        queryParams: {
          ...this.buildCurrentQueryParams(),
          location_slug: lSlug,
          location_id: loc.id,
        },
      });
    }
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

  public applyPriceFilter(): void {
    this.minPrice.set(this.tempMinPrice());
    this.maxPrice.set(this.tempMaxPrice());
    this.showPriceModal.set(false);
    this.meta.update((m) => ({ ...m, page: 1 }));
    this.updateUrlAndFetch();
  }

  public clearPriceFilter(): void {
    this.minPrice.set(null);
    this.maxPrice.set(null);
    this.tempMinPrice.set(null);
    this.tempMaxPrice.set(null);
    this.showPriceModal.set(false);
    this.meta.update((m) => ({ ...m, page: 1 }));
    this.updateUrlAndFetch();
  }

  public resetAllFilters(): void {
    this.searchKeyword.set('');
    this.citySlug.set('');
    this.locationSlug.set('');
    this.selectedCityId.set('');
    this.selectedLocationId.set('');
    this.selectedType.set('');
    this.isFeaturedOnly.set(false);
    this.minPrice.set(null);
    this.maxPrice.set(null);
    this.tempMinPrice.set(null);
    this.tempMaxPrice.set(null);
    this.sortOption.set('default');
    this.meta.update((m) => ({ ...m, page: 1 }));

    this.router.navigate(['/stays']);
  }

  public hasActiveFilters(): boolean {
    return Boolean(
      this.searchKeyword().trim() ||
        this.citySlug() ||
        this.selectedCityId() ||
        this.locationSlug() ||
        this.selectedLocationId() ||
        this.selectedType() ||
        this.isFeaturedOnly() ||
        this.minPrice() !== null ||
        this.maxPrice() !== null ||
        this.sortOption() !== 'default'
    );
  }

  public getSelectedCityName(): string {
    if (this.currentCity()?.name) return this.currentCity()!.name;
    const cityId = this.selectedCityId();
    if (cityId) {
      const found = this.cities().find((c) => c.id === cityId);
      if (found) return found.name;
    }
    const cSlug = this.citySlug();
    if (cSlug) return this.formatSlugToName(cSlug);
    return '';
  }

  public getSelectedLocationName(): string {
    if (this.currentLocation()?.name) return this.currentLocation()!.name;
    const locId = this.selectedLocationId();
    if (locId) {
      const found = this.locations().find((l) => l.id === locId);
      if (found) return found.name;
    }
    const lSlug = this.locationSlug();
    if (lSlug) return this.formatSlugToName(lSlug);
    return '';
  }

  public getSelectedTypeLabel(): string {
    const type = this.selectedType();
    if (!type) return '';
    return this.propertyTypeLabels[type] || type;
  }

  public formatSlugToName(slug: string): string {
    if (!slug) return '';
    return slug
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
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

  private buildCurrentQueryParams(): Record<string, any> {
    const queryParams: Record<string, any> = {};

    if (this.searchKeyword().trim()) {
      queryParams['search'] = this.searchKeyword().trim();
    }
    if (this.selectedType()) {
      queryParams['type'] = this.selectedType();
    }
    if (this.isFeaturedOnly()) {
      queryParams['featured'] = true;
    }
    if (this.minPrice() !== null && this.minPrice() !== undefined) {
      queryParams['min_price'] = this.minPrice();
    }
    if (this.maxPrice() !== null && this.maxPrice() !== undefined) {
      queryParams['max_price'] = this.maxPrice();
    }
    if (this.sortOption() !== 'default') {
      queryParams['sort'] = this.sortOption();
    }
    if (this.meta().page > 1) {
      queryParams['page'] = this.meta().page;
    }
    if (this.meta().size !== 12) {
      queryParams['size'] = this.meta().size;
    }
    if (this.viewMode() !== 'grid') {
      queryParams['view'] = this.viewMode();
    }

    return queryParams;
  }

  private updateUrlAndFetch(): void {
    const queryParams = this.buildCurrentQueryParams();

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
    const orderMap: Record<string, number> = {
      lunch: 1,
      evening_snacks: 2,
      evening_snack: 2,
      tiffin: 2,
      evening_snacs: 2,
      evening_scacs: 2,
      dinner: 3,
      breakfast: 4,
    };
    const formatName = (name: string): string => {
      const raw = (name || '').toLowerCase().trim().replace(/\s+/g, '_');
      if (raw === 'lunch') return 'Lunch';
      if (raw === 'evening_snacks' || raw === 'evening_snack' || raw === 'tiffin' || raw === 'evening_snacs' || raw === 'evening_scacs') return 'Evening Snacks';
      if (raw === 'dinner') return 'Dinner';
      if (raw === 'breakfast') return 'Breakfast';
      return name;
    };
    const included = [...foodOptions]
      .filter((opt) => opt && opt.is_included && opt.name)
      .sort((a, b) => {
        const keyA = (a.name || a.id || '').toLowerCase().trim().replace(/\s+/g, '_');
        const keyB = (b.name || b.id || '').toLowerCase().trim().replace(/\s+/g, '_');
        return (orderMap[keyA] ?? 99) - (orderMap[keyB] ?? 99);
      })
      .map((opt) => formatName(opt.name));
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

  public getPhysicalAddress(item: Partial<PropertyData>): string {
    return getPhysicalAddress(item);
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
