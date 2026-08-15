import { Component, inject, signal } from '@angular/core';
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
  public propertyService = inject(PropertyService);
  public propertyData = signal<Partial<PropertyData> | null>(null);
  public galleryImages = signal<PropertyAsset[]>([]);
  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (slug) {
      this.propertyService.getPublicPropertyBySlug(slug).subscribe({
        next: (res) => {
          console.log('Property:', res);
          this.propertyData.set(res.data);
          this.galleryImages.set(this.buildGalleryImages(res.data));
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
