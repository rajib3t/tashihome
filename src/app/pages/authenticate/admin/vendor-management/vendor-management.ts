import { Component, inject, signal, DestroyRef} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
import { AgreementService } from '../../../../services/agreement/agreement-service';
import { AdminOnboardHostPayload } from '../../../../core/models/agreement.model';
import { AgreementTemplateItem } from '../../../../core/models/agreement-template.model';
import { SettingsService } from '../../../../services/settings/settings-service';
import { TableLoaderComponent } from '../../../../shared/components/ui/table-loader/table-loader.component';

@Component({
  selector: 'app-vendor-management',
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
  templateUrl: './vendor-management.html',
  styleUrl: './vendor-management.css',
})
export class VendorManagement {
  public readonly assetUrl = environment.assetUrl;
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);

  private readonly userService = inject(UserService);
  private readonly agreementService = inject(AgreementService);
  private readonly settingsService = inject(SettingsService);
  private readonly destroyRef = inject(DestroyRef);
  meta!: PaginationMeta;

  // Send Agreement modal state
  readonly isSendAgreementModalOpen = signal<boolean>(false);
  readonly isSendingAgreement = signal<boolean>(false);
  readonly sendAgreementError = signal<string | null>(null);
  readonly sendAgreementSuccess = signal<string | null>(null);
  readonly vendorToSendAgreement = signal<User | VendorDetail | null>(null);

  // Available templates for Send Agreement modal
  readonly availableTemplates = signal<AgreementTemplateItem[]>([]);
  readonly loadingTemplates = signal<boolean>(false);

  // Vendors list for Send Agreement modal
  readonly vendorsList = signal<User[]>([]);
  readonly loadingVendors = signal<boolean>(false);

  // Duplicate Prevention & Version Management
  readonly isDuplicateBlocked = signal<boolean>(false);
  readonly hasPendingAgreement = signal<boolean>(false);
  readonly hasSignedAgreement = signal<boolean>(false);
  readonly pendingAgreementForSelectedVendor = signal<any | null>(null);
  readonly signedAgreementForSelectedVendor = signal<any | null>(null);
  readonly checkingVendorStatus = signal<boolean>(false);
  readonly isAmendmentMode = signal<boolean>(false);
  readonly suggestedNextVersion = signal<string>('1.0');

  readonly sendAgreementForm = this.formBuilder.group({
    vendor_id: ['', [Validators.required]],
    template_id: [''],
    commission_percentage: [10.0, [Validators.required, Validators.min(0), Validators.max(100)]],
    valid_days: [7, [Validators.required, Validators.min(1), Validators.max(90)]],
    version: ['1.0', [Validators.required]],
    custom_notes: [''],
  });

  // Create modal state
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
  // Create vendor / onboard host form
  public createVendorForm = this.formBuilder.group({
    name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50), Validators.pattern(/^[a-zA-Z0-9\s]+$/)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    company_name: [''],
    city: [''],
    address_line1: [''],
    send_agreement: [true],
    commission_percentage: [10.0, [Validators.min(0), Validators.max(100)]],
    agreement_notes: [''],
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
                  .pipe(takeUntilDestroyed(this.destroyRef))
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

      const fv = this.createVendorForm.value;
      const shouldSendAgreement = !!fv.send_agreement;

      if (shouldSendAgreement) {
        const payload: AdminOnboardHostPayload = {
          full_name: fv.name as string,
          email: fv.email as string,
          phone: fv.phone as string,
          company_name: (fv.company_name as string) || undefined,
          city: (fv.city as string) || undefined,
          address_line1: (fv.address_line1 as string) || undefined,
          send_agreement: true,
          commission_percentage: Number(fv.commission_percentage) || 10.0,
          agreement_notes: (fv.agreement_notes as string) || undefined,
        };

        this.agreementService.onboardHost(payload).subscribe({
          next: (res) => {
            this.isCreating.set(false);
            this.closeCreateModal();
            this.createVendorForm.reset({
              name: '',
              email: '',
              phone: '',
              company_name: '',
              city: '',
              address_line1: '',
              send_agreement: true,
              commission_percentage: 10.0,
              agreement_notes: '',
            });
            this.sendAgreementSuccess.set(
              res?.message || 'Host successfully onboarded and partnership agreement dispatched!'
            );
            this.loadVendors();
            const newId = res?.data?.id || res?.data?.vendor?.id;
            if (newId) {
              this.router.navigate(['/admin/vendor-management/' + newId + '/edit']);
            }
          },
          error: (err) => {
            // Fallback to createVendor if onboard route is not available
            const standardPayload: RequestVendor = {
              full_name: fv.name as string,
              email: fv.email as string,
              phone: fv.phone as string,
            };
            this.userService.createVendor(standardPayload).subscribe({
              next: (res) => {
                this.isCreating.set(false);
                this.closeCreateModal();
                this.createVendorForm.reset();
                this.loadVendors();
                this.router.navigate(['/admin/vendor-management/' + res.data.id + '/edit']);
              },
              error: () => {
                this.isCreating.set(false);
                const msg =
                  this.agreementService.extractApiErrorMessage(err) ||
                  'Failed to onboard vendor. Please try again.';
                this.createErrorMessage.set(msg);
              },
            });
          },
        });
      } else {
        const standardPayload: RequestVendor = {
          full_name: fv.name as string,
          email: fv.email as string,
          phone: fv.phone as string,
        };
        this.userService.createVendor(standardPayload).subscribe({
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
          },
        });
      }
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
      .pipe(takeUntilDestroyed(this.destroyRef))
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
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        if (!response) {
          return;
        }
        const successMsg = response.message || `Password reset link has been successfully sent to ${vendor.email}.`;
        this.passwordResetSuccess.set(successMsg);
        this.closePasswordResetModal();
      });
  }

  openSendAgreementModal(
    vendor?: User | VendorDetail,
    isAmendment: boolean = false,
    customVersion?: string
  ): void {
    const defaultValidity = this.settingsService.agreementDefaultValidityDays() || 7;
    const defaultCommission = this.settingsService.commissionPercentage() || 10.0;
    this.isAmendmentMode.set(isAmendment);
    this.sendAgreementError.set(null);
    this.isDuplicateBlocked.set(false);
    this.pendingAgreementForSelectedVendor.set(null);
    this.signedAgreementForSelectedVendor.set(null);
    this.vendorToSendAgreement.set(vendor || null);

    const vendorIdStr = vendor?.id ? String(vendor.id) : '';

    if (vendor) {
      const exists = this.vendorsList().some((v) => String(v.id) === String(vendor.id));
      if (!exists) {
        this.vendorsList.update((list) => [vendor as User, ...list]);
      }
    }

    this.sendAgreementForm.reset({
      vendor_id: vendorIdStr,
      template_id: '',
      commission_percentage: defaultCommission,
      valid_days: defaultValidity,
      version: customVersion || '1.0',
      custom_notes: '',
    });

    if (vendorIdStr) {
      this.checkVendorAgreements(vendorIdStr, customVersion);
    }

    this.isSendAgreementModalOpen.set(true);
    this.loadTemplatesForModal();

    if (this.vendorsList().length === 0 || !vendor) {
      this.loadVendorsForModal(vendorIdStr);
    }
  }

  onVendorSelectChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const vendorId = target.value;
    const found = this.vendorsList().find((v) => String(v.id) === String(vendorId));
    this.vendorToSendAgreement.set(found || null);
    this.checkVendorAgreements(vendorId);
  }

  checkVendorAgreements(vendorId: string, explicitVersion?: string): void {
    if (!vendorId) {
      this.isDuplicateBlocked.set(false);
      this.hasPendingAgreement.set(false);
      this.hasSignedAgreement.set(false);
      this.pendingAgreementForSelectedVendor.set(null);
      this.signedAgreementForSelectedVendor.set(null);
      this.isAmendmentMode.set(false);
      this.suggestedNextVersion.set('1.0');
      this.sendAgreementError.set(null);
      return;
    }

    this.checkingVendorStatus.set(true);
    this.sendAgreementError.set(null);

    this.agreementService
      .getVendorAgreementStatus(vendorId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.checkingVendorStatus.set(false))
      )
      .subscribe({
        next: (status) => {
          const pending = status?.pending_agreement || null;
          const signed = status?.signed_agreement || null;

          this.hasPendingAgreement.set(!!status?.has_pending);
          this.pendingAgreementForSelectedVendor.set(pending);

          this.hasSignedAgreement.set(!!status?.has_signed);
          this.signedAgreementForSelectedVendor.set(signed);

          this.isDuplicateBlocked.set(false);

          if (explicitVersion) {
            this.suggestedNextVersion.set(explicitVersion);
            this.isAmendmentMode.set(true);
            this.sendAgreementForm.patchValue({ version: explicitVersion });
          } else if (status?.has_signed) {
            const nextVer = status?.suggested_next_version || '2.0';
            this.suggestedNextVersion.set(nextVer);
            this.isAmendmentMode.set(true);
            this.sendAgreementForm.patchValue({
              version: nextVer,
              custom_notes: `Amendment v${nextVer} (Supersedes v${signed?.version || '1.0'} upon execution)`,
            });
          } else if (status?.has_pending) {
            const curVer = pending?.version || '1.0';
            this.suggestedNextVersion.set(curVer);
            this.isAmendmentMode.set(false);
            this.sendAgreementForm.patchValue({ version: curVer });
          } else {
            this.suggestedNextVersion.set('1.0');
            this.isAmendmentMode.set(false);
            this.sendAgreementForm.patchValue({ version: '1.0' });
          }
        },
        error: () => {
          this.hasPendingAgreement.set(false);
          this.hasSignedAgreement.set(false);
        },
      });
  }

  resendPendingFromModal(): void {
    const pending = this.pendingAgreementForSelectedVendor();
    if (!pending) return;

    this.isSendingAgreement.set(true);
    this.agreementService
      .resendAgreement(pending.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSendingAgreement.set(false))
      )
      .subscribe({
        next: () => {
          this.sendAgreementSuccess.set(
            `Pending agreement invitation (v${pending.version || '1.0'}) successfully resent to host.`
          );
          this.closeSendAgreementModal();
        },
        error: (err) => {
          const msg = this.agreementService.extractApiErrorMessage(err) || 'Failed to resend agreement.';
          this.sendAgreementError.set(msg);
        },
      });
  }

  private loadVendorsForModal(preselectedId?: string): void {
    this.loadingVendors.set(true);
    this.userService
      .getVendors({ page: 1, size: 100 })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingVendors.set(false))
      )
      .subscribe({
        next: (res) => {
          const fetched = res.data || [];
          const targetId = preselectedId || this.sendAgreementForm.get('vendor_id')?.value;
          const currentSelectedVendor = this.vendorsList().find(
            (v) => String(v.id) === String(targetId)
          );
          if (
            currentSelectedVendor &&
            !fetched.some((v) => String(v.id) === String(currentSelectedVendor.id))
          ) {
            this.vendorsList.set([currentSelectedVendor, ...fetched]);
          } else {
            this.vendorsList.set(fetched);
          }

          if (targetId) {
            this.sendAgreementForm.patchValue({ vendor_id: String(targetId) });
          }
        },
        error: () => {
          // Fallback
        },
      });
  }

  private loadTemplatesForModal(): void {
    this.loadingTemplates.set(true);
    this.agreementService
      .getAgreementTemplates({ status: 'active', size: 100 })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingTemplates.set(false))
      )
      .subscribe({
        next: (res) => {
          const list = res?.data || [];
          this.availableTemplates.set(list);
          const def = list.find((t) => t.is_default);
          if (def && !this.sendAgreementForm.get('template_id')?.value) {
            this.sendAgreementForm.patchValue({ template_id: def.id });
          }
        },
        error: () => {
          // Fallback
        },
      });
  }

  closeSendAgreementModal(): void {
    this.isSendAgreementModalOpen.set(false);
    this.isDuplicateBlocked.set(false);
    this.hasPendingAgreement.set(false);
    this.hasSignedAgreement.set(false);
    this.pendingAgreementForSelectedVendor.set(null);
    this.signedAgreementForSelectedVendor.set(null);
    this.isAmendmentMode.set(false);
    this.sendAgreementError.set(null);
    this.vendorToSendAgreement.set(null);
  }

  submitSendAgreement(): void {
    if (this.sendAgreementForm.invalid) {
      this.sendAgreementForm.markAllAsTouched();
      return;
    }

    const { vendor_id, template_id, commission_percentage, valid_days, version, custom_notes } =
      this.sendAgreementForm.getRawValue();

    if (!vendor_id) return;

    const hadPending = this.hasPendingAgreement();

    this.isSendingAgreement.set(true);
    this.sendAgreementError.set(null);

    const fullNotes = version && !custom_notes?.includes(`v${version}`)
      ? `[Agreement Version: v${version}] ${custom_notes || ''}`.trim()
      : custom_notes || undefined;

    this.agreementService
      .sendAgreementToVendor(vendor_id, {
        commission_percentage: Number(commission_percentage) || this.settingsService.commissionPercentage() || 10.0,
        valid_days: Number(valid_days) || 7,
        version: version || '1.0',
        custom_notes: fullNotes,
        template_id: template_id || undefined,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSendingAgreement.set(false))
      )
      .subscribe({
        next: (res) => {
          this.sendAgreementSuccess.set(
            hadPending
              ? `New agreement (v${version || '1.0'}) dispatched successfully! Previous pending invitation was superseded.`
              : (res?.message || `Host Partnership Agreement (v${version || '1.0'}) sent successfully to host!`)
          );
          this.closeSendAgreementModal();
        },
        error: (err) => {
          const msg =
            this.agreementService.extractApiErrorMessage(err) ||
            err?.error?.message ||
            'Failed to send agreement to vendor. Please check details and retry.';
          this.sendAgreementError.set(msg);
        },
      });
  }
}

