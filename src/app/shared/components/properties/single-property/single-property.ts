import { Component, Input } from '@angular/core';
import { Router } from "@angular/router";
import { CommonModule, DecimalPipe } from '@angular/common';
import { PropertyData } from '../../../../services/property/property.model'
import { environment } from '../../../../../environments/environment';
@Component({
  selector: 'app-single-property',
  imports: [CommonModule, DecimalPipe],
  templateUrl: './single-property.html',
  styleUrl: './single-property.css',
})
export class SingleProperty {
  readonly assetUrl = environment.assetUrl;
  @Input() item: Partial<PropertyData> = {};

  constructor(private router: Router) {}

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
    const sale = Number(item.sale_per_night ?? item.sale_price ?? 0);
    if (sale > 0) {
      return sale;
    }
    return Number(item.price_per_night ?? (item as any)?.price ?? 0);
  }

  hasDiscount(item: Partial<PropertyData>): boolean {
    const sale = Number(item.sale_per_night ?? item.sale_price ?? 0);
    const regular = Number(item.price_per_night ?? (item as any)?.price ?? 0);
    return sale > 0 && regular > sale;
  }

  getRegularPrice(item: Partial<PropertyData>): number {
    return Number(item.price_per_night ?? (item as any)?.price ?? 0);
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
