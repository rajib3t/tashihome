import { Component, inject, signal } from '@angular/core';
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
import { AdminCreateUserDTO, User, UserQuery, UserRole, UserSearch } from '../../../../services/user/user.model';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-user-management',
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
  templateUrl: './user-management.html',
  styleUrl: './user-management.css',
})
export class UserManagement {
  public readonly assetUrl = environment.assetUrl;
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly userService = inject(UserService);

  meta!: PaginationMeta;

  // List state
  readonly users = signal<User[]>([]);
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
  readonly userToToggleStatus = signal<User | null>(null);

  // Password reset modal state
  readonly isPasswordResetModalOpen = signal<boolean>(false);
  readonly isSendingPasswordReset = signal<boolean>(false);
  readonly passwordResetError = signal<string | null>(null);
  readonly passwordResetSuccess = signal<string | null>(null);
  readonly userToResetPassword = signal<User | null>(null);

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
    role: ['user' as UserRole, [Validators.required]],
    status: ['active', [Validators.required]],
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

  get createStatusControl() {
    return this.createForm.get('status')!;
  }

  get resetConfirmControl() {
    return this.passwordResetForm.get('confirm')!;
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    const filters = this.searchForm.getRawValue();
    const search: UserSearch = {
      full_name: filters.full_name?.trim() || undefined,
      email: filters.email?.trim() || undefined,
      phone: filters.phone?.trim() || undefined,
      role: filters.role?.trim() || undefined,
      status: filters.status?.trim() || undefined,
    };

    const query: UserQuery = {
      page: this.currentPage(),
      size: this.pageSize(),
      search,
    };

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.userService.getUsers(query)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        catchError((error) => {
          this.errorMessage.set(error?.error?.message || error?.message || 'Unable to load users.');
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

  onSearch(): void {
    this.currentPage.set(1);
    this.loadUsers();
  }

  onReset(): void {
    this.searchForm.reset({ full_name: '', email: '', phone: '', role: '', status: '' });
    this.currentPage.set(1);
    this.loadUsers();
  }

  onPageSizeChange(pageSize: number): void {
    this.pageSize.set(pageSize);
    this.currentPage.set(1);
    this.loadUsers();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadUsers();
  }

  getSerialNumber(index: number): number {
    const currentPage = this.currentPage() || 1;
    const itemsPerPage = this.meta?.size || this.pageSize();
    return (currentPage - 1) * itemsPerPage + index + 1;
  }

  // ================= CREATE USER =================

  openCreateModal(): void {
    this.createForm.reset({
      full_name: '',
      email: '',
      phone: '',
      password: '',
      role: 'user',
      status: 'active',
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

  submitCreateUser(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      this.createErrorMessage.set('Please fill out all required fields correctly.');
      return;
    }

    this.isCreating.set(true);
    this.createErrorMessage.set(null);

    const formVal = this.createForm.getRawValue();
    const payload: AdminCreateUserDTO = {
      full_name: formVal.full_name?.trim() || '',
      email: formVal.email?.trim() || '',
      phone: formVal.phone?.trim() || '',
      password: formVal.password?.trim() || '',
    

      is_subscribed: !!formVal.is_subscribed,
    };

    this.userService.createUser(payload)
      .pipe(
        finalize(() => this.isCreating.set(false)),
        catchError((error) => {
          const apiError = this.userService.apiService.extractApiErrorMessage(error);
          this.createErrorMessage.set(apiError || error?.error?.message || error?.message || 'Failed to create user. Please try again.');
          return of(null);
        })
      )
      .subscribe((res) => {
        if (!res) {
          return;
        }
        this.closeCreateModal();
        this.loadUsers();
        if (res.data?.id) {
          this.router.navigate(['/admin/user-management/' + res.data.id + '/edit']);
        }
      });
  }

  // ================= STATUS TOGGLE =================

  openStatusModal(user: User): void {
    this.userToToggleStatus.set(user);
    this.statusErrorMessage.set(null);
    this.isStatusModalOpen.set(true);
  }

  closeStatusModal(): void {
    this.isStatusModalOpen.set(false);
    this.userToToggleStatus.set(null);
  }

  getStatusLabel(status?: string): string {
    return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown';
  }

  isInactive(user: User | null): boolean {
    return user?.status?.toLowerCase() === 'inactive';
  }

  getDisableActionLabel(user: User | null): string {
    return this.isInactive(user) ? 'Enable' : 'Disable';
  }

  getStatusAction(user: User | null): 'active' | 'inactive' {
    return this.isInactive(user) ? 'active' : 'inactive';
  }

  confirmStatusToggle(): void {
    const user = this.userToToggleStatus();
    if (!user) {
      return;
    }

    const nextStatus = this.getStatusAction(user);
    this.isUpdatingStatus.set(true);
    this.statusErrorMessage.set(null);

    this.userService.statusUpdateUser(user.id, nextStatus)
      .pipe(
        finalize(() => this.isUpdatingStatus.set(false)),
        catchError((error) => {
          const apiError = this.userService.apiService.extractApiErrorMessage(error);
          this.statusErrorMessage.set(
            apiError || error?.error?.message || error?.message || `Unable to ${nextStatus === 'active' ? 'enable' : 'disable'} user.`
          );
          return of(null);
        })
      )
      .subscribe((response) => {
        if (!response) {
          return;
        }
        this.closeStatusModal();
        this.loadUsers();
      });
  }

  // ================= PASSWORD RESET =================

  openPasswordResetModal(user: User): void {
    this.userToResetPassword.set(user);
    this.passwordResetForm.reset({ confirm: '' });
    this.passwordResetError.set(null);
    this.isSendingPasswordReset.set(false);
    this.isPasswordResetModalOpen.set(true);
  }

  closePasswordResetModal(): void {
    this.isPasswordResetModalOpen.set(false);
    this.userToResetPassword.set(null);
    this.passwordResetForm.reset({ confirm: '' });
    this.passwordResetError.set(null);
  }

  submitPasswordReset(): void {
    const user = this.userToResetPassword();
    if (!user) {
      return;
    }

    if (this.passwordResetForm.invalid) {
      this.passwordResetForm.markAllAsTouched();
      return;
    }

    const confirmText = this.passwordResetForm.value.confirm?.trim() || 'CONFIRM';
    this.isSendingPasswordReset.set(true);
    this.passwordResetError.set(null);

    this.userService.sendUserPasswordReset(user.id, confirmText)
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
        const successMsg = response.message || `Password reset link has been successfully sent to ${user.email}.`;
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
      case 'vendor':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    }
  }
}

