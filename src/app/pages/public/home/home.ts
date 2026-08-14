import {
  Component,
  OnInit,
  AfterViewInit,
  ElementRef,
  Inject,
  PLATFORM_ID,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Logo } from '../../../shared/components/common/logo/logo';

export interface HomestayListing {
  id: string;
  region: 'tea' | 'root' | 'monastery' | 'terrace' | 'desert';
  name: string;
  location: string;
  rating: number;
  tags: string[];
  price: number;
  gradientBg: string;
  vectorType: 'tea' | 'root' | 'monastery' | 'terrace' | 'desert' | 'pine';
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
  imports: [CommonModule, FormsModule, Logo],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit, AfterViewInit {
  activeFilter: string = 'all';
  newsletterEmail: string = '';
  newsletterSubmitted: boolean = false;

  stats: StatItem[] = [
    { target: 61, current: 0, label: 'homes on the register' },
    { target: 7, current: 0, label: 'hill states, one circuit' },
    { target: 100, current: 0, suffix: '%', label: 'visited on foot by us first' },
    { target: 4.9, current: 0, decimals: 1, label: 'average guest rating' },
  ];

  listings: HomestayListing[] = [
    {
      id: '1',
      region: 'tea',
      name: 'Fern Ridge Cottage',
      location: 'Takdah, Darjeeling hills',
      rating: 4.9,
      tags: ['Wood-fired bath', 'Tea garden view'],
      price: 2400,
      gradientBg: 'linear-gradient(160deg,#3E4E37,#55694A 55%,#8AA07D)',
      vectorType: 'tea',
    },
    {
      id: '2',
      region: 'root',
      name: 'Nongriat Bridgehouse',
      location: 'Nongriat, Meghalaya',
      rating: 4.8,
      tags: ['Waterfall walk', 'Khasi meals'],
      price: 1900,
      gradientBg: 'linear-gradient(160deg,#2E4A3E,#4E7561 55%,#8FB39E)',
      vectorType: 'root',
    },
    {
      id: '3',
      region: 'monastery',
      name: 'Rumtek Prayer House',
      location: 'Rumtek, Sikkim',
      rating: 5.0,
      tags: ['Monastery bells', 'Butter tea'],
      price: 2100,
      gradientBg: 'linear-gradient(160deg,#0F5461,#347E92 55%,#9DAEBB)',
      vectorType: 'monastery',
    },
    {
      id: '4',
      region: 'terrace',
      name: 'Ziro Paddy House',
      location: 'Ziro Valley, Arunachal Pradesh',
      rating: 4.9,
      tags: ['Rice beer tasting', 'Apatani weaving'],
      price: 1700,
      gradientBg: 'linear-gradient(160deg,#4B5B33,#6E8248 55%,#A9BC7C)',
      vectorType: 'terrace',
    },
    {
      id: '5',
      region: 'desert',
      name: 'Komic Stone House',
      location: 'Komic, Spiti Valley',
      rating: 4.7,
      tags: ['Highest village road', 'Star-gazing roof'],
      price: 1500,
      gradientBg: 'linear-gradient(160deg,#6B5A45,#9A8265 55%,#CBB89A)',
      vectorType: 'desert',
    },
    {
      id: '6',
      region: 'tea',
      name: 'Lava Pine House',
      location: 'Lava, Kalimpong hills',
      rating: 4.8,
      tags: ['Cloud forest trail', 'Wood stove'],
      price: 2000,
      gradientBg: 'linear-gradient(160deg,#405B4E,#5F8571 55%,#9BBFAA)',
      vectorType: 'pine',
    },
  ];

  filterOptions = [
    { key: 'all', label: 'All regions' },
    { key: 'tea', label: 'Tea hills' },
    { key: 'root', label: 'Living root bridges' },
    { key: 'monastery', label: 'Monastery valleys' },
    { key: 'terrace', label: 'Rice terraces' },
    { key: 'desert', label: 'Cold desert' },
  ];

  constructor(
    private el: ElementRef,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.initRevealObserver();
      this.initStatsObserver();
    }
  }

  get filteredListings(): HomestayListing[] {
    if (this.activeFilter === 'all') {
      return this.listings;
    }
    return this.listings.filter((item) => item.region === this.activeFilter);
  }

  setFilter(filterKey: string): void {
    this.activeFilter = filterKey;
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
    const revealEls = this.el.nativeElement.querySelectorAll('.reveal');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    revealEls.forEach((el: Element) => observer.observe(el));
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
}
