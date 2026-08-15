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
import { NavigationEnd, Router } from '@angular/router';
import { filter, catchError, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

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

  // cleanup handles for canvases / card tilt / parallax effects
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
  ) {}

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
        this.mistCleanupFns.push(this.initHeroCanvas('#mistCanvas'));
        this.mistCleanupFns.push(this.initExpCanvas('#expCanvas'));
        this.mistCleanupFns.push(this.initConstellationCanvas('#constellationCanvas'));
        this.mistCleanupFns.push(this.initFooterCanvas('#mistCanvasFooter'));
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
  // 1. HERO CANVAS: Layered drifting mist + shimmering stardust
  // with interactive cursor ambient swirl
  // ============================================================
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
  // 2. EXPERIENCES CANVAS: Gentle floating morning pollen / breeze
  // spores across the misty tea hills background
  // ============================================================
  private initExpCanvas(selector: string): () => void {
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
    if (this.reduceMotion) return () => {};

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
    if (this.reduceMotion) return () => {};

    const target = this.el.nativeElement.querySelector(selector) as HTMLElement | null;
    if (!target) return () => {};

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