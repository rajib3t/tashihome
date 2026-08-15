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
import { Logo } from '../../../shared/components/common/logo/logo';
import { PropertyService } from '../../../services/property/property-service';
import { PropertyData, PropertyQuery, PropertySearch } from '../../../services/property/property.model';
import { NavigationEnd, Router } from '@angular/router';
import { filter, catchError, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

export interface HomestayListing {
  id: string;
  region: string;
  name: string;
  location: string;
  rating: number;
  tags: string[];
  price: number;
  gradientBg: string;
  vectorType: string;
}

export interface StatItem {
  target: number;
  current: number;
  suffix?: string;
  decimals?: number;
  label: string;
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
  imports: [CommonModule, FormsModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit, AfterViewInit, OnDestroy {
  public properties = signal<Partial<PropertyData>[]>([]);
  public readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly zone = inject(NgZone);
  private revealObserver?: IntersectionObserver;

  // cleanup handles for the mist canvas / card tilt / parallax effects
  private mistCleanupFns: Array<() => void> = [];
  private tiltCleanupFn?: () => void;
  private parallaxCleanupFn?: () => void;
  private reduceMotion = false;

  newsletterEmail: string = '';
  newsletterSubmitted: boolean = false;

  stats: StatItem[] = [
    { target: 61, current: 0, label: 'homes on the register' },
    { target: 7, current: 0, label: 'hill states, one circuit' },
    { target: 100, current: 0, suffix: '%', label: 'visited on foot by us first' },
    { target: 4.9, current: 0, decimals: 1, label: 'average guest rating' },
  ];

  public readonly propertyService: PropertyService = inject(PropertyService);
  constructor(
    private el: ElementRef,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  ngOnInit(): void {
    this.loadProperties();

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        if (event.urlAfterRedirects === '/' || event.urlAfterRedirects.startsWith('/?')) {
          this.loadProperties();
          if (isPlatformBrowser(this.platformId)) {
            window.scrollTo({ top: 0, behavior: 'auto' });
          }
        }
      });
  }

  getFoodOptionTags(item: Partial<PropertyData>): string[] {
    const foodOptions = item?.property_food_options ?? [];
    const included = foodOptions
      .filter((opt) => opt && opt.is_included && opt.name)
      .map((opt) => opt.name);
    return included.length > 0 ? included.slice(0, 3) : ['Family stay'];
  }

  private loadProperties(): void {
    const search: PropertySearch = {
      is_featured: true,
    };

    const query: PropertyQuery = {
      page: 1,
      size: 6,
      search,
    };

    this.propertyService
      .getPublicProperties(query)
      .pipe(
        catchError((error) => {
          console.warn('Could not load featured properties:', error);
          return of({ data: [], total: 0, page: 1, size: 6 });
        })
      )
      .subscribe((response) => {
        this.properties.set(response?.data || []);
        this.cdr.markForCheck();
        this.refreshRevealObserver();
        this.refreshCardTilt();
      });
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      this.initRevealObserver();
      this.initStatsObserver();

      // Loop-driven effects run outside Angular's zone so rAF /
      // scroll / mousemove don't trigger change detection every frame.
      this.zone.runOutsideAngular(() => {
        this.mistCleanupFns.push(this.initMistCanvas('#mistCanvas', 6));
        this.mistCleanupFns.push(this.initMistCanvas('#mistCanvasFooter', 3));
        this.tiltCleanupFn = this.initCardTilt('.card-tilt');
        this.parallaxCleanupFn = this.initParallax('#ridgeParallax', 0.15);
      });
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
    this.revealObserver?.disconnect();

    const revealEls = this.el.nativeElement.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      revealEls.forEach((el: Element) => {
        el.classList.add('in', 'is-visible');
      });
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
      { threshold: 0.15 }
    );
    revealEls.forEach((el: Element) => this.revealObserver?.observe(el));
  }

  private refreshRevealObserver(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    queueMicrotask(() => this.initRevealObserver());
  }

  private initStatsObserver(): void {
    const statSection = this.el.nativeElement.querySelector('.stat-section');
    if (!statSection) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.animateStats();
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.4 }
    );

    observer.observe(statSection);
  }

  private animateStats(): void {
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
        requestAnimationFrame(update);
      } else {
        this.stats.forEach((stat) => {
          stat.current = stat.target;
        });
        this.cdr.markForCheck();
      }
    };

    requestAnimationFrame(update);
  }

  goToPropertyDetail(slug?: string): void {
    if (!slug) return;

    this.router.navigate(['/property', slug]);
  }

  // ============================================================
  // Mist canvas — layered, drifting cloud blobs behind the hero
  // and footer CTA. Purely decorative, so it's skipped entirely
  // under prefers-reduced-motion.
  // ============================================================
  private initMistCanvas(selector: string, layerCount: number): () => void {
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
    let blobs: MistBlob[] = [];

    const buildBlobs = () => {
      blobs = [];
      for (let i = 0; i < layerCount; i++) {
        const depth = layerCount > 1 ? i / (layerCount - 1) : 0;
        blobs.push({
          x: Math.random() * w,
          y: h * (0.15 + Math.random() * 0.55),
          r: (140 + Math.random() * 220) * (1 - depth * 0.4),
          speed: (6 + Math.random() * 10) * (0.5 + depth * 0.8),
          bob: 8 + Math.random() * 14,
          bobSpeed: 0.15 + Math.random() * 0.25,
          phase: Math.random() * Math.PI * 2,
          opacity: 0.05 + (1 - depth) * 0.09,
        });
      }
    };

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildBlobs();
    };

    const draw = (now: number) => {
      const t = (now - start) / 1000;
      ctx.clearRect(0, 0, w, h);
      for (const b of blobs) {
        const x = ((b.x + t * b.speed) % (w + b.r * 2)) - b.r;
        const y = b.y + Math.sin(t * b.bobSpeed + b.phase) * b.bob;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, b.r);
        grad.addColorStop(0, `rgba(245, 241, 232, ${b.opacity})`);
        grad.addColorStop(1, 'rgba(245, 241, 232, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, b.r, 0, Math.PI * 2);
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
    this.revealObserver?.disconnect();
    this.mistCleanupFns.forEach((stop) => stop());
    this.tiltCleanupFn?.();
    this.parallaxCleanupFn?.();
  }
}