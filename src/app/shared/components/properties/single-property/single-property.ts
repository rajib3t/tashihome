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

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    const parent = img.parentElement;
    if (parent) {
      parent.style.background = 'linear-gradient(160deg,#3E4E37,#55694A 55%,#8AA07D)';
    }
  }
}
