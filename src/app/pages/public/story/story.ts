import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ElementRef,
  Inject,
  PLATFORM_ID,
  NgZone,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

interface RegionStory {
  name: string;
  tag: string;
  tagline: string;
  description: string;
  elevation: string;
  highlights: string[];
  gradient: string;
  badgeColor: string;
}

@Component({
  selector: 'app-story',
  imports: [CommonModule, RouterLink],
  templateUrl: './story.html',
  styleUrl: './story.css',
})
export class Story implements OnInit, AfterViewInit, OnDestroy {
  public readonly router = inject(Router);
  private readonly el = inject(ElementRef);
  private readonly zone = inject(NgZone);
  @Inject(PLATFORM_ID) private platformId = inject(PLATFORM_ID);

  private revealObserver?: IntersectionObserver;
  private canvasCleanup?: () => void;
  private reduceMotion = false;

  // Active region tab
  public activeRegionIndex = signal<number>(0);

  public regions: RegionStory[] = [
    {
      name: 'Darjeeling',
      tag: 'Queen of the Hills',
      tagline: 'Misty tea estates & Kangchenjunga dawns',
      description:
        'Wake up to vintage steam whistles, panoramic vistas of Mount Kangchenjunga, and century-old tea gardens. Homestays here are run by multi-generational local families offering warm fireplaces and garden-fresh morning flushes.',
      elevation: '6,700 ft',
      highlights: ['Tea garden family cottages', 'Views of Kangchenjunga', 'Home-cooked Gorkha cuisine'],
      gradient: 'from-[#0C4550]/90 to-[#126A7A]/80',
      badgeColor: 'bg-ochre/20 text-ochre border-ochre/30',
    },
    {
      name: 'Kalimpong',
      tag: 'Ridge of Orchids & Monasteries',
      tagline: 'Quiet pine forests & gentle valleys',
      description:
        'A quieter, slower pace perched along the Teesta valley. Kalimpong’s homestays are known for sprawling organic nursery gardens, fresh artisan cheese, and views stretching across Sikkim into Bhutan.',
      elevation: '4,100 ft',
      highlights: ['Flower nursery farmstays', 'Artisan Kalimpong cheese & sourdough', 'Monastery ridge walks'],
      gradient: 'from-[#0F5461]/90 to-[#347E92]/80',
      badgeColor: 'bg-moss/20 text-moss border-moss/30',
    },
    {
      name: 'Kurseong',
      tag: 'Land of White Orchids',
      tagline: 'Pine-scented clouds & heritage plantations',
      description:
        'Tucked along rolling tea slopes and cedar groves, Kurseong offers peaceful hillside retreats far from the tourist rush. Stay with planters and local families who know every secret forest trail.',
      elevation: '4,860 ft',
      highlights: ['Centuries-old tea trails', 'Quiet mountain forest walks', 'Traditional wood-fired dinners'],
      gradient: 'from-[#1B2A2C]/90 to-[#0C4550]/80',
      badgeColor: 'bg-ochre/20 text-ochre border-ochre/30',
    },
    {
      name: 'Mirik',
      tag: 'Orchard Valley & Lake',
      tagline: 'Cardamom groves & tranquil waters',
      description:
        'Framed by Sumendu Lake and fragrant orange orchards, Mirik offers tranquil valleys and cardamom plantations. Homestay families share home-ground spices, orchard walks, and serene lake-view mornings.',
      elevation: '4,900 ft',
      highlights: ['Lakeside & orchard stays', 'Cardamom & orange harvest walks', 'Stargazing mountain terraces'],
      gradient: 'from-[#126A7A]/90 to-[#479FB5]/80',
      badgeColor: 'bg-moss/20 text-moss border-moss/30',
    },
    {
      name: 'The Dooars',
      tag: 'Wild Foothills & Tea Corridors',
      tagline: 'Where the Himalayan foothills meet lush forests',
      description:
        'The verdant gateway to the Eastern Himalaya, where emerald tea estates meet tropical wildlife sanctuaries. Experience eco-cottages on tea borders and village stays hosted by indigenous forest communities.',
      elevation: '300 - 1,200 ft',
      highlights: ['Tea border eco-cottages', 'Wildlife sanctuary trailheads', 'Indigenous cultural evenings'],
      gradient: 'from-[#0C4550]/90 to-[#0F5461]/80',
      badgeColor: 'bg-ochre/20 text-ochre border-ochre/30',
    },
  ];

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

