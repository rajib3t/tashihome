import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
  readonly pageSize = signal(10);
  readonly totalItems = signal(0);

  isCreateModalOpen = signal<boolean>(false);
  isCreating = signal(false);
  createErrorMessage = signal<string | null>(null);

  // --- Edit state ---
  isEditModalOpen = signal<boolean>(false);
  isEditing = signal(false);
  editErrorMessage = signal<string | null>(null);
  selectedCountry = signal<Country | null>(null);

  // --- Disable state ---
  isDisableModalOpen = signal<boolean>(false);
  isDisabling = signal(false);
  disableErrorMessage = signal<string | null>(null);
  countryToDisable = signal<Country | null>(null);

  readonly searchForm = this.formBuilder.group({
    name: [''],
    code: [''],
    status: [''],
  });

  readonly pageSizeOptions = [10, 20, 30];

  ngOnInit(): void {
  this.loadCountries();
  this.setupCodeUppercase(this.createCountryForm);
  this.setupCodeUppercase(this.editCountryForm);
}

private setupCodeUppercase(form: FormGroup): void {
  form.get('code')?.valueChanges.subscribe((value) => {
    if (value && value !== value.toUpperCase()) {
      form.get('code')?.setValue(value.toUpperCase(), { emitEvent: false });
    }
  });
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

  // ================= CREATE =================

  public readonly createCountryForm = this.formBuilder.group({
    name: [
      '',
      [Validators.required, Validators.minLength(2), Validators.maxLength(100)],
    ],
    code: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(3),
        Validators.pattern(/^[A-Za-z]+$/),
      ],
    ],
  });

  openCreateModal() {
    this.createCountryForm.reset({ name: '', code: '' });
    this.createErrorMessage.set(null);
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal() {
    this.isCreateModalOpen.set(false);
  }

  submitCreateForm() {
  if (this.createCountryForm.invalid) {
    this.createCountryForm.markAllAsTouched();
    return;
  }

  const payload = this.createCountryForm.getRawValue();
  payload.code = payload.code?.toUpperCase() ?? null;

  this.isCreating.set(true);
  this.createErrorMessage.set(null);

  this.countryService.createCountry(payload as any)
    .pipe(
      finalize(() => this.isCreating.set(false)),
      catchError((error) => {
        this.createErrorMessage.set(
          error?.error?.message || error?.message || 'Unable to create country.'
        );
        return of(null);
      })
    )
    .subscribe((response) => {
      if (!response) {
        return;
      }
      this.closeCreateModal();
      this.loadCountries();
    });
}

  get nameControl() {
    return this.createCountryForm.get('name')!;
  }

  get codeControl() {
    return this.createCountryForm.get('code')!;
  }

  // ================= EDIT =================

  public readonly editCountryForm = this.formBuilder.group({
    name: [
      '',
      [Validators.required, Validators.minLength(2), Validators.maxLength(100)],
    ],
    code: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(3),
        Validators.pattern(/^[A-Za-z]+$/),
      ],
    ],
  });

  get editNameControl() {
    return this.editCountryForm.get('name')!;
  }

  get editCodeControl() {
    return this.editCountryForm.get('code')!;
  }

  openEditModal(country: Country) {
    this.selectedCountry.set(country);
    this.editCountryForm.reset({
      name: country.name,
      code: country.code,
    });
    this.editErrorMessage.set(null);
    this.isEditModalOpen.set(true);
  }

  closeEditModal() {
    this.isEditModalOpen.set(false);
    this.selectedCountry.set(null);
  }

  submitEditForm() {
  if (this.editCountryForm.invalid) {
    this.editCountryForm.markAllAsTouched();
    return;
  }

  const country = this.selectedCountry();
  if (!country) {
    return;
  }

  
  const payload = this.editCountryForm.getRawValue();
  payload.code = payload.code?.toUpperCase() || null;

  this.isEditing.set(true);
  this.editErrorMessage.set(null);

  this.countryService.updateCountry(country.id, payload as any)
    .pipe(
      finalize(() => this.isEditing.set(false)),
      catchError((error) => {
        this.editErrorMessage.set(
          error?.error?.message || error?.message || 'Unable to update country.'
        );
        return of(null);
      })
    )
    .subscribe((response) => {
      if (!response) {
        return;
      }
      this.closeEditModal();
      this.loadCountries();
    });
}
  onCodeInput(event: Event, form: FormGroup): void {
  const input = event.target as HTMLInputElement;
  const upper = input.value.toUpperCase();
  form.get('code')?.setValue(upper, { emitEvent: false });
}
  // ================= DISABLE =================

  openDisableModal(country: Country) {
    this.countryToDisable.set(country);
    this.disableErrorMessage.set(null);
    this.isDisableModalOpen.set(true);
  }

  closeDisableModal() {
    this.isDisableModalOpen.set(false);
    this.countryToDisable.set(null);
  }

  confirmDisable() {
    const country = this.countryToDisable();
    if (!country) {
      return;
    }

    this.isDisabling.set(true);
    this.disableErrorMessage.set(null);

    this.countryService.updateCountry(country.id, { status: 'inactive' } as any)
      .pipe(
        finalize(() => this.isDisabling.set(false)),
        catchError((error) => {
          this.disableErrorMessage.set(
            error?.error?.message || error?.message || 'Unable to disable country.'
          );
          return of(null);
        })
      )
      .subscribe((response) => {
        if (!response) {
          return;
        }
        this.closeDisableModal();
        this.loadCountries();
      });
  }

  onPageChange(page: number) {
    this.currentPage.set(page);
    this.loadCountries();
  }
}