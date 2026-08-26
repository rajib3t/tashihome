import { Component, DestroyRef, ElementRef, inject, PLATFORM_ID, signal, HostListener } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { isPlatformBrowser } from '@angular/common';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { PropertyService } from '../../../../services/property/property-service';
import { PropertyAsset, PropertyData } from '../../../../services/property/property.model';
import { environment } from '../../../../../environments/environment';


@Component({
  selector: 'app-property',
  imports: [DecimalPipe],
  templateUrl: './property.html',
  styleUrl: './property.css',
})
export class Property {
  public readonly assetUrl = environment.assetUrl;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly el = inject(ElementRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  public propertyService = inject(PropertyService);
  public propertyData = signal<Partial<PropertyData> | null>(null);
  public galleryImages = signal<PropertyAsset[]>([]);
  
  // Lightbox State
  public isLightboxOpen = signal<boolean>(false);
  public activePhotoIndex = signal<number>(0);

  private revealObserver?: IntersectionObserver;
  private revealInitTimer?: ReturnType<typeof setTimeout>;

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    if (!this.isLightboxOpen()) return;

    if (event.key === 'Escape') {
      this.closeLightbox();
    } else if (event.key === 'ArrowRight') {
      this.nextPhoto();
    } else if (event.key === 'ArrowLeft') {
      this.prevPhoto();
    }
  }

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (slug) {
      this.propertyService.getPublicPropertyBySlug(slug).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (res) => {
          this.propertyData.set(res.data);
          this.galleryImages.set(this.buildGalleryImages(res.data));
          // Re-scan after data loads so dynamically rendered .reveal els are observed
          this.revealInitTimer = setTimeout(() => {
            this.revealInitTimer = undefined;
            this.initRevealObserver();
          }, 0);
        },
        error: (error) => {
          console.error('Error fetching property:', error);
          this.router.navigate(['/']);
        },
      });
    } else {
      this.router.navigate(['/']);
    }
  }

  ngAfterViewInit(): void {
    this.initRevealObserver();
  }

  ngOnDestroy(): void {
    if (this.revealInitTimer !== undefined) {
      clearTimeout(this.revealInitTimer);
    }
    this.revealObserver?.disconnect();
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = '';
    }
  }

  public openLightbox(index: number = 0): void {
    if (!this.galleryImages().length) return;
    const safeIndex = Math.max(0, Math.min(index, this.galleryImages().length - 1));
    this.activePhotoIndex.set(safeIndex);
    this.isLightboxOpen.set(true);

    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = 'hidden';
    }
  }

  public closeLightbox(): void {
    this.isLightboxOpen.set(false);
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = '';
    }
  }

  public nextPhoto(): void {
    const total = this.galleryImages().length;
    if (total === 0) return;
    this.activePhotoIndex.update((i) => (i + 1) % total);
  }

  public prevPhoto(): void {
    const total = this.galleryImages().length;
    if (total === 0) return;
    this.activePhotoIndex.update((i) => (i - 1 + total) % total);
  }

  public selectPhoto(index: number): void {
    const total = this.galleryImages().length;
    if (index >= 0 && index < total) {
      this.activePhotoIndex.set(index);
    }
  }

  private initRevealObserver(): void {
    if (!isPlatformBrowser(this.platformId)) return;
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
      { threshold: 0.1 }
    );
    revealEls.forEach((el: Element) => this.revealObserver?.observe(el));
  }

  private buildGalleryImages(data: Partial<PropertyData> | null | undefined): PropertyAsset[] {
    if (!data) return [];

    const assets = [
      ...(data.cover_image ? [data.cover_image] : []),
      ...(data.feature_image ? [data.feature_image] : []),
      ...(data.gallery_images ?? []),
      ...(data.property_assets ?? []),
    ];

    const unique = new Map<string, PropertyAsset>();
    for (const asset of assets) {
      if (asset?.file_url && !unique.has(asset.file_url)) {
        unique.set(asset.file_url, asset);
      }
    }

    return [...unique.values()];
  }
}
