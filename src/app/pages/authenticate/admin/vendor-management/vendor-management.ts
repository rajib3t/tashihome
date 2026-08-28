import { Component, inject, signal } from '@angular/core';
import { PageBreadcrumb } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb';
import { CommonModule } from '@angular/common';
import { Card } from '../../../../shared/components/ui/card/card';
import { Modal } from '../../../../shared/components/ui/modal/modal';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserService } from '../../../../services/user/user-service';
import { RequestVendor, User, VendorDetail, VendorQuery, VendorSearch } from '../../../../services/user/user.model';
import { catchError, finalize, of } from 'rxjs';
import { PaginationMeta } from '../../../../services/api/api-response.model';
import { Pagination } from '../../../../shared/components/ui/pagination/pagination';
import { Router, RouterModule } from '@angular/router';
import { Avatar } from '../../../../shared/components/users/avatar/avatar';
import { environment } from '../../../../../environments/environment';
@Component({
  selector: 'app-vendor-management',
  imports: [
    CommonModule,
    PageBreadcrumb,
    Card,
    Modal,
    ReactiveFormsModule ,
    Pagination,
    RouterModule,
    Avatar
  ],
  templateUrl: './vendor-management.html',
  styleUrl: './vendor-management.css',
})
export class VendorManagement {
  public readonly assetUrl = environment.assetUrl;
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);

  private readonly userService = inject(UserService);
    meta!: PaginationMeta;
  // Create  modal state
  isCreateModalOpen = signal<boolean>(false);
  isCreating = signal(false);
  createErrorMessage = signal<string | null>(null);

   isStatusModalOpen = signal<boolean>(false);
    isUpdatingStatus = signal(false);
    statusErrorMessage = signal<string | null>(null);
    vendorToToggleStatus = signal<VendorDetail | null>(null);

  // Password Reset modal state
  readonly isPasswordResetModalOpen = signal<boolean>(false);
  readonly isSendingPasswordReset = signal<boolean>(false);
  readonly passwordResetError = signal<string | null>(null);
  readonly passwordResetSuccess = signal<string | null>(null);
  readonly vendorToResetPassword = signal<User | VendorDetail | null>(null);

  readonly passwordResetForm = this.formBuilder.group({
    confirm: ['', [Validators.required, Validators.pattern(/^CONFIRM$/)]],
  });

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
        next: (res) => {
          this.isCreating.set(false);
          this.closeCreateModal();
          this.createVendorForm.reset();
          this.loadVendors();
          this.router.navigate(['/admin/vendor-management/' + res.data.id + '/edit']);
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


  openStatusModal(vendor: VendorDetail) {
      this.vendorToToggleStatus.set(vendor);
      this.statusErrorMessage.set(null);
      this.isStatusModalOpen.set(true);
    }
  
    closeStatusModal() {
      this.isStatusModalOpen.set(false);
      this.vendorToToggleStatus.set(null);
    }


    getStatusLabel(status: string): string {
        return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown';
      }
    
      isInactive(vendor: VendorDetail | null): boolean {
        return vendor?.status === 'inactive';
      }
    
      getDisableActionLabel(vendor: VendorDetail | null): string {
        return this.isInactive(vendor) ? 'Enable' : 'Disable';
      }
    
      getStatusAction(vendor: VendorDetail | null): 'active' | 'inactive' {
        return this.isInactive(vendor) ? 'active' : 'inactive';
      }


      confirmStatusToggle() {
    const vendor = this.vendorToToggleStatus();
    if (!vendor) {
      return;
    }

    const nextStatus = this.getStatusAction(vendor);
    this.isUpdatingStatus.set(true);
    this.statusErrorMessage.set(null);

    this.userService.statusUpdateVendor(vendor.id, nextStatus)
      .pipe(
        finalize(() => this.isUpdatingStatus.set(false)),
        catchError((error) => {
          this.statusErrorMessage.set(
            error?.error?.message || error?.message || `Unable to ${nextStatus === 'active' ? 'enable' : 'disable'} vendor.`
          );
          return of(null);
        })
      )
      .subscribe((response) => {
        if (!response) {
          return;
        }
        this.closeStatusModal();
        this.loadVendors();
      });
  }

  get confirmControl() {
    return this.passwordResetForm.get('confirm')!;
  }

  openPasswordResetModal(vendor: User | VendorDetail) {
    this.vendorToResetPassword.set(vendor);
    this.passwordResetForm.reset({ confirm: '' });
    this.passwordResetError.set(null);
    this.isSendingPasswordReset.set(false);
    this.isPasswordResetModalOpen.set(true);
  }

  closePasswordResetModal() {
    this.isPasswordResetModalOpen.set(false);
    this.vendorToResetPassword.set(null);
    this.passwordResetForm.reset({ confirm: '' });
    this.passwordResetError.set(null);
  }

  submitPasswordReset() {
    const vendor = this.vendorToResetPassword();
    if (!vendor) {
      return;
    }

    if (this.passwordResetForm.invalid) {
      this.passwordResetForm.markAllAsTouched();
      return;
    }

    const confirmText = this.passwordResetForm.value.confirm?.trim() || 'CONFIRM';
    this.isSendingPasswordReset.set(true);
    this.passwordResetError.set(null);

    this.userService.sendVendorPasswordReset(vendor.id, confirmText)
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
      .subscribe((response) => {
        if (!response) {
          return;
        }
        const successMsg = response.message || `Password reset link has been successfully sent to ${vendor.email}.`;
        this.passwordResetSuccess.set(successMsg);
        this.closePasswordResetModal();
      });
  }
}
