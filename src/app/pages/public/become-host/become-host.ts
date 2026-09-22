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
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { HostService } from '../../../services/host/host-service';
import { BecomeHostRequest } from '../../../services/host/host.model';
import { CityService } from '../../../services/city/city-service';
import { City, CityQuery } from '../../../services/city/city-model';
import { PROPERTY_TYPES, PROPERTY_TYPES_LABELS } from '../../../services/property/property.model';
import { SeoService } from '../../../services/seo/seo-service';

@Component({
  selector: 'app-become-host',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './become-host.html',
  styleUrl: './become-host.css',
})
export class BecomeHost implements OnInit, AfterViewInit, OnDestroy {
  private readonly hostService = inject(HostService);
  private readonly cityService = inject(CityService);
  private readonly seoService = inject(SeoService);
  private readonly fb = inject(FormBuilder);
  private readonly el = inject(ElementRef);
  private readonly zone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);

  public readonly propertyTypes = PROPERTY_TYPES;
  public readonly propertyTypeLabels = PROPERTY_TYPES_LABELS;

  public popularCities: string[] = [
    'Darjeeling',
    'Kalimpong',
    'Kurseong',
    'Mirik',
    'Gangtok',
    'Pelling',
    'Ravangla',
    'Yuksom',
    'Lachung',
    'Lachen',
    'Sittong',
    'Tinchuley',
    'Lamahatta',
    'Chatakpur',
    'Lava',
    'Rishyap',
    'Pedong',
    'Dooars',
  ];

  public activeFaqIndex = signal<number | null>(0);
  public isSubmitting = signal<boolean>(false);
  public errorMessage = signal<string>('');
  public isSuccess = signal<boolean>(false);
  public submittedData = signal<BecomeHostRequest | null>(null);

  public citiesList = signal<string[]>(this.popularCities);

  public hostForm = this.fb.group({
    full_name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^[0-9+()\- ]{7,20}$/)]],
    company_name: [''],
    property_name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    property_type: ['home_stay', [Validators.required]],
    city: ['', [Validators.required]],
    address: ['', [Validators.required, Validators.minLength(5)]],
    expected_rooms: [2, [Validators.required, Validators.min(1), Validators.max(100)]],
    notes: [''],
    agree_terms: [false, [Validators.requiredTrue]],
  });

  private revealObserver?: IntersectionObserver;
  private canvasCleanup?: () => void;
  private reduceMotion = false;

  public benefits = [
    {
      number: '01',
      title: 'Zero Listing Fees',
      subtitle: 'COMPLETELY FREE TO LIST & SHOWCASE',
      description:
        'No onboarding costs, no membership fees, ever. You only pay 15% when a guest actually books and stays — nothing before, nothing hidden.',
      icon: 'sparkles',
    },
    {
      number: '02',
      title: 'Verified Listings',
      subtitle: 'EVERY HOME CHECKED, NOT JUST LISTED',
      description:
        'Before you go live, our team reviews your homestay details and photos to make sure your listing is honest, accurate, and guest-ready.',
      icon: 'camera',
    },
    {
      number: '03',
      title: 'Full Payment, Direct to You',
      subtitle: 'NO HIDDEN DEDUCTIONS, NO CHASING PAYMENTS',
      description:
        'Guests pay in full through Tashi\'s secure payment gateway at booking. You receive your payout directly, with clear terms and guaranteed cancellation protection — no cash handling, no confusion.',
      icon: 'wallet',
    },
    {
      number: '04',
      title: 'Thoughtful, Respectful Guests',
      subtitle: 'CONNECTING WITH CULTURAL TRAVELERS',
      description:
        'We attract conscious travelers looking for local, organic food, real conversations, and the everyday rhythm of mountain life — not a checklist of amenities.',
      icon: 'heart',
    },
  ];

  public steps = [
    {
      step: '01',
      title: 'Submit your property details',
      description: 'Fill out our quick 2-minute application with basic information about your home and spare rooms.',
    },
    {
      step: '02',
      title: 'In-person host visit & photography',
      description: 'Our regional coordinator stops by for tea, verifies amenities, and captures authentic photographs.',
    },
    {
      step: '03',
      title: 'Go live & welcome guests',
      description: 'Your homestay is published in our directory. Manage availability with total freedom and receive bookings.',
    },
  ];

  public faqs = [
    {
      question: 'What types of properties can be listed on Tashihomes?',
      answer:
        'We focus on authentic homestays, heritage cottages, farm stays, mountain cabins, and family-run guest houses located across North Bengal (Darjeeling, Kalimpong, Kurseong, Mirik, Dooars) and Sikkim.',
    },
    {
      question: 'Is there any fee to join or list my homestay?',
      answer:
        'No. Listing on Tashihomes is completely free. We do not charge onboarding charges, annual maintenance fees, or photography charges.',
    },
    {
      question: 'What happens after I submit this application?',
      answer:
        'Our regional coordinator will review your submission and contact you via phone/WhatsApp within 24 to 48 hours to introduce themselves, answer any questions, and schedule a convenient date for our verification visit.',
    },
    {
      question: 'Can I set my own room prices and house rules?',
      answer:
        'Yes, absolutely. You retain 100% control over your seasonal pricing, meal tariffs, check-in policies, and pet/family rules. We provide guidance based on regional traveler demand.',
    },
    {
      question: 'What if I only have 1 or 2 spare rooms?',
      answer:
        'That is perfect! In fact, most of our most-loved homestays have 1 to 3 rooms where guests experience genuine warm interactions with the host family.',
    },
    {
      question: 'Do you help if I am new to digital bookings?',
      answer:
        'Yes. Our team provides dedicated phone and WhatsApp support in English, Nepali, Hindi, and Bengali to help you update calendars and coordinate guest arrivals smoothly.',
    },
  ];

  public testimonials = [
    {
      quote:
        'Joining Tashihomes was the best decision for our family. The team visited our village in Takdah, took stunning photos, and we now receive guests who truly appreciate our home-cooked meals.',
      host: 'Pema & Dorjee Lepcha',
      location: 'Takdah Tea Estate, Darjeeling',
      rooms: '3 Rooms',
      initials: 'PL',
    },
    {
      quote:
        'No complicated tech. Direct payouts and clear guest communication. Guests come prepared for peaceful mountain living, not loud parties.',
      host: 'Bikram Thapa',
      location: 'Pedong, Kalimpong',
      rooms: '2 Rooms',
      initials: 'BT',
    },
    {
      quote:
        'They treated our home with immense respect. The direct host connection makes hosting rewarding and completely hassle-free.',
      host: 'Sonam Bhutia',
      location: 'Yuksom, West Sikkim',
      rooms: '4 Rooms',
      initials: 'SB',
    },
  ];

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
    this.seoService.updateSeo({
      title: 'List Your Homestay & Become a Host | Tashihomes',
      description: 'Partner with Tashihomes to list your homestay in Darjeeling, Kalimpong, Kurseong or Sikkim. Reach travelers worldwide with zero hassle and verified guest bookings.',
      canonical: '/become-a-host',
      type: 'website',
      structuredData: this.seoService.generateFaqSchema(this.faqs, [
        { name: 'Home', url: '/' },
        { name: 'Become a Host', url: '/become-a-host' }
      ])
    });
    this.loadFeaturedCities();
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.initRevealObserver();

      this.zone.runOutsideAngular(() => {
        this.canvasCleanup = this.initHeroMistCanvas('#becomeHostMistCanvas');
      });
    }
  }

  ngOnDestroy(): void {
    this.seoService.removeStructuredData();
    this.revealObserver?.disconnect();
    this.canvasCleanup?.();
  }

  public toggleFaq(index: number): void {
    this.activeFaqIndex.update((current) => (current === index ? null : index));
  }

  public selectCitySuggestion(city: string): void {
    this.hostForm.patchValue({ city });
    this.hostForm.get('city')?.markAsDirty();
  }

  public resetApplication(): void {
    this.isSuccess.set(false);
    this.submittedData.set(null);
    this.errorMessage.set('');
    this.hostForm.reset({
      full_name: '',
      email: '',
      phone: '',
      company_name: '',
      property_name: '',
      property_type: 'home_stay',
      city: '',
      address: '',
      expected_rooms: 2,
      notes: '',
      agree_terms: false,
    });
  }

  public onSubmit(): void {
    if (this.hostForm.invalid) {
      this.hostForm.markAllAsTouched();
      this.errorMessage.set('Please fill in all required fields accurately.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const formValue = this.hostForm.value;

    const payload: BecomeHostRequest = {
      full_name: (formValue.full_name || '').trim(),
      email: (formValue.email || '').trim().toLowerCase(),
      phone: (formValue.phone || '').trim(),
      company_name: (formValue.company_name || '').trim(),
      property_name: (formValue.property_name || '').trim(),
      property_type: formValue.property_type || 'home_stay',
      city: (formValue.city || '').trim(),
      address: (formValue.address || '').trim(),
      expected_rooms: Number(formValue.expected_rooms) || 1,
      notes: (formValue.notes || '').trim(),
    };

    this.hostService
      .becomeHost(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.isSubmitting.set(false);
          this.submittedData.set(payload);
          this.isSuccess.set(true);
          this.cdr.markForCheck();

          if (isPlatformBrowser(this.platformId)) {
            const formCard = document.getElementById('application-form-section');
            if (formCard) {
              formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }
        },
        error: (err) => {
          this.isSubmitting.set(false);
          const errorMsg =
            this.hostService.extractApiErrorMessage(err) ||
            'We could not submit your host application at this time. Please check your connection and try again.';
          this.errorMessage.set(errorMsg);
          this.cdr.markForCheck();
        },
      });
  }

  public isFieldInvalid(fieldName: string): boolean {
    const field = this.hostForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  private loadFeaturedCities(): void {
    const query: CityQuery = {
      page: 1,
      size: 30,
    };

    this.cityService.public
      .getCities(query)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => of({ data: [], total: 0, page: 1, size: 30 }))
      )
      .subscribe((res) => {
        const remoteCities = (res?.data || []).map((c: City) => c.name).filter(Boolean);
        if (remoteCities.length > 0) {
          const combined = Array.from(new Set([...remoteCities, ...this.popularCities]));
          this.citiesList.set(combined);
          this.cdr.markForCheck();
        }
      });
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
      { threshold: 0.1 }
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
          r: 160 + Math.random() * 240,
          speed: 5 + Math.random() * 9,
          bob: 10 + Math.random() * 16,
          bobSpeed: 0.15 + Math.random() * 0.25,
          phase: Math.random() * Math.PI * 2,
          opacity: 0.04 + Math.random() * 0.05,
        });
      }

      stars = [];
      const count = Math.min(Math.floor(w / 35), 45);
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

