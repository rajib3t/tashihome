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
  ChangeDetectorRef,
  DestroyRef,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { CityService } from '../../../services/city/city-service';
import { City, CityQuery } from '../../../services/city/city-model';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-story',
  imports: [CommonModule, RouterLink],
  templateUrl: './story.html',
  styleUrl: './story.css',
})
export class Story implements OnInit, AfterViewInit, OnDestroy {
  public readonly assetUrl = environment.assetUrl;
  public readonly router = inject(Router);
  public readonly cityService = inject(CityService);
  private readonly el = inject(ElementRef);
  private readonly zone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);

  public cities = signal<City[]>([]);
  public activeRegionIndex = signal<number>(0);

  private revealObserver?: IntersectionObserver;
  private canvasCleanup?: () => void;
  private reduceMotion = false;

  public pillars = [
    {
      number: '01',
      title: '100% In-Person Verified',
      subtitle: 'Real homes, real photos, no guesswork',
      description:
        'Every listing on Tashihomes is personally visited and vetted by our team. What you see in photos is exactly what greets you when you step through the doorway.',
      icon: 'verified',
    },
    {
      number: '02',
      title: 'Fair Terms for Host Families',
      subtitle: 'Empowering generational hospitality',
      description:
        'We believe in dignity and fair earnings. We onboard local families as true founding partners, preserving traditional hospitality without punishing commissions.',
      icon: 'heart',
    },
    {
      number: '03',
      title: 'Guaranteed, Trustworthy Bookings',
      subtitle: 'No last-minute ghosting or DM confusion',
      description:
        'Say goodbye to fragile word-of-mouth arrangements. Locked-in calendar availability, verified payments, and clear communication give both guests and hosts complete peace of mind.',
      icon: 'shield',
    },
    {
      number: '04',
      title: 'Authentic North Bengal Living',
      subtitle: 'Rooted in local culture & flavors',
      description:
        'From steaming bowls of homemade thukpa to conversations around the kitchen fire, our platform exists to connect travelers with the true heart of the hills.',
      icon: 'mountain',
    },
  ];

  public comparisonRows = [
    {
      aspect: 'Finding a Homestay',
      oldWay: 'Chasing phone numbers from friends or random Instagram DMs',
      tashiWay: 'Curated, structured directory covering all major North Bengal hill circuits',
    },
    {
      aspect: 'Photos & Listing Verification',
      oldWay: 'Unverified snapshots, no assurance of what you will actually get',
      tashiWay: '100% verified listings with real, authentic photography taken on site',
    },
    {
      aspect: 'Booking Process',
      oldWay: 'Days of back-and-forth messaging, vague confirmations prone to cancellations',
      tashiWay: 'Seamless booking, transparent dates, and secure deposit protection',
    },
    {
      aspect: 'For Host Families',
      oldWay: 'Completely dependent on repeat word-of-mouth with zero digital presence',
      tashiWay: 'Dedicated platform, equal visibility, fair terms, and founding partner status',
    },
  ];

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
    this.loadCities();
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.initRevealObserver();

      this.zone.runOutsideAngular(() => {
        this.canvasCleanup = this.initHeroMistCanvas('#storyMistCanvas');
      });
    }
  }

  ngOnDestroy(): void {
    this.revealObserver?.disconnect();
    this.canvasCleanup?.();
  }

  selectRegion(index: number): void {
    this.activeRegionIndex.set(index);
  }

  private loadCities(): void {
    const cityQuery: CityQuery = {
      search: {
        is_featured: true,
      },
      page: 1,
      size: 10,
    };

    this.cityService.public
      .getCities(cityQuery)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((error) => {
          console.warn('Could not load public featured cities for story page:', error);
          return of({ data: [], total: 0, page: 1, size: 10 });
        })
      )
      .subscribe((response) => {
        const data = response?.data || [];
        this.cities.set(data);
        this.cdr.markForCheck();
        this.refreshRevealObserver();
      });
  }

  private refreshRevealObserver(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    queueMicrotask(() => this.initRevealObserver());
  }

  private initRevealObserver(): void {
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
      { threshold: 0.12 }
    );
    revealEls.forEach((el: Element) => this.revealObserver?.observe(el));
  }

  private initHeroMistCanvas(selector: string): () => void {
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

    let stars: Array<{
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
          y: h * (0.2 + Math.random() * 0.6),
          r: 180 + Math.random() * 260,
          speed: 6 + Math.random() * 10,
          bob: 12 + Math.random() * 18,
          bobSpeed: 0.15 + Math.random() * 0.25,
          phase: Math.random() * Math.PI * 2,
          opacity: 0.04 + Math.random() * 0.05,
        });
      }

      stars = [];
      const count = Math.min(Math.floor(w / 35), 40);
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          size: 0.8 + Math.random() * 2,
          speedY: 0.1 + Math.random() * 0.3,
          speedX: (Math.random() - 0.5) * 0.2,
          opacity: 0.2 + Math.random() * 0.6,
          pulseSpeed: 1 + Math.random() * 2.2,
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

      for (const s of stars) {
        s.y -= s.speedY;
        s.x += s.speedX;
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
