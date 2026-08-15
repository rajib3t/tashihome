import { Component, ElementRef, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { PropertyService } from '../../../../services/property/property-service';
import { PropertyAsset, PropertyData } from '../../../../services/property/property.model';


@Component({
  selector: 'app-property',
  imports: [DecimalPipe],
  templateUrl: './property.html',
  styleUrl: './property.css',
})
export class Property {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly el = inject(ElementRef);
  private readonly platformId = inject(PLATFORM_ID);
  public propertyService = inject(PropertyService);
  public propertyData = signal<Partial<PropertyData> | null>(null);
  public galleryImages = signal<PropertyAsset[]>([]);
  private revealObserver?: IntersectionObserver;

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (slug) {
      this.propertyService.getPublicPropertyBySlug(slug).subscribe({
        next: (res) => {
          this.propertyData.set(res.data);
          this.galleryImages.set(this.buildGalleryImages(res.data));
          // Re-scan after data loads so dynamically rendered .reveal els are observed
          setTimeout(() => this.initRevealObserver(), 0);
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
    this.revealObserver?.disconnect();
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
