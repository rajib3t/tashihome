import { Component, inject, OnInit, signal, DestroyRef} from '@angular/core';
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
import { StaffService } from '../../../../services/staff/staff-service';
import { CreateStaffDTO, StaffQuery, StaffRole, StaffSearch, StaffUser } from '../../../../services/staff/staff.model';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-staff-management',
  imports: [
    CommonModule,
    PageBreadcrumb,
    Card,
    Modal,
    ReactiveFormsModule,
    Pagination,
    RouterModule,
    Avatar,
  ],
  templateUrl: './staff-management.html',
  styleUrl: './staff-management.css',
})
export class StaffManagement implements OnInit {
  public readonly assetUrl = environment.assetUrl;
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly staffService = inject(StaffService);
  private readonly destroyRef = inject(DestroyRef);

  meta!: PaginationMeta;

  // List state
  readonly staffs = signal<StaffUser[]>([]);
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
  readonly staffToToggleStatus = signal<StaffUser | null>(null);

  // Password reset modal state
  readonly isPasswordResetModalOpen = signal<boolean>(false);
  readonly isSendingPasswordReset = signal<boolean>(false);
  readonly passwordResetError = signal<string | null>(null);
  readonly passwordResetSuccess = signal<string | null>(null);
  readonly staffToResetPassword = signal<StaffUser | null>(null);

  readonly searchForm = this.formBuilder.group({
    full_name: [''],
    email: ['', [Validators.email]],
    phone: [''],
    role: [''],
    status: [''],
  });

  readonly createForm = this.formBuilder.group({
    full_name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    role: ['staff' as StaffRole, [Validators.required]],
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

  get createRoleControl() {
    return this.createForm.get('role')!;
  }

  get resetConfirmControl() {
    return this.passwordResetForm.get('confirm')!;
  }

  ngOnInit(): void {
    this.loadStaffs();
  }

  loadStaffs(): void {
    const filters = this.searchForm.getRawValue();
    const search: StaffSearch = {
      full_name: filters.full_name?.trim() || undefined,
      email: filters.email?.trim() || undefined,
      phone: filters.phone?.trim() || undefined,
      role: filters.role?.trim() || undefined,
      status: filters.status?.trim() || undefined,
    };

    const query: StaffQuery = {
      page: this.currentPage(),
      size: this.pageSize(),
      search,
    };

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.staffService
      .getStaffs(query)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        catchError((error) => {
          const apiError = this.staffService.apiService.extractApiErrorMessage(error);
          this.errorMessage.set(apiError || error?.error?.message || error?.message || 'Unable to load staff members.');
          this.staffs.set([]);
          this.totalItems.set(0);
          return of(null);
        })
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        if (!response) {
          return;
        }

        this.staffs.set(response.data || []);
        this.totalItems.set(response.meta?.total || 0);
        this.meta = { ...response.meta };
      });
  }

  onSearch(): void {
    this.currentPage.set(1);
    this.loadStaffs();
  }

  onReset(): void {
    this.searchForm.reset({ full_name: '', email: '', phone: '', role: '', status: '' });
    this.currentPage.set(1);
    this.loadStaffs();
  }

  onPageSizeChange(pageSize: number): void {
    this.pageSize.set(pageSize);
    this.currentPage.set(1);
    this.loadStaffs();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadStaffs();
  }

  getSerialNumber(index: number): number {
    const currentPage = this.currentPage() || 1;
    const itemsPerPage = this.meta?.size || this.pageSize();
    return (currentPage - 1) * itemsPerPage + index + 1;
  }

  // ================= CREATE STAFF / ADMIN =================

  openCreateModal(): void {
    this.createForm.reset({
      full_name: '',
      email: '',
      phone: '',
      password: '',
      role: 'staff',
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

  submitCreateStaff(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      this.createErrorMessage.set('Please fill out all required fields correctly.');
      return;
    }

    this.isCreating.set(true);
    this.createErrorMessage.set(null);

    const formVal = this.createForm.getRawValue();
    const payload: CreateStaffDTO = {
      full_name: formVal.full_name?.trim() || '',
      email: formVal.email?.trim() || '',
      phone: formVal.phone?.trim() || '',
      password: formVal.password?.trim() || '',
      role: (formVal.role as StaffRole) || 'staff',
      is_subscribed: !!formVal.is_subscribed,
    };

    this.staffService
      .createStaff(payload)
      .pipe(
        finalize(() => this.isCreating.set(false)),
        catchError((error) => {
          const apiError = this.staffService.apiService.extractApiErrorMessage(error);
          this.createErrorMessage.set(
            apiError || error?.error?.message || error?.message || 'Failed to create staff member. Please try again.'
          );
          return of(null);
        })
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        if (!res) {
          return;
        }
        this.closeCreateModal();
        this.loadStaffs();
        if (res.data?.id) {
          this.router.navigate(['/admin/staff-management/' + res.data.id + '/edit']);
        }
      });
  }

  // ================= STATUS TOGGLE =================

  openStatusModal(staff: StaffUser): void {
    this.staffToToggleStatus.set(staff);
    this.statusErrorMessage.set(null);
    this.isStatusModalOpen.set(true);
  }

  closeStatusModal(): void {
    this.isStatusModalOpen.set(false);
    this.staffToToggleStatus.set(null);
  }

  getStatusLabel(status?: string): string {
    return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown';
  }

  isInactive(staff: StaffUser | null): boolean {
    return staff?.status?.toLowerCase() === 'inactive';
  }

  getDisableActionLabel(staff: StaffUser | null): string {
    return this.isInactive(staff) ? 'Enable' : 'Disable';
  }

  getStatusAction(staff: StaffUser | null): 'active' | 'inactive' {
    return this.isInactive(staff) ? 'active' : 'inactive';
  }

  confirmStatusToggle(): void {
    const staff = this.staffToToggleStatus();
    if (!staff) {
      return;
    }

    const nextStatus = this.getStatusAction(staff);
    this.isUpdatingStatus.set(true);
    this.statusErrorMessage.set(null);

    this.staffService
      .changeStaffStatusByPath(staff.id, nextStatus)
      .pipe(
        finalize(() => this.isUpdatingStatus.set(false)),
        catchError((error) => {
          const apiError = this.staffService.apiService.extractApiErrorMessage(error);
          this.statusErrorMessage.set(
            apiError || error?.error?.message || error?.message || `Unable to ${nextStatus === 'active' ? 'enable' : 'disable'} account.`
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
        this.loadStaffs();
      });
  }

  // ================= PASSWORD RESET =================

  openPasswordResetModal(staff: StaffUser): void {
    this.staffToResetPassword.set(staff);
    this.passwordResetForm.reset({ confirm: '' });
    this.passwordResetError.set(null);
    this.isSendingPasswordReset.set(false);
    this.isPasswordResetModalOpen.set(true);
  }

  closePasswordResetModal(): void {
    this.isPasswordResetModalOpen.set(false);
    this.staffToResetPassword.set(null);
    this.passwordResetForm.reset({ confirm: '' });
    this.passwordResetError.set(null);
  }

  submitPasswordReset(): void {
    const staff = this.staffToResetPassword();
    if (!staff) {
      return;
    }

    if (this.passwordResetForm.invalid) {
      this.passwordResetForm.markAllAsTouched();
      return;
    }

    const confirmText = this.passwordResetForm.value.confirm?.trim() || 'CONFIRM';
    this.isSendingPasswordReset.set(true);
    this.passwordResetError.set(null);

    this.staffService
      .sendStaffPasswordReset(staff.id, confirmText)
      .pipe(
        finalize(() => this.isSendingPasswordReset.set(false)),
        catchError((error) => {
          const apiError = this.staffService.apiService.extractApiErrorMessage(error);
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
        const successMsg = response.message || `Password reset link has been successfully sent to ${staff.email}.`;
        this.passwordResetSuccess.set(successMsg);
        this.closePasswordResetModal();
      });
  }

  getRoleBadgeClass(role?: string): string {
    switch (role?.toLowerCase()) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'staff':
        return 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300 border-teal-200 dark:border-teal-800';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    }
  }
}

