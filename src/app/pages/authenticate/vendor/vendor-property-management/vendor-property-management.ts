import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal, DestroyRef} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterModule } from '@angular/router';
import { PROPERTY_TYPES_LABELS, PropertyData, PropertySearch } from '../../../../services/property/property.model';
import { PropertyService } from '../../../../services/property/property-service';
import { PageBreadcrumb } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb';
import { Card } from '../../../../shared/components/ui/card/card';
import { PaginationMeta } from '../../../../services/api/api-response.model';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { catchError, finalize, of } from 'rxjs';
import { Pagination } from '../../../../shared/components/ui/pagination/pagination';
import { PropertySetupStepsComponent } from '../../../../shared/components/property/property-setup-steps/property-setup-steps';

import { TableLoaderComponent } from '../../../../shared/components/ui/table-loader/table-loader.component';

@Component({
  selector: 'app-vendor-property-management',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    PageBreadcrumb,
    Card,
    ReactiveFormsModule,
    Pagination,
    PropertySetupStepsComponent,
    TableLoaderComponent,
  ],
  templateUrl: './vendor-property-management.html',
  styleUrl: './vendor-property-management.css',
})
export class VendorPropertyManagement implements OnInit {
  private readonly router = inject(Router);
  private readonly propertyService = inject(PropertyService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  meta!: PaginationMeta;

  readonly properties = signal<PropertyData[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly currentPage = signal(1);
  readonly pageSize = signal(10);
  readonly totalItems = signal(0);

  readonly searchForm = this.formBuilder.group({
    title: [''],
    city: [''],
    status: [''],
  });

  readonly pageSizeOptions = [10, 20, 30];

  onSearch(): void {
    this.currentPage.set(1);
    this.loadProperties();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadProperties();
  }

  onPageSizeChange(pageSize: number): void {
    this.pageSize.set(pageSize);
    this.currentPage.set(1);
    this.loadProperties();
  }

  onReset(): void {
    this.searchForm.reset({ title: '', city: '', status: '' });
    this.currentPage.set(1);
    this.loadProperties();
  }

  ngOnInit(): void {
    this.loadProperties();
  }

  private loadProperties(): void {
    const filters = this.searchForm.getRawValue();
    const rawStatus = filters.status?.trim().toLowerCase();
    const normalizedStatus = rawStatus === 'draft' || rawStatus === 'active' || rawStatus === 'inactive' ? rawStatus : undefined;

    const search: PropertySearch = {
      name: filters.title?.trim() || undefined,
      city: filters.city?.trim() || undefined,
      status: normalizedStatus,
    };

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.propertyService.vendor.getProperties({
      page: this.currentPage(),
      size: this.pageSize(),
      search,
    }).pipe(
      finalize(() => this.isLoading.set(false)),
      catchError((error) => {
        this.errorMessage.set(error?.error?.message || error?.message || 'Unable to load properties.');
        this.properties.set([]);
        this.totalItems.set(0);
        return of(null);
      })
    ).subscribe((response) => {
      if (!response) {
        return;
      }

      this.properties.set(response.data || []);
      this.totalItems.set(response.meta?.total || 0);
      this.meta = { ...response.meta };
    });
  }

  navigateToCreate(): void {
    this.router.navigate(['/vendor/property-management/create']);
  }

  navigateToEdit(property: PropertyData): void {
    this.router.navigate(['/vendor/property-management', property.id, 'edit']);
  }

  getStatusClass(status: string): string {
    return {
      draft: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
      active: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
      inactive: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
    }[status] ?? 'bg-slate-50 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300';
  }

  statusLabel(status: string): string {
    return {
      draft: 'Draft',
      active: 'Active',
      inactive: 'Inactive',
    }[status] ?? 'Unknown';
  }

  formatCurrency(value: number | string | undefined, currencyCode: string = 'INR'): string {
    const safeValue = Number(value ?? 0);
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: currencyCode, maximumFractionDigits: 0 }).format(safeValue);
  }

  typeLabel(type: string): string {
    return PROPERTY_TYPES_LABELS[type] ?? 'Unknown';
  }
}
