import { Component, inject, signal } from '@angular/core';
import { PageBreadcrumb } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb';
import { CommonModule } from '@angular/common';
import { Card } from '../../../../shared/components/ui/card/card';
import { Modal } from '../../../../shared/components/ui/modal/modal';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserService } from '../../../../services/user/user-service';
import { RequestVendor, User, VendorQuery, VendorSearch } from '../../../../services/user/user.model';
import { catchError, finalize, of } from 'rxjs';
import { PaginationMeta } from '../../../../services/api/api-response.model';
import { Pagination } from '../../../../shared/components/ui/pagination/pagination';
@Component({
  selector: 'app-vendor-management',
  imports: [
    CommonModule,
    PageBreadcrumb,
    Card,
    Modal,
    ReactiveFormsModule ,
    Pagination
  ],
  templateUrl: './vendor-management.html',
  styleUrl: './vendor-management.css',
})
export class VendorManagement {

  private readonly formBuilder = inject(FormBuilder);

  private readonly userService = inject(UserService);
    meta!: PaginationMeta;
  // Create  modal state
  isCreateModalOpen = signal<boolean>(false);
  isCreating = signal(false);
  createErrorMessage = signal<string | null>(null);


  // Cities List State
    readonly users = signal<User[]>([]);
    readonly isLoading = signal(false);
    readonly errorMessage = signal('');
    readonly currentPage = signal(1);
    readonly pageSize = signal(10);
    readonly totalItems = signal(0);
  openCreateModal() {
    this.createVendorForm.reset();
    this.createErrorMessage.set(null);
    this.isCreating.set(false);
    this.createVendorForm.markAsUntouched();
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal() {
    this.isCreateModalOpen.set(false);
  }

   readonly searchForm = this.formBuilder.group({
      name: [''],
      email: ['', [Validators.email]],
      phone: ['', [Validators.pattern(/^\d{10}$/)]],
      status: [''],
    });

    readonly pageSizeOptions = [10, 20, 30];
    onSearch(): void {
    this.currentPage.set(1);
   this.loadVendors();
  }

  onPageSizeChange(pageSize: number): void {
    this.pageSize.set(pageSize);
    this.currentPage.set(1);
    this.loadVendors();
  }

  onReset(): void {
    this.searchForm.reset({ name: '', phone: '', email: '', status: '' });
    this.currentPage.set(1);
    this.loadVendors();
  }
  // Create vendor form
  public createVendorForm = this.formBuilder.group({
    name: ['', [  Validators.required, Validators.minLength(3), Validators.maxLength(50), Validators.pattern(/^[a-zA-Z0-9\s]+$/) ]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
  });

  loadVendors(){
    const filters = this.searchForm.getRawValue();
    const search: VendorSearch = {
        name: filters.name?.trim() || undefined,
        email: filters.email?.trim() || undefined,
        phone: filters.phone?.trim() || undefined,
        status: filters.status?.trim() || undefined,
    };

    const query: VendorQuery = {
      page: this.currentPage(),
      size: this.pageSize(),
      search,
    };

    this.isLoading.set(true);
    this.errorMessage.set('');
    

    this.userService.getVendors(query)
                  .pipe(
                    finalize(() => this.isLoading.set(false)),
                    catchError((error) => {
                      this.errorMessage.set(error?.error?.message || error?.message || 'Unable to load vendors.');
                      this.users.set([]);
                      this.totalItems.set(0);
                      return of(null);
                    })
                  )
                  .subscribe((response) => {
                    if (!response) {
                      return;
                    }
            
                    this.users.set(response.data || []);
                    this.totalItems.set(response.meta?.total || 0);
                    this.meta = { ...response.meta };
              });
  }

  getSerialNumber(index: number): number {
    const currentPage = this.currentPage() || 1;
    const itemsPerPage = this.meta?.size || 2;
    return (currentPage - 1) * itemsPerPage + index + 1;
  }

  ngOnInit(): void {
    this.loadVendors();
  }

  onPageChange(page: number) {
    this.currentPage.set(page);
    this.loadVendors();
  }

  // Create vendor submission
  submitCreateVendor() {
    if (this.createVendorForm.valid) {
      this.isCreating.set(true);
      this.createErrorMessage.set(null);

      const payload: RequestVendor = {
        full_name: this.createVendorForm.value.name as string,
        email: this.createVendorForm.value.email as string,
        phone: this.createVendorForm.value.phone as string
      };
      // Simulate an API call to create the vendor
      this.userService.createVendor(payload).subscribe({
        next: () => {
          this.isCreating.set(false);
          this.closeCreateModal();
          this.createVendorForm.reset();
        },
        error: () => {
          this.isCreating.set(false);
          this.createErrorMessage.set('Failed to create vendor. Please try again.');
        }
      });
    } else {
      this.createErrorMessage.set('Please fill out the form correctly.');
    }
  }
  get nameControl() {
    return this.createVendorForm.get('name')!;
  }

   get emailControl() {
    return this.createVendorForm.get('email')!;
  }

  get phoneControl() {
    return this.createVendorForm.get('phone')!;
  }

}
