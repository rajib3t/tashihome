import { Component, Input, inject, computed } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule, DecimalPipe } from '@angular/common';
import { PropertyData } from '../../../../services/property/property.model';
import { SettingsService } from '../../../../services/settings/settings-service';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-single-property',
  imports: [CommonModule, DecimalPipe],
  templateUrl: './single-property.html',
  styleUrl: './single-property.css',
})
export class SingleProperty {
  private readonly router = inject(Router);
  private readonly settingsService = inject(SettingsService);

  readonly assetUrl = environment.assetUrl;
  @Input() item: Partial<PropertyData> = {};

  public readonly currencySymbol = computed(() => {
    return this.settingsService.currencySymbol() || this.item.currency || '₹';
  });

  goToPropertyDetail(event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (this.item.slug) {
      this.router.navigate(['/stay', this.item.slug]);
    }
  }

  getFoodOptionTags(item: Partial<PropertyData>): string[] {
    if (!item.property_food_options || item.property_food_options.length === 0) {
      return [];
    }
    return item.property_food_options
      .filter(option => option.is_included)
      .map(option => option.name);
  }

  getEffectivePrice(item: Partial<PropertyData>): number {
    if (item.property_room_types && item.property_room_types.length > 0) {
      let minPrice = Infinity;
      for (const prt of item.property_room_types) {
        if (prt.pricing_tiers && prt.pricing_tiers.length > 0) {
          for (const tier of prt.pricing_tiers) {
            const effective = (tier.sale_per_night && tier.sale_per_night > 0 && tier.sale_per_night < tier.price_per_night)
              ? Number(tier.sale_per_night)
              : Number(tier.price_per_night);
            if (effective > 0 && effective < minPrice) {
              minPrice = effective;
            }
          }
        }
        const roomSale = Number(prt.sale_per_night ?? 0);
        const roomPrice = Number(prt.price_per_night ?? 0);
        const roomEff = (roomSale > 0 && roomSale < roomPrice) ? roomSale : roomPrice;
        if (roomEff > 0 && roomEff < minPrice) {
          minPrice = roomEff;
        }
      }
      if (minPrice !== Infinity && minPrice > 0) {
        return minPrice;
      }
    }

    const sale = Number(item.sale_per_night ?? item.sale_price ?? 0);
    if (sale > 0) {
      return sale;
    }
    return Number(item.price_per_night ?? (item as any)?.price ?? 0);
  }

  hasDiscount(item: Partial<PropertyData>): boolean {
    const sale = Number(item.sale_per_night ?? item.sale_price ?? 0);
    const regular = Number(item.price_per_night ?? (item as any)?.price ?? 0);
    if (sale > 0 && regular > sale) return true;
    if (item.property_room_types && item.property_room_types.length > 0) {
      return item.property_room_types.some((prt) => {
        if (prt.pricing_tiers && prt.pricing_tiers.length > 0) {
          return prt.pricing_tiers.some((t) => !!(t.sale_per_night && t.sale_per_night > 0 && t.sale_per_night < t.price_per_night));
        }
        return !!(prt.sale_per_night && prt.sale_per_night > 0 && prt.price_per_night && prt.sale_per_night < prt.price_per_night);
      });
    }
    return false;
  }

  getRegularPrice(item: Partial<PropertyData>): number {
    return Number(item.price_per_night ?? (item as any)?.price ?? 0);
  }

  getRating(item: Partial<PropertyData>): number {
    return Number(item?.average_rating ?? (item as any)?.rating ?? 0);
  }

  getReviewsCount(item: Partial<PropertyData>): number {
    return Number(item?.total_reviews ?? item?.rating_summary?.total_reviews ?? (item as any)?.reviews_count ?? (item as any)?.review_count ?? 0);
  }

  getReviewTag(item: Partial<PropertyData>): string {
    const count = this.getReviewsCount(item);
    const rating = this.getRating(item);
    if (count === 0 || rating === 0) return 'New Stay';
    if (rating >= 4.8) return 'Guest Favorite';
    if (rating >= 4.5) return 'Top Rated';
    if (rating >= 4.0) return 'Highly Rated';
    return 'Verified Stay';
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    const parent = img.parentElement;
    if (parent) {
      parent.style.background = 'linear-gradient(160deg,#3E4E37,#55694A 55%,#8AA07D)';
    }
  }
}
