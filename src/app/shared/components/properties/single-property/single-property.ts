import { Component, Input } from '@angular/core';
import { Router } from "@angular/router";
import { DecimalPipe } from '@angular/common';
import { PropertyData } from '../../../../services/property/property.model'
import { environment } from '../../../../../environments/environment';
@Component({
  selector: 'app-single-property',
  imports: [DecimalPipe],
  templateUrl: './single-property.html',
  styleUrl: './single-property.css',
})
export class SingleProperty {
  readonly assetUrl = environment.assetUrl;
  @Input() item: Partial<PropertyData> = {};
  
  constructor(private router: Router) {}
  
  goToPropertyDetail() {
    this.router.navigate(['/property', this.item.slug]);
  }

  getFoodOptionTags(item: Partial<PropertyData>): string[] {
    if (!item.property_food_options || item.property_food_options.length === 0) {
      return [];
    }
    return item.property_food_options
      .filter(option => option.is_included)
      .map(option => option.name);
  }
}
