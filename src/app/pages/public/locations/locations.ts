import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  PLATFORM_ID,
  ChangeDetectorRef,
  DestroyRef,
  NgZone,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, combineLatest } from 'rxjs';

import { LocationService } from '../../../services/location/location-service';
import { LocationResponse, LocationQuery } from '../../../services/location/location-model';
import { PropertyService } from '../../../services/property/property-service';
import { PropertyData, PropertyQuery } from '../../../services/property/property.model';
import { SettingsService } from '../../../services/settings/settings-service';
import { PaginationMeta } from '../../../services/api/api-response.model';
import { environment } from '../../../../environments/environment';
import { SingleProperty } from '../../../shared/components/properties/single-property/single-property';
import { LocationAutocomplete } from '../../../shared/components/location-autocomplete/location-autocomplete';

@Component({
  selector: 'app-locations',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SingleProperty, LocationAutocomplete],
  templateUrl: './locations.html',
  styleUrl: './locations.css',
})
export class Locations implements OnInit, AfterViewInit, OnDestroy {
  public readonly assetUrl = environment.assetUrl;

  private readonly locationService = inject(LocationService);
  private readonly propertyService = inject(PropertyService);
  public readonly settingsService = inject(SettingsService);
  public readonly router = inject(Router);
  public readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly zone = inject(NgZone);

  // Canvas & Observer handles
  private canvasCleanupFn?: () => void;
  private revealObserver?: IntersectionObserver;
  private reduceMotion = false;

  // Currency
  public readonly currencySymbol = computed(() => this.settingsService.currencySymbol() || '₹');

  // Archive Mode State
  public currentSlug = signal<string>('');
  public currentLocation = signal<LocationResponse | null>(null);

  // All Locations List State (Overview)
  public locations = signal<LocationResponse[]>([]);
  public loadingLocations = signal<boolean>(true);
  public searchKeyword = signal<string>('');

  // Location Stays State (Detail Archive)
  public properties = signal<Partial<PropertyData>[]>([]);
  public loadingProperties = signal<boolean>(false);
  public viewMode = signal<'grid' | 'list'>('grid');
  public sortOption = signal<string>('default');
  public meta = signal<PaginationMeta>({ page: 1, size: 9, total: 0 });

  public filteredLocations = computed(() => {
    const list = this.locations();
    const query = this.searchKeyword().toLowerCase().trim();
    if (!query) return list;
    return list.filter(
      (l) =>
        l.name?.toLowerCase().includes(query) ||
        l.city?.name?.toLowerCase().includes(query) ||
        l.city?.country?.name?.toLowerCase().includes(query)
    );
  });

  public isDetailMode = computed(() => Boolean(this.currentSlug()));

  ngOnInit(): void {
    // Listen to route param 'slug'
    combineLatest([this.route.paramMap, this.route.queryParams])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([paramMap, queryParams]) => {
        const slug = paramMap.get('slug') || '';
        this.currentSlug.set(slug);

        const page = parseInt(queryParams['page'], 10) || 1;
        const size = parseInt(queryParams['size'], 10) || 9;
        const sort = queryParams['sort'] || 'default';
        const view = queryParams['view'] === 'list' ? 'list' : 'grid';

        this.sortOption.set(sort);
        this.viewMode.set(view);
        this.meta.update((m) => ({ ...m, page, size }));

        if (slug) {
          this.loadLocationDetailAndProperties(slug);
        } else {
          this.loadAllLocations();
        }
      });
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.scrollTo({ top: 0, behavior: 'auto' });
      this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.initRevealObserver();

      this.zone.runOutsideAngular(() => {
        this.canvasCleanupFn = this.initHeroCanvas('#locationsHeroCanvas');
      });
    }
  }

  ngOnDestroy(): void {
    this.canvasCleanupFn?.();
    this.revealObserver?.disconnect();
  }

  private initRevealObserver(): void {
    const reveals = document.querySelectorAll('.reveal');
    if (!reveals.length) return;

    this.revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            this.revealObserver?.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    reveals.forEach((el) => this.revealObserver?.observe(el));
  }

  private initHeroCanvas(canvasSelector: string): (() => void) | undefined {
    if (this.reduceMotion) return;

    const canvas = document.querySelector<HTMLCanvasElement>(canvasSelector);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = (canvas.width = canvas.clientWidth);
    let h = (canvas.height = canvas.clientHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let sparkles: Array<{
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
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

    let raf: number;
    const start = performance.now();

    const build = () => {
      sparkles = [];
      const sparkCount = Math.min(Math.floor(w / 30), 40);
      for (let i = 0; i < sparkCount; i++) {
        sparkles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          size: 0.8 + Math.random() * 1.8,
          speedX: (Math.random() - 0.5) * 0.25,
          speedY: 0.15 + Math.random() * 0.35,
          opacity: 0.2 + Math.random() * 0.6,
          pulseSpeed: 0.8 + Math.random() * 1.5,
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

  public loadAllLocations(): void {
    this.loadingLocations.set(true);
    const query: LocationQuery = {
      page: 1,
      size: 50,
      sort_by: 'created_at',
      sort_order: 'desc',
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
        this.loadingLocations.set(false);
        this.locations.set(res?.data || []);
        this.cdr.markForCheck();
      });
  }

  public loadLocationDetailAndProperties(slug: string): void {
    this.loadingLocations.set(true);
    this.loadingProperties.set(true);

    // 1. Fetch location detail
    this.locationService.public
      .getLocations({ search: { slug }, size: 1 })
      .pipe(
        catchError(() => this.locationService.public.getLocationBySlug(slug)),
        catchError(() => of({ data: null, status: 'error', message: '' }))
      )
      .subscribe((res: any) => {
        this.loadingLocations.set(false);
        const loc = Array.isArray(res?.data) ? res.data[0] : res?.data;
        this.currentLocation.set(loc || null);
        this.cdr.markForCheck();

        // 2. Fetch properties for this location
        this.fetchPropertiesForLocation(slug, loc?.id);
      });
  }

  private fetchPropertiesForLocation(slug: string, locationId?: string): void {
    this.loadingProperties.set(true);

    let sortBy: string | undefined = 'created_at';
    let sortOrder: 'asc' | 'desc' | undefined = 'desc';

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
      default:
        sortBy = 'created_at';
        sortOrder = 'desc';
    }

    const query: PropertyQuery = {
      page: this.meta().page,
      size: this.meta().size,
      location_slug: slug,
      location_id: locationId,
      sortBy,
      sortOrder,
      sort_by: sortBy,
      sort_order: sortOrder,
    };

    this.propertyService.public
      .getProperties(query)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => {
          console.warn('Could not load properties for location:', err);
          return of({ data: [], meta: { total: 0, page: 1, size: this.meta().size }, status: 'error', message: '' });
        })
      )
      .subscribe((res) => {
        this.loadingProperties.set(false);
        this.properties.set(res?.data || []);
        if (res?.meta) {
          this.meta.set({
            total: res.meta.total,
            page: res.meta.page,
            size: res.meta.size ?? this.meta().size,
          });
        }
        this.cdr.markForCheck();
      });
  }

  public onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchKeyword.set(input.value);
  }

  public clearSearch(): void {
    this.searchKeyword.set('');
  }

  public onSortChange(sort: string): void {
    this.sortOption.set(sort);
    this.meta.update((m) => ({ ...m, page: 1 }));
    this.updateQueryParams();
    if (this.currentSlug()) {
      this.fetchPropertiesForLocation(this.currentSlug(), this.currentLocation()?.id);
    }
  }

  public setViewMode(mode: 'grid' | 'list'): void {
    this.viewMode.set(mode);
    this.updateQueryParams();
  }

  public onPageChange(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.meta.update((m) => ({ ...m, page }));
    this.updateQueryParams();
    if (this.currentSlug()) {
      this.fetchPropertiesForLocation(this.currentSlug(), this.currentLocation()?.id);
      if (isPlatformBrowser(this.platformId)) {
        window.scrollTo({ top: 400, behavior: 'smooth' });
      }
    }
  }

  public totalPages = computed(() => {
    const total = this.meta().total;
    const size = this.meta().size;
    return Math.max(1, Math.ceil(total / size));
  });

  public getPages(): number[] {
    const total = this.totalPages();
    const current = this.meta().page;
    const pages: number[] = [];

    const start = Math.max(1, current - 2);
    const end = Math.min(total, current + 2);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  public onLocationAutocompleteSelected(loc: LocationResponse | null): void {
    if (loc?.slug) {
      this.router.navigate(['/locations', loc.slug]);
    } else if (loc?.id) {
      this.router.navigate(['/locations', loc.id]);
    } else {
      this.router.navigate(['/locations']);
    }
  }

  private updateQueryParams(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        page: this.meta().page > 1 ? this.meta().page : undefined,
        sort: this.sortOption() !== 'default' ? this.sortOption() : undefined,
        view: this.viewMode() !== 'grid' ? this.viewMode() : undefined,
      },
      queryParamsHandling: 'merge',
    });
  }

  public formatSlugToName(slug: string): string {
    if (!slug) return '';
    return slug
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
}
