import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ElementRef,
  PLATFORM_ID,
  NgZone,
  inject,
  signal,
  computed,
  ChangeDetectorRef,
  DestroyRef,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, retry, timeout } from 'rxjs';

import { TestimonialService } from '../../../services/testimonial/testimonial-service';
import { TestimonialData } from '../../../services/testimonial/testimonial.model';
import { PropertyService } from '../../../services/property/property-service';
import { PropertyData, PropertyQuery } from '../../../services/property/property.model';
import { CityService } from '../../../services/city/city-service';
import { City, CityQuery } from '../../../services/city/city-model';
import { AuthService } from '../../../services/auth/auth-service';
import { DashboardService } from '../../../services/dashboard/dashboard-service';
import { SeoService } from '../../../services/seo/seo-service';
import { environment } from '../../../../environments/environment';
import { SingleProperty } from '../../../shared/components/properties/single-property/single-property';

export type ExperienceFilter = 'all' | 'guest' | 'host' | 'top_rated' | 'tea_culture' | 'village_life';

export interface CuratedExperience {
  id: string;
  title: string;
  subtitle: string;
  region: string;
  duration: string;
  season: string;
  description: string;
  hostQuote: string;
  hostName: string;
  tag: string;
  image: string;
  rating: number;
}

@Component({
  selector: 'app-experiences',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SingleProperty],
  templateUrl: './experiences.html',
  styleUrl: './experiences.css',
})
export class Experiences implements OnInit, AfterViewInit, OnDestroy {
  public readonly assetUrl = environment.assetUrl;
  public readonly router = inject(Router);
  public readonly seoService = inject(SeoService);
  private readonly el = inject(ElementRef);
  private readonly zone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);

  public readonly testimonialService = inject(TestimonialService);
  public readonly propertyService = inject(PropertyService);
  public readonly cityService = inject(CityService);
  public readonly authService = inject(AuthService);
  public readonly dashboardService = inject(DashboardService);

  // State Signals
  public testimonials = signal<TestimonialData[]>([]);
  public properties = signal<Partial<PropertyData>[]>([]);
  public cities = signal<City[]>([]);
  public loadingTestimonials = signal<boolean>(true);
  public loadingProperties = signal<boolean>(true);
  public loadingCities = signal<boolean>(true);

  // Filters
  public selectedFilter = signal<ExperienceFilter>('all');
  public searchQuery = signal<string>('');
  public selectedRatingFilter = signal<number | null>(null);

  // Testimonial Submission Modal
  public isSubmitModalOpen = signal<boolean>(false);
  public isSubmitting = signal<boolean>(false);
  public submitSuccess = signal<boolean>(false);
  public submitError = signal<string | null>(null);
  public testimonialForm = {
    name: '',
    designation: '',
    rating: 5,
    content: '',
    role: 'user' as 'user' | 'vendor',
  };

  // Metrics
  public averageRating = signal<number>(4.9);
  public totalReviewsCount = signal<number>(148);
  public verifiedStaysPercent = signal<number>(100);

  // Curated Experiences
  public curatedExperiences: CuratedExperience[] = [
    {
      id: 'tea-plucking',
      title: 'First Flush Tea Plucking & Hearth Rolling',
      subtitle: 'Wake at 5:30 AM with the estate pluckers',
      region: 'Darjeeling & Kurseong Hills',
      duration: 'Morning (3–4 hrs)',
      season: 'March to November',
      description:
        'Walk through dew-soaked tea bushes with 3rd-generation growers. Learn to pinch the two leaves and a bud, then fire-wilt them over a clay stove before steeping the freshest cup of your life.',
      hostQuote: 'The mountain mist trapped in the tea bush before sunrise is what gives Darjeeling Muscatel its honey note.',
      hostName: 'Yangchen Gurung, Makaibari Ridge',
      tag: 'Tea & Agriculture',
      image: '/images/exp-tea.webp',
      rating: 5.0,
    },
    {
      id: 'monastery-dawn',
      title: 'Monastic Dawn Chants & Butter Lamp Lighting',
      subtitle: 'Enter centuries-old gompas before tourists arrive',
      region: 'Rumtek & Pelling, Sikkim',
      duration: 'Dawn (2 hrs)',
      season: 'Year Round',
      description:
        'Follow your village host up the stone ridge to the local monastery as monks blow ceremonial conch horns. Sit quietly on wool rugs, offer butter lamps, and share hot yak-butter tea.',
      hostQuote: 'When the low horn echoes across the valley at 5 AM, the mind simply stills itself without trying.',
      hostName: 'Tenzing Norbu, Rumtek Host',
      tag: 'Spiritual & Heritage',
      image: '/images/exp-monastery.webp',
      rating: 4.9,
    },
    {
      id: 'foraging-cooking',
      title: 'Wild Fiddlehead Fern & Nettle Soup Foraging',
      subtitle: 'From forest floor to the family woodstove',
      region: 'Kalimpong & Lava Ridges',
      duration: 'Afternoon (3 hrs)',
      season: 'Monsoon & Autumn',
      description:
        'Trek with host grandmothers into damp oak woods to harvest wild ningro (fiddleheads), sisnu (himalayan nettle), and chhurpi cheese. Cook an organic feast over an open clay hearth.',
      hostQuote: 'We do not go to the grocery store when the cloud brings rain — the hillside gives us everything fresh.',
      hostName: 'Maya Lepcha, Lava Homestay',
      tag: 'Culinary & Foraging',
      image: '/images/exp-cuisine.webp',
      rating: 5.0,
    },
    {
      id: 'alpine-ridge',
      title: 'Kanchenjunga Sunrise Ridge Walk',
      subtitle: 'Witness golden alpine glow from quiet village trails',
      region: 'Tinchuley & Rinchenpong',
      duration: 'Early Morning (2.5 hrs)',
      season: 'October to May',
      description:
        'Steep ascents through pine needles leading to hidden viewpoints with unobstructed views of Mt. Kanchenjunga turning crimson, rose, and gold against prayer flags flutter.',
      hostQuote: 'The mountain shows her face to those who wake before the birds. We carry a flask of cardamom tea.',
      hostName: 'Sonam & Dawa, Tinchuley Ridge',
      tag: 'Ridge Trekking',
      image: '/images/exp-ridge.webp',
      rating: 4.9,
    },
  ];

  // Observers and canvas
  private revealObserver?: IntersectionObserver;
  private canvasCleanupFn?: () => void;
  private reduceMotion = false;

  // Computed Filtered Testimonials
  public filteredTestimonials = computed(() => {
    let list = this.testimonials();
    const filter = this.selectedFilter();
    const query = this.searchQuery().toLowerCase().trim();
    const rating = this.selectedRatingFilter();

    if (filter === 'guest') {
      list = list.filter((t) => t.user_role !== 'vendor');
    } else if (filter === 'host') {
      list = list.filter((t) => t.user_role === 'vendor');
    } else if (filter === 'top_rated') {
      list = list.filter((t) => (t.rating || 5) >= 5);
    }

    if (rating !== null) {
      list = list.filter((t) => (t.rating || 5) === rating);
    }

    if (query) {
      list = list.filter((t) =>
        t.name?.toLowerCase().includes(query) ||
        t.content?.toLowerCase().includes(query) ||
        t.designation?.toLowerCase().includes(query)
      );
    }

    return list;
  });

  public getTestimonialAvatarUrl(t: TestimonialData): string | null {
    const raw = t.avatar_url || (t as any).user?.is_profile_image_url;
    if (!raw) return null;
    return raw.startsWith('http') ? raw : (this.assetUrl + raw);
  }

  ngOnInit(): void {
    this.seoService.updateSeo({
      title: 'Himalayan Experiences & Village Trails | Tashihomes',
      description:
        'Immerse yourself in authentic Himalayan village life: tea garden plucking, monastery walks, local cooking, and guided forest trails.',
      canonical: '/experiences',
      type: 'website',
      structuredData: this.seoService.generateExperiencesPageSchema(this.curatedExperiences, [
        { name: 'Home', url: '/' },
        { name: 'Experiences', url: '/experiences' }
      ])
    });

    if (isPlatformBrowser(this.platformId)) {
      window.scrollTo({ top: 0, behavior: 'auto' });
      this.loadAllData();
    }
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.initRevealObserver();

      if (!this.reduceMotion) {
        this.zone.runOutsideAngular(() => {
          this.canvasCleanupFn = this.initHeroMistCanvas('#experiencesCanvas');
        });
      }
    }
  }

  ngOnDestroy(): void {
    this.seoService.removeStructuredData();
    this.revealObserver?.disconnect();
    this.canvasCleanupFn?.();
  }

  private loadAllData(): void {
    this.loadTestimonials();
    this.loadFeaturedProperties();
    this.loadFeaturedCities();
    this.loadPublicStats();
  }

  public setFilter(filter: ExperienceFilter): void {
    this.selectedFilter.set(filter);
    setTimeout(() => this.refreshRevealObserver(), 50);
  }

  public setRatingFilter(rating: number | null): void {
    this.selectedRatingFilter.set(rating);
    setTimeout(() => this.refreshRevealObserver(), 50);
  }

  public resetFilters(): void {
    this.selectedFilter.set('all');
    this.selectedRatingFilter.set(null);
    this.searchQuery.set('');
    setTimeout(() => this.refreshRevealObserver(), 50);
  }

  // Load Testimonials
  public loadTestimonials(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.testimonials.set([]);
      this.loadingTestimonials.set(false);
      return;
    }

    this.loadingTestimonials.set(true);

    this.testimonialService.public
      .getTestimonials({ is_featured: true, page_size: 20 })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        timeout({ first: 6000 }),
        retry(1),
        catchError((err) => {
          console.warn('Could not load testimonials from API:', err);
          return of({ data: [], status: 200, message: '' });
        })
      )
      .subscribe((res: any) => {
        this.loadingTestimonials.set(false);
        let list: TestimonialData[] = [];
        if (Array.isArray(res?.data)) {
          list = res.data;
        } else if (res?.data && Array.isArray((res.data as any).data)) {
          list = (res.data as any).data;
        } else if (Array.isArray(res)) {
          list = res;
        }
        this.testimonials.set(list);

        // Compute average rating from dynamic data
        if (list.length > 0) {
          const totalStars = list.reduce((sum, item) => sum + (item.rating || 5), 0);
          const avg = Math.round((totalStars / list.length) * 10) / 10;
          this.averageRating.set(avg);
        }

        this.cdr.markForCheck();
        this.refreshRevealObserver();
      });
  }

  // Load Featured Properties
  public loadFeaturedProperties(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.loadingProperties.set(true);

    const query: PropertyQuery = {
      page: 1,
      size: 3,
      search: { is_featured: true },
    };

    this.propertyService.public
      .getProperties(query)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        timeout({ first: 8000 }),
        retry(2),
        catchError((err) => {
          console.warn('Could not load featured properties for experiences:', err);
          return of({ data: [], total: 0, page: 1, size: 3 });
        })
      )
      .subscribe((res) => {
        this.loadingProperties.set(false);
        this.properties.set(res?.data || []);
        this.cdr.markForCheck();
        this.refreshRevealObserver();
      });
  }

  // Load Featured Cities
  public loadFeaturedCities(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.loadingCities.set(true);

    const cityQuery: CityQuery = {
      search: { is_featured: true },
      page: 1,
      size: 8,
    };

    this.cityService.public
      .getCities(cityQuery)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        timeout({ first: 8000 }),
        retry(2),
        catchError((err) => {
          console.warn('Could not load public cities for experiences:', err);
          return of({ data: [], total: 0, page: 1, size: 8 });
        })
      )
      .subscribe((res) => {
        this.loadingCities.set(false);
        this.cities.set(res?.data || []);
        this.cdr.markForCheck();
        this.refreshRevealObserver();
      });
  }

  // Load Public Stats
  private loadPublicStats(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.dashboardService
      .getPublicStats()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        timeout({ first: 6000 }),
        catchError(() => of(null))
      )
      .subscribe((res) => {
        if (res?.data?.stats) {
          const ratingStat = res.data.stats.find((s) => s.key === 'rating');
          if (ratingStat && ratingStat.target) {
            this.averageRating.set(ratingStat.target);
          }
          const verifiedStat = res.data.stats.find((s) => s.key === 'verified');
          if (verifiedStat && verifiedStat.target) {
            this.verifiedStaysPercent.set(verifiedStat.target);
          }
        }
      });
  }

  // Navigation Helper
  public exploreRegion(cityId?: string): void {
    if (cityId) {
      this.router.navigate(['/search'], { queryParams: { city_id: cityId } });
    } else {
      this.router.navigate(['/search']);
    }
  }

  // Testimonial Modal Handlers
  public openSubmitModal(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/experiences#stories' } });
      return;
    }

    const user = this.authService.authUser() || this.authService.getUser();
    this.testimonialForm = {
      name: user?.full_name || '',
      designation: user?.role === 'vendor' ? 'Homestay Host in the Hills' : 'Himalayan Traveler',
      rating: 5,
      content: '',
      role: user?.role === 'vendor' ? 'vendor' : 'user',
    };
    this.submitSuccess.set(false);
    this.submitError.set(null);
    this.isSubmitModalOpen.set(true);
  }

  public closeSubmitModal(): void {
    this.isSubmitModalOpen.set(false);
  }

  public setModalRating(stars: number): void {
    this.testimonialForm.rating = stars;
  }

  public onSubmitModalForm(): void {
    if (!this.testimonialForm.content.trim()) {
      this.submitError.set('Please write about your stay, mountains, food, or host experience.');
      return;
    }

    this.isSubmitting.set(true);
    this.submitError.set(null);

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
        this.isSubmitting.set(false);
        this.submitSuccess.set(true);
        setTimeout(() => {
          this.closeSubmitModal();
          this.loadTestimonials();
        }, 2200);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const msg = this.testimonialService.extractApiErrorMessage(err) || 'Failed to submit experience. Please try again.';
        this.submitError.set(msg);
      },
    });
  }

  // Intersection Observer for animations
  private refreshRevealObserver(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    setTimeout(() => {
      requestAnimationFrame(() => this.initRevealObserver());
    }, 50);
  }

  private initRevealObserver(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const revealEls: NodeListOf<HTMLElement> = this.el.nativeElement.querySelectorAll('.reveal');
    if (!revealEls.length) return;

    if (!('IntersectionObserver' in window)) {
      revealEls.forEach((el) => el.classList.add('in', 'is-visible'));
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

  // Hero Atmospheric Mist & Pollen Canvas
  private initHeroMistCanvas(selector: string): () => void {
    const canvas = this.el.nativeElement.querySelector(selector) as HTMLCanvasElement | null;
    if (!canvas) return () => {};

    const ctx = canvas.getContext('2d');
    if (!ctx) return () => {};

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let raf = 0;
    const start = performance.now();

    let blobs: Array<{
      x: number;
      y: number;
      r: number;
      speed: number;
      bob: number;
      bobSpeed: number;
      phase: number;
      opacity: number;
    }> = [];

    let motes: Array<{
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
      const layerCount = 5;
      for (let i = 0; i < layerCount; i++) {
        blobs.push({
          x: Math.random() * w,
          y: h * (0.25 + Math.random() * 0.5),
          r: 160 + Math.random() * 240,
          speed: 7 + Math.random() * 12,
          bob: 12 + Math.random() * 20,
          bobSpeed: 0.18 + Math.random() * 0.22,
          phase: Math.random() * Math.PI * 2,
          opacity: 0.04 + Math.random() * 0.05,
        });
      }

      motes = [];
      const count = Math.min(Math.floor(w / 30), 45);
      for (let i = 0; i < count; i++) {
        motes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          size: 0.8 + Math.random() * 2.2,
          speedY: 0.15 + Math.random() * 0.35,
          speedX: (Math.random() - 0.5) * 0.25,
          opacity: 0.25 + Math.random() * 0.6,
          pulseSpeed: 1 + Math.random() * 2,
          phase: Math.random() * Math.PI * 2,
          color: Math.random() > 0.4 ? '250, 165, 45' : '143, 199, 212',
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

      for (const b of blobs) {
        const bx = ((b.x + t * b.speed) % (w + b.r * 2)) - b.r;
        const by = b.y + Math.sin(t * b.bobSpeed + b.phase) * b.bob;

        const grad = ctx.createRadialGradient(bx, by, 0, bx, by, b.r);
        grad.addColorStop(0, `rgba(243, 250, 251, ${b.opacity})`);
        grad.addColorStop(0.6, `rgba(243, 250, 251, ${b.opacity * 0.35})`);
        grad.addColorStop(1, 'rgba(243, 250, 251, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(bx, by, b.r, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const m of motes) {
        m.y -= m.speedY;
        m.x += m.speedX;
        if (m.y < -10) m.y = h + 10;
        if (m.x < -10) m.x = w + 10;
        if (m.x > w + 10) m.x = -10;

        const currentOpacity = m.opacity * (0.6 + 0.4 * Math.sin(t * m.pulseSpeed + m.phase));
        ctx.fillStyle = `rgba(${m.color}, ${currentOpacity})`;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
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

