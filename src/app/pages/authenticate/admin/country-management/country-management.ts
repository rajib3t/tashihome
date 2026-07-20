import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, finalize, of } from 'rxjs';
import { Country, CountryQuery, CountrySearch } from '../../../../services/country/country-model';
import { CountryService } from '../../../../services/country/country-service';
import { PageBreadcrumb } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb';
import { Card } from '../../../../shared/components/ui/card/card';
import { Pagination, PaginationMeta } from '../../../../shared/components/ui/pagination/pagination';
import { Modal } from '../../../../shared/components/ui/modal/modal';

@Component({
  selector: 'app-country-management',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PageBreadcrumb,
    Card,
    Pagination,
    Modal
  ],
  templateUrl: './country-management.html',
  styleUrl: './country-management.css',
})
export class CountryManagement {
  private readonly formBuilder = inject(FormBuilder);
  private readonly countryService = inject(CountryService);
  meta!: PaginationMeta;
  readonly countries = signal<Country[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly currentPage = signal(1);
  readonly pageSize = signal(10 );
  readonly totalItems = signal(0);


     isCreateModalOpen = signal<boolean>(false);

  isCreating = signal(false);
  createErrorMessage = signal<string | null>(null);
  readonly searchForm = this.formBuilder.group({
    name: [''],
    code: [''],
    status: [''],
  });

  readonly pageSizeOptions = [10, 20, 30];

  ngOnInit(): void {
    this.loadCountries();
  }

  onSearch(): void {
    this.currentPage.set(1);
    this.loadCountries();
  }

  onReset(): void {
    this.searchForm.reset({ name: '', code: '', status: '' });
    this.currentPage.set(1);
    this.loadCountries();
  }


  onPageSizeChange(pageSize: number): void {
    this.pageSize.set(pageSize);
    this.currentPage.set(1);
    this.loadCountries();
  }

  private loadCountries(): void {

    const filters = this.searchForm.getRawValue();
    const search: CountrySearch = {
      name: filters.name?.trim() || undefined,
      code: filters.code?.trim() || undefined,
      status: filters.status?.trim() || undefined,
    };

    const query: CountryQuery = {
      page: this.currentPage(),
      size: this.pageSize(),
      search,
    };

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.countryService.getCountries(query)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        catchError((error) => {
          this.errorMessage.set(error?.error?.message || error?.message || 'Unable to load countries.');
          this.countries.set([]);
          this.totalItems.set(0);
          return of(null);
        })
      )
      .subscribe((response) => {
        if (!response) {
          return;
        }

        this.countries.set(response.data || []);
        this.totalItems.set(response.meta?.total || 0);
        this.meta = { ...response.meta };
      });
  }

  public readonly createCountryForm = this.formBuilder.group({
    name: ['', Validators.required],
    code: ['', Validators.required],
    
  });

  openCreateModal() {
    this.isCreateModalOpen.set(true);
  }

closeCreateModal() {
    this.isCreateModalOpen.set(false);
}

submitCreateForm() {
    if (this.createCountryForm.invalid) {
      return;
    }
  }

onPageChange(page: number) {
    this.currentPage.set(page);
    this.loadCountries();
  }

}
