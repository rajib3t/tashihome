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
  inject,
  signal,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Logo } from '../../../shared/components/common/logo/logo';
import { PropertyService } from '../../../services/property/property-service';
import { PropertyData, PropertyQuery, PropertySearch } from '../../../services/property/property.model';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
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
  private revealObserver?: IntersectionObserver;
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

  private loadProperties(): void {
    const search: PropertySearch = {
      is_featured: true,
    };

    const query: PropertyQuery = {
      page: 1,
      size: 6,
      search,
    };

    this.propertyService.getPublicProperties(query).subscribe((response) => {
      this.properties.set(response.data || []);
      this.cdr.markForCheck();
      this.refreshRevealObserver();
    });
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.initRevealObserver();
      this.initStatsObserver();
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
    this.revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
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

  ngOnDestroy(): void {
    this.revealObserver?.disconnect();
  }
}
