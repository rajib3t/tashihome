import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { PropertyItem } from '../../../../services/property/property.model';
import { PropertyService } from '../../../../services/property/property-service';
import { PageBreadcrumb } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb';
import { Card } from '../../../../shared/components/ui/card/card';

@Component({
  selector: 'app-property-management',
  standalone: true,
  imports: [CommonModule, RouterModule, PageBreadcrumb, Card],
  templateUrl: './property-management.html',
  styleUrl: './property-management.css',
})
export class PropertyManagement {
  private readonly router = inject(Router);
  private readonly propertyService = inject(PropertyService);

  readonly searchTerm = signal('');
  readonly properties = signal<PropertyItem[]>([]);

  readonly filteredProperties = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();

    return this.properties().filter((property) => {
      if (!term) {
        return true;
      }

      return [property.title, property.city, property.type, property.address]
        .some((value) => value.toLowerCase().includes(term));
    });
  });

  ngOnInit(): void {
    this.loadProperties();
  }

  private loadProperties(): void {
    this.propertyService.getProperties({
      page: 1,
      size: 50,
      search: {
        title: this.searchTerm().trim() || undefined,
        city: this.searchTerm().trim() || undefined,
      },
    }).subscribe((response) => {
      this.properties.set(response.data);
    });
  }

  onSearch(): void {
    this.loadProperties();
  }

  navigateToCreate(): void {
    this.router.navigate(['/admin/property-management/create']);
  }

  navigateToEdit(property: PropertyItem): void {
    this.router.navigate(['/admin/property-management', property.id, 'edit']);
  }

  getStatusClass(status: PropertyItem['status']): string {
    return {
      draft: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
      active: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
      inactive: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
    }[status];
  }

  statusLabel(status: PropertyItem['status']): string {
    return {
      draft: 'Draft',
      active: 'Active',
      inactive: 'Inactive',
    }[status];
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 0 }).format(value);
  }
}
