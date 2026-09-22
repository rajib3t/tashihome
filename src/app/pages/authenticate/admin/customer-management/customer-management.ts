import { Component, inject, signal, DestroyRef} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';
import { PageBreadcrumb } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb';
import { Card } from '../../../../shared/components/ui/card/card';
import { Modal } from '../../../../shared/components/ui/modal/modal';
import { Pagination, PaginationMeta } from '../../../../shared/components/ui/pagination/pagination';
import { Avatar } from '../../../../shared/components/users/avatar/avatar';
import { UserService } from '../../../../services/user/user-service';
import { AdminCreateCustomerDTO, Customer, CustomerQuery, CustomerSearch } from '../../../../services/user/user.model';
import { environment } from '../../../../../environments/environment';

import { TableLoaderComponent } from '../../../../shared/components/ui/table-loader/table-loader.component';

@Component({
  selector: 'app-customer-management',
  imports: [
    CommonModule,
    PageBreadcrumb,
    Card,
    Modal,
    ReactiveFormsModule,
    Pagination,
    RouterModule,
    Avatar,
    TableLoaderComponent,
  ],
  templateUrl: './customer-management.html',
  styleUrl: './customer-management.css',
})
export class CustomerManagement {
  public readonly assetUrl = environment.assetUrl;
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly destroyRef = inject(DestroyRef);

  meta!: PaginationMeta;

  // List state
  readonly customers = signal<Customer[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly currentPage = signal(1);
  readonly pageSize = signal(10);
  readonly totalItems = signal(0);
  readonly pageSizeOptions = [10, 20, 30];

  // Create modal state
  readonly isCreateModalOpen = signal<boolean>(false);
  readonly isCreating = signal(false);
  readonly createErrorMessage = signal<string | null>(null);

  // Status modal state
  readonly isStatusModalOpen = signal<boolean>(false);
  readonly isUpdatingStatus = signal(false);
  readonly statusErrorMessage = signal<string | null>(null);
  readonly customerToToggleStatus = signal<Customer | null>(null);

  // Password reset modal state
  readonly isPasswordResetModalOpen = signal<boolean>(false);
  readonly isSendingPasswordReset = signal<boolean>(false);
  readonly passwordResetError = signal<string | null>(null);
  readonly passwordResetSuccess = signal<string | null>(null);
  readonly customerToResetPassword = signal<Customer | null>(null);

  readonly searchForm = this.formBuilder.group({
    full_name: [''],
    email: ['', [Validators.email]],
    phone: [''],
    status: [''],
  });

  readonly createForm = this.formBuilder.group({
    full_name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    is_subscribed: [false],
  });

  readonly passwordResetForm = this.formBuilder.group({
    confirm: ['', [Validators.required, Validators.pattern(/^CONFIRM$/)]],
  });

  get createFullNameControl() {
    return this.createForm.get('full_name')!;
  }

  get createEmailControl() {
    return this.createForm.get('email')!;
  }

  get createPhoneControl() {
    return this.createForm.get('phone')!;
  }

  get createPasswordControl() {
    return this.createForm.get('password')!;
  }



  get resetConfirmControl() {
    return this.passwordResetForm.get('confirm')!;
  }

  ngOnInit(): void {
    this.loadCustomers();
  }

  loadCustomers(): void {
    const filters = this.searchForm.getRawValue();
    const search: CustomerSearch = {
      full_name: filters.full_name?.trim() || undefined,
      email: filters.email?.trim() || undefined,
      phone: filters.phone?.trim() || undefined,
      status: filters.status?.trim() || undefined,
     
    };

    const query: CustomerQuery = {
      page: this.currentPage(),
      size: this.pageSize(),
      search,
    };

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.userService.getCustomers(query)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        catchError((error) => {
          this.errorMessage.set(error?.error?.message || error?.message || 'Unable to load customers.');
          this.customers.set([]);
          this.totalItems.set(0);
          return of(null);
        })
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        if (!response) {
          return;
        }

        this.customers.set(response.data || []);
        this.totalItems.set(response.meta?.total || 0);
        this.meta = { ...response.meta };
      });
  }

  onSearch(): void {
    this.currentPage.set(1);
    this.loadCustomers();
  }

  onReset(): void {
    this.searchForm.reset({ full_name: '', email: '', phone: '', status: '' });
    this.currentPage.set(1);
    this.loadCustomers();
  }

  onPageSizeChange(pageSize: number): void {
    this.pageSize.set(pageSize);
    this.currentPage.set(1);
    this.loadCustomers();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadCustomers();
  }

  getSerialNumber(index: number): number {
    const currentPage = this.currentPage() || 1;
    const itemsPerPage = this.meta?.size || this.pageSize();
    return (currentPage - 1) * itemsPerPage + index + 1;
  }

  // ================= CREATE CUSTOMER =================

  openCreateModal(): void {
    this.createForm.reset({
      full_name: '',
      email: '',
      phone: '',
      password: '',
      is_subscribed: false,
    });
    this.createErrorMessage.set(null);
    this.isCreating.set(false);
    this.createForm.markAsUntouched();
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
  }

  submitCreateCustomer(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      this.createErrorMessage.set('Please fill out all required fields correctly.');
      return;
    }

    this.isCreating.set(true);
    this.createErrorMessage.set(null);

    const formVal = this.createForm.getRawValue();
    const payload: AdminCreateCustomerDTO = {
      full_name: formVal.full_name?.trim() || '',
      email: formVal.email?.trim() || '',
      phone: formVal.phone?.trim() || '',
      password: formVal.password?.trim() || '',

      is_subscribed: !!formVal.is_subscribed,
    };

    this.userService.createCustomer(payload)
      .pipe(
        finalize(() => this.isCreating.set(false)),
        catchError((error) => {
          const apiError = this.userService.apiService.extractApiErrorMessage(error);
          this.createErrorMessage.set(apiError || error?.error?.message || error?.message || 'Failed to create customer. Please try again.');
          return of(null);
        })
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        if (!res) {
          return;
        }
        this.closeCreateModal();
        this.loadCustomers();
        if (res.data?.id) {
          this.router.navigate(['/admin/customer-management/' + res.data.id + '/edit']);
        }
      });
  }

  // ================= STATUS TOGGLE =================

  openStatusModal(customer: Customer): void {
    this.customerToToggleStatus.set(customer);
    this.statusErrorMessage.set(null);
    this.isStatusModalOpen.set(true);
  }

  closeStatusModal(): void {
    this.isStatusModalOpen.set(false);
    this.customerToToggleStatus.set(null);
  }

  getStatusLabel(status?: string): string {
    return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown';
  }

  isInactive(customer: Customer | null): boolean {
    return customer?.status?.toLowerCase() === 'inactive';
  }

  getDisableActionLabel(customer: Customer | null): string {
    return this.isInactive(customer) ? 'Enable' : 'Disable';
  }

  getStatusAction(customer: Customer | null): 'active' | 'inactive' {
    return this.isInactive(customer) ? 'active' : 'inactive';
  }

  confirmStatusToggle(): void {
    const customer = this.customerToToggleStatus();
    if (!customer) {
      return;
    }

    const nextStatus = this.getStatusAction(customer);
    this.isUpdatingStatus.set(true);
    this.statusErrorMessage.set(null);

    this.userService.statusUpdateCustomer(customer.id, nextStatus)
      .pipe(
        finalize(() => this.isUpdatingStatus.set(false)),
        catchError((error) => {
          const apiError = this.userService.apiService.extractApiErrorMessage(error);
          this.statusErrorMessage.set(
            apiError || error?.error?.message || error?.message || `Unable to ${nextStatus === 'active' ? 'enable' : 'disable'} customer.`
          );
          return of(null);
        })
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        if (!response) {
          return;
        }
        this.closeStatusModal();
        this.loadCustomers();
      });
  }

  // ================= PASSWORD RESET =================

  openPasswordResetModal(customer: Customer): void {
    this.customerToResetPassword.set(customer);
    this.passwordResetForm.reset({ confirm: '' });
    this.passwordResetError.set(null);
    this.isSendingPasswordReset.set(false);
    this.isPasswordResetModalOpen.set(true);
  }

  closePasswordResetModal(): void {
    this.isPasswordResetModalOpen.set(false);
    this.customerToResetPassword.set(null);
    this.passwordResetForm.reset({ confirm: '' });
    this.passwordResetError.set(null);
  }

  submitPasswordReset(): void {
    const customer = this.customerToResetPassword();
    if (!customer) {
      return;
    }

    if (this.passwordResetForm.invalid) {
      this.passwordResetForm.markAllAsTouched();
      return;
    }

    const confirmText = this.passwordResetForm.value.confirm?.trim() || 'CONFIRM';
    this.isSendingPasswordReset.set(true);
    this.passwordResetError.set(null);

    this.userService.sendCustomerPasswordReset(customer.id, confirmText)
      .pipe(
        finalize(() => this.isSendingPasswordReset.set(false)),
        catchError((error) => {
          const apiError = this.userService.apiService.extractApiErrorMessage(error);
          this.passwordResetError.set(
            apiError || error?.error?.message || error?.message || 'Failed to send password reset link. Please try again.'
          );
          return of(null);
        })
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        if (!response) {
          return;
        }
        const successMsg = response.message || `Password reset link has been successfully sent to ${customer.email}.`;
        this.passwordResetSuccess.set(successMsg);
        this.closePasswordResetModal();
      });
  }
}

