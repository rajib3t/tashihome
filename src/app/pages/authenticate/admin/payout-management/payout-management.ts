import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, finalize, of } from 'rxjs';
import { PaginationMeta } from '../../../../services/api/api-response.model';
import {
  BankAccountType,
  CreateBankAccountPayload,
  CreatePayoutPayload,
  Payout,
  PayoutMode,
  PayoutStatus,
  ProcessPayoutPayload,
  RazorpayContactResponse,
  VendorBankAccount,
  VendorEarningsSummary,
} from '../../../../services/payout/payout.model';
import { PayoutService } from '../../../../services/payout/payout-service';
import { UserService } from '../../../../services/user/user-service';
import { User } from '../../../../services/user/user.model';
import { SettingsService } from '../../../../services/settings/settings-service';
import { PageBreadcrumb } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb';
import { Card } from '../../../../shared/components/ui/card/card';
import { Modal } from '../../../../shared/components/ui/modal/modal';
import { Pagination } from '../../../../shared/components/ui/pagination/pagination';

export type PayoutActionType = 'process' | 'sync' | 'cancel' | 'retry';

@Component({
  selector: 'app-payout-management',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PageBreadcrumb,
    Card,
    Modal,
    Pagination,
  ],
  templateUrl: './payout-management.html',
  styleUrl: './payout-management.css',
})
export class PayoutManagement implements OnInit, OnDestroy {
  private readonly payoutApi = inject(PayoutService);
  private readonly userApi = inject(UserService);
  private readonly settings = inject(SettingsService);
  private readonly fb = inject(FormBuilder);

  // ── List & Pagination State ────────────────────────────────────────────────
  readonly payouts = signal<Payout[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly currentPage = signal(1);
  readonly pageSize = signal(10);
  readonly sortOrder = signal<'desc' | 'asc'>('desc');
  meta: PaginationMeta = { total: 0, page: 1, size: 10 };
  readonly pageSizeOptions = [10, 20, 30, 50];

  // ── Search & Filter Form ───────────────────────────────────────────────────
  readonly activeStatusTab = signal<'' | PayoutStatus>('');
  readonly searchForm = this.fb.group({
    search: [''],
    status: [''],
    vendor_id: [''],
    period_start: [''],
    period_end: [''],
  });

  // ── Vendors List for Dropdowns ─────────────────────────────────────────────
  readonly vendors = signal<User[]>([]);
  readonly isLoadingVendors = signal(false);

  // ── Metrics / KPI Cards (computed across current batch & total) ───────────
  readonly metrics = computed(() => {
    const list = this.payouts();
    const totalDisbursed = list
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const pendingList = list.filter((p) => p.status === 'pending');
    const pendingAmount = pendingList.reduce((sum, p) => sum + (p.amount || 0), 0);
    const pendingCount = pendingList.length;

    const processingList = list.filter((p) => p.status === 'processing');
    const processingAmount = processingList.reduce((sum, p) => sum + (p.amount || 0), 0);
    const processingCount = processingList.length;

    const queuedList = list.filter((p) => p.status === 'queued');
    const queuedAmount = queuedList.reduce((sum, p) => sum + (p.amount || 0), 0);
    const queuedCount = queuedList.length;

    const failedList = list.filter((p) =>
      ['failed', 'rejected', 'reversed'].includes(p.status)
    );
    const failedAmount = failedList.reduce((sum, p) => sum + (p.amount || 0), 0);
    const failedCount = failedList.length;

    return {
      totalDisbursed,
      pendingAmount,
      pendingCount,
      processingAmount,
      processingCount,
      queuedAmount,
      queuedCount,
      failedAmount,
      failedCount,
    };
  });

  // ── Create Payout Modal State & Forms ──────────────────────────────────────
  readonly isCreateModalOpen = signal(false);
  readonly isCalculatingDues = signal(false);
  readonly duesCalculation = signal<VendorEarningsSummary | null>(null);
  readonly duesCalculationError = signal('');
  readonly isCreatingPayout = signal(false);
  readonly createPayoutError = signal('');

  readonly vendorBankAccounts = signal<VendorBankAccount[]>([]);
  readonly isLoadingBankAccounts = signal(false);

  readonly selectedCreateAccount = computed(() => {
    const accountId = this.createPayoutForm.get('bank_account_id')?.value;
    if (!accountId) return null;
    return this.vendorBankAccounts().find((a) => this.getBankAccountId(a) === accountId) || null;
  });

  readonly createPayoutForm: FormGroup = this.fb.group({
    vendor_id: ['', [Validators.required]],
    period_start: ['', [Validators.required]],
    period_end: ['', [Validators.required]],
    commission_percentage: [10.0, [Validators.required, Validators.min(0), Validators.max(100)]],
    gross_amount: [0],
    commission_amount: [0],
    amount: [0, [Validators.required, Validators.min(1)]],
    bank_account_id: [''],
    mode: ['NEFT' as PayoutMode, [Validators.required]],
    notes: [''],
  });

  // ── Details Drawer / Modal State ───────────────────────────────────────────
  readonly isDetailDrawerOpen = signal(false);
  readonly selectedPayout = signal<Payout | null>(null);
  readonly isSyncingDetail = signal(false);

  // ── Vendor Razorpay & Fund Accounts Manager State ─────────────────────────
  readonly isVendorManagerOpen = signal(false);
  readonly selectedVendorIdForManager = signal<string>('');
  readonly selectedVendorForManager = computed(() => {
    const id = this.selectedVendorIdForManager();
    return this.vendors().find((v) => this.getUserId(v) === id) || null;
  });
  readonly managerBankAccounts = signal<VendorBankAccount[]>([]);
  readonly isLoadingManagerAccounts = signal(false);
  readonly isCreatingRazorpayContact = signal(false);
  readonly managerContactError = signal('');
  readonly managerAccountError = signal('');
  readonly isSettingPrimaryId = signal<string | null>(null);
  readonly isDeleteAccountModalOpen = signal(false);
  readonly deleteAccountTarget = signal<VendorBankAccount | null>(null);
  readonly isDeletingAccount = signal(false);
  readonly deleteAccountError = signal('');
  readonly isAddAccountInManagerOpen = signal(false);
  readonly vendorRazorpayContactId = computed(() => {
    const list = this.managerBankAccounts();
    const withContact = list.find((a) => a.razorpay_contact_id);
    return withContact?.razorpay_contact_id || null;
  });

  // ── Bank Account Management Modal State ────────────────────────────────────
  readonly isBankModalOpen = signal(false);
  readonly bankModalVendorId = signal<string>('');
  readonly bankModalVendorName = signal<string>('');
  readonly isSavingBankAccount = signal(false);
  readonly bankAccountError = signal('');

  readonly bankAccountForm: FormGroup = this.fb.group({
    account_type: ['bank_account' as BankAccountType, [Validators.required]],
    account_holder_name: ['', [Validators.required, Validators.minLength(2)]],
    bank_name: [''],
    account_number: [''],
    confirm_account_number: [''],
    ifsc_code: [''],
    branch_name: [''],
    upi_id: [''],
    is_primary: [true],
  });

  // ── Action Confirmation Dialog State ───────────────────────────────────────
  readonly isActionModalOpen = signal(false);
  readonly actionPayout = signal<Payout | null>(null);
  readonly actionType = signal<PayoutActionType | null>(null);
  readonly isProcessingAction = signal(false);
  readonly actionErrorMessage = signal('');

  // Process / Disburse action form (narration max 30 chars, mode override)
  readonly processActionForm: FormGroup = this.fb.group({
    mode: ['NEFT' as PayoutMode],
    narration: ['', [Validators.maxLength(30)]],
    purpose: ['payout'],
  });

  // ── Receipt Modal State ────────────────────────────────────────────────────
  readonly isReceiptModalOpen = signal(false);
  readonly receiptPayout = signal<Payout | null>(null);

  // ── Clipboard & Feedback ───────────────────────────────────────────────────
  readonly copiedKey = signal<string | null>(null);
  private copyTimeout: any = null;
  private messageTimeout: any = null;

  readonly availableStatuses: PayoutStatus[] = [
    'pending',
    'processing',
    'queued',
    'paid',
    'failed',
    'reversed',
    'rejected',
    'cancelled',
  ];

  readonly paymentModes: PayoutMode[] = ['NEFT', 'IMPS', 'RTGS', 'UPI'];

  ngOnInit(): void {
    this.initDefaultDates();
    this.loadVendorsList();
    this.loadPayouts();
  }

  ngOnDestroy(): void {
    if (this.copyTimeout) clearTimeout(this.copyTimeout);
    if (this.messageTimeout) clearTimeout(this.messageTimeout);
  }

  // ── Helper Getters for Safe IDs ──────────────────────────────────────────
  getPayoutId(payout: Payout | null | undefined): string {
    return payout?.id || payout?.public_id || '';
  }

  getBankAccountId(account: VendorBankAccount | null | undefined): string {
    return account?.id || account?.public_id || '';
  }

  getUserId(user: User | null | undefined): string {
    return user?.id || (user as any)?.public_id || '';
  }

  private initDefaultDates(): void {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const formatYMD = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    this.createPayoutForm.patchValue({
      period_start: formatYMD(firstDay),
      period_end: formatYMD(lastDay),
    });
  }

  // ── Load Data ──────────────────────────────────────────────────────────────
  loadVendorsList(): void {
    this.isLoadingVendors.set(true);
    this.userApi
      .getVendors({ page: 1, size: 100 })
      .pipe(
        finalize(() => this.isLoadingVendors.set(false)),
        catchError(() => of(null))
      )
      .subscribe((res) => {
        if (res && res.data) {
          this.vendors.set(res.data);
        }
      });
  }

  loadPayouts(): void {
    const filters = this.searchForm.getRawValue();
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.payoutApi
      .getPayouts({
        page: this.currentPage(),
        size: this.pageSize(),
        sort_order: this.sortOrder(),
        status: (filters.status || undefined) as PayoutStatus | undefined,
        vendor_id: filters.vendor_id?.trim() || undefined,
        period_start: filters.period_start?.trim() || undefined,
        period_end: filters.period_end?.trim() || undefined,
        search: filters.search?.trim() || undefined,
      })
      .pipe(
        finalize(() => this.isLoading.set(false)),
        catchError((error) => {
          const msg =
            error?.error?.message ||
            error?.message ||
            'Unable to load payouts. Please try again.';
          this.errorMessage.set(msg);
          this.payouts.set([]);
          return of(null);
        })
      )
      .subscribe((response) => {
        if (!response) return;
        const list = Array.isArray(response.data)
          ? response.data
          : (response as any).data?.payouts || [];
        this.payouts.set(list);
        this.meta = response.meta || {
          total: list.length,
          page: this.currentPage(),
          size: this.pageSize(),
        };
      });
  }

  // ── Search & Filter Actions ────────────────────────────────────────────────
  onSearch(): void {
    const statusVal = (this.searchForm.get('status')?.value || '') as '' | PayoutStatus;
    this.activeStatusTab.set(statusVal);
    this.currentPage.set(1);
    this.loadPayouts();
  }

  onReset(): void {
    this.searchForm.reset({
      search: '',
      status: '',
      vendor_id: '',
      period_start: '',
      period_end: '',
    });
    this.activeStatusTab.set('');
    this.currentPage.set(1);
    this.loadPayouts();
  }

  onStatusTabChange(status: '' | PayoutStatus): void {
    this.activeStatusTab.set(status);
    this.searchForm.patchValue({ status });
    this.currentPage.set(1);
    this.loadPayouts();
  }

  toggleSort(): void {
    this.sortOrder.set(this.sortOrder() === 'desc' ? 'asc' : 'desc');
    this.loadPayouts();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadPayouts();
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
    this.loadPayouts();
  }

  refreshList(): void {
    this.loadPayouts();
    this.showSuccess('Payout list refreshed.');
  }

  // ── Create Payout & Dues Calculator ────────────────────────────────────────
  openCreateModal(): void {
    this.initDefaultDates();
    this.duesCalculation.set(null);
    this.duesCalculationError.set('');
    this.createPayoutError.set('');
    this.vendorBankAccounts.set([]);
    this.createPayoutForm.patchValue({
      vendor_id: '',
      commission_percentage: 10.0,
      gross_amount: 0,
      commission_amount: 0,
      amount: 0,
      bank_account_id: '',
      mode: 'NEFT',
      notes: '',
    });
    this.createPayoutForm.markAsUntouched();
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal(): void {
    if (this.isCreatingPayout()) return;
    this.isCreateModalOpen.set(false);
    this.duesCalculation.set(null);
    this.duesCalculationError.set('');
    this.createPayoutError.set('');
  }

  onVendorSelected(): void {
    const vendorId = this.createPayoutForm.get('vendor_id')?.value;
    if (!vendorId) {
      this.vendorBankAccounts.set([]);
      this.createPayoutForm.patchValue({ bank_account_id: '' });
      return;
    }

    this.loadVendorAccounts(vendorId);
  }

  loadVendorAccounts(vendorId: string, autoSelectPrimary = true): void {
    this.isLoadingBankAccounts.set(true);
    this.payoutApi
      .getVendorBankAccounts(vendorId)
      .pipe(
        finalize(() => this.isLoadingBankAccounts.set(false)),
        catchError(() => of(null))
      )
      .subscribe((res) => {
        if (res && res.data) {
          const accounts = Array.isArray(res.data) ? res.data : [];
          this.vendorBankAccounts.set(accounts);

          if (autoSelectPrimary && accounts.length > 0) {
            const primary = accounts.find((a) => a.is_primary) || accounts[0];
            this.createPayoutForm.patchValue({ bank_account_id: this.getBankAccountId(primary) });
          }
        } else {
          this.vendorBankAccounts.set([]);
        }
      });
  }

  calculateDues(): void {
    const formVal = this.createPayoutForm.getRawValue();
    const vendorId = formVal.vendor_id;
    if (!vendorId) {
      this.duesCalculationError.set('Please select a vendor first.');
      return;
    }

    this.isCalculatingDues.set(true);
    this.duesCalculationError.set('');
    this.createPayoutError.set('');

    this.payoutApi
      .calculateEligibleDues({
        vendor_id: vendorId,
        period_start: formVal.period_start || undefined,
        period_end: formVal.period_end || undefined,
        commission_percentage: Number(formVal.commission_percentage) || 10.0,
      })
      .pipe(
        finalize(() => this.isCalculatingDues.set(false)),
        catchError((error) => {
          const msg =
            error?.error?.message ||
            error?.message ||
            'Unable to calculate eligible dues for this vendor and period.';
          this.duesCalculationError.set(msg);
          this.duesCalculation.set(null);
          return of(null);
        })
      )
      .subscribe((res) => {
        if (!res || !res.data) return;
        const summary = res.data;
        this.duesCalculation.set(summary);

        this.createPayoutForm.patchValue({
          gross_amount: summary.gross_booking_amount,
          commission_amount: summary.commission_amount,
          amount: summary.pending_payable_amount,
          notes: `Settlement for ${this.formatDate(formVal.period_start)} to ${this.formatDate(formVal.period_end)}`,
        });

        // If no bank accounts loaded yet, fetch them
        if (this.vendorBankAccounts().length === 0) {
          this.loadVendorAccounts(vendorId);
        }
      });
  }

  onGrossAmountInput(): void {
    const gross = Number(this.createPayoutForm.get('gross_amount')?.value) || 0;
    const pct = Number(this.createPayoutForm.get('commission_percentage')?.value) || 0;
    const comm = Number(((gross * pct) / 100).toFixed(2));
    const net = Number((gross - comm).toFixed(2));
    this.createPayoutForm.patchValue(
      {
        commission_amount: comm,
        amount: net > 0 ? net : 0,
      },
      { emitEvent: false }
    );
  }

  onNetAmountInput(): void {
    const net = Number(this.createPayoutForm.get('amount')?.value) || 0;
    const pct = Number(this.createPayoutForm.get('commission_percentage')?.value) || 0;
    if (pct > 0 && pct < 100) {
      const gross = Number((net / (1 - pct / 100)).toFixed(2));
      const comm = Number((gross - net).toFixed(2));
      this.createPayoutForm.patchValue(
        {
          gross_amount: gross,
          commission_amount: comm,
        },
        { emitEvent: false }
      );
    } else {
      this.createPayoutForm.patchValue(
        {
          gross_amount: net,
          commission_amount: 0,
        },
        { emitEvent: false }
      );
    }
  }

  onCommissionPercentageInput(): void {
    const gross = Number(this.createPayoutForm.get('gross_amount')?.value) || 0;
    const net = Number(this.createPayoutForm.get('amount')?.value) || 0;
    const pct = Number(this.createPayoutForm.get('commission_percentage')?.value) || 0;

    if (gross > 0) {
      const comm = Number(((gross * pct) / 100).toFixed(2));
      const newNet = Number((gross - comm).toFixed(2));
      this.createPayoutForm.patchValue(
        {
          commission_amount: comm,
          amount: newNet > 0 ? newNet : 0,
        },
        { emitEvent: false }
      );
    } else if (net > 0 && pct > 0 && pct < 100) {
      const newGross = Number((net / (1 - pct / 100)).toFixed(2));
      const comm = Number((newGross - net).toFixed(2));
      this.createPayoutForm.patchValue(
        {
          gross_amount: newGross,
          commission_amount: comm,
        },
        { emitEvent: false }
      );
    }
  }

  submitCreatePayout(disburseImmediately = false): void {
    if (this.createPayoutForm.invalid) {
      this.createPayoutForm.markAllAsTouched();
      this.createPayoutError.set('Please fill in all required fields.');
      return;
    }

    const val = this.createPayoutForm.getRawValue();
    if (!val.bank_account_id && this.vendorBankAccounts().length > 0) {
      const primary = this.vendorBankAccounts().find((a) => a.is_primary) || this.vendorBankAccounts()[0];
      val.bank_account_id = this.getBankAccountId(primary);
    }

    if (!val.bank_account_id) {
      this.createPayoutError.set('Destination bank account is required. Please add or select a bank account.');
      return;
    }

    const commissionPct = Number(val.commission_percentage) || 0;
    let grossAmt = Number(val.gross_amount) || 0;
    let netAmt = Number(val.amount) || 0;
    let commissionAmt = Number(val.commission_amount) || 0;

    if (grossAmt === 0 && netAmt > 0) {
      if (commissionPct > 0 && commissionPct < 100) {
        grossAmt = Number((netAmt / (1 - commissionPct / 100)).toFixed(2));
        commissionAmt = Number((grossAmt - netAmt).toFixed(2));
      } else {
        grossAmt = netAmt;
        commissionAmt = 0;
      }
    } else if (grossAmt > 0 && commissionAmt === 0 && commissionPct > 0) {
      commissionAmt = Number(((grossAmt * commissionPct) / 100).toFixed(2));
      if (netAmt === 0) {
        netAmt = Number((grossAmt - commissionAmt).toFixed(2));
      }
    }

    const payload: CreatePayoutPayload = {
      vendor_id: val.vendor_id,
      bank_account_id: val.bank_account_id || undefined,
      gross_amount: grossAmt,
      commission_amount: commissionAmt,
      commission_percentage: commissionPct,
      amount: netAmt,
      currency: 'INR',
      period_start: val.period_start,
      period_end: val.period_end,
      mode: val.mode || 'NEFT',
      notes: val.notes?.trim() || undefined,
    };

    this.isCreatingPayout.set(true);
    this.createPayoutError.set('');

    this.payoutApi
      .createPayout(payload)
      .pipe(
        catchError((error) => {
          this.isCreatingPayout.set(false);
          const errCode = error?.error?.code || error?.error?.error_code;
          if (errCode === 'VENDOR_BANK_ACCOUNT_MISSING' || errCode === 'BANK_ACCOUNT_NOT_FOUND') {
            this.createPayoutError.set('Vendor has no bank account configured. Please add bank details first.');
            this.openBankModalFromCreate();
          } else {
            const msg =
              error?.error?.message ||
              error?.message ||
              'Failed to generate payout record.';
            this.createPayoutError.set(msg);
          }
          return of(null);
        })
      )
      .subscribe((res) => {
        if (!res || !res.data) {
          this.isCreatingPayout.set(false);
          return;
        }

        const createdPayout = res.data;
        const payoutId = this.getPayoutId(createdPayout);

        if (disburseImmediately && payoutId) {
          // Immediately process payout
          const narrationText = `Payout ${payoutId.slice(0, 8)}`.slice(0, 30);
          this.payoutApi
            .processPayout(payoutId, {
              mode: val.mode,
              narration: narrationText,
            })
            .pipe(
              finalize(() => this.isCreatingPayout.set(false)),
              catchError((procErr) => {
                const msg = procErr?.error?.message || procErr?.message || 'Immediate processing failed.';
                this.showSuccess(`Payout saved as Pending, but processing failed: ${msg}. You can retry from the table.`);
                this.closeCreateModal();
                this.loadPayouts();
                return of(null);
              })
            )
            .subscribe((procRes) => {
              if (procRes) {
                this.showSuccess(
                  procRes?.message || 'Payout created and submitted to RazorpayX successfully!'
                );
              }
              this.closeCreateModal();
              this.loadPayouts();
            });
        } else {
          this.isCreatingPayout.set(false);
          this.showSuccess('Payout generated and saved as Pending successfully.');
          this.closeCreateModal();
          this.loadPayouts();
        }
      });
  }

  // ── Details Drawer ─────────────────────────────────────────────────────────
  openDetailDrawer(payout: Payout): void {
    this.selectedPayout.set(payout);
    this.isDetailDrawerOpen.set(true);
  }

  closeDetailDrawer(): void {
    this.isDetailDrawerOpen.set(false);
    this.selectedPayout.set(null);
  }

  syncDetailPayout(): void {
    const payout = this.selectedPayout();
    const payoutId = this.getPayoutId(payout);
    if (!payoutId) return;

    this.isSyncingDetail.set(true);
    this.payoutApi
      .syncPayout(payoutId)
      .pipe(
        finalize(() => this.isSyncingDetail.set(false)),
        catchError((error) => {
          this.showError(
            error?.error?.message || error?.message || 'Failed to sync payout status with gateway.'
          );
          return of(null);
        })
      )
      .subscribe((res) => {
        if (!res || !res.data) return;
        this.selectedPayout.set(res.data);
        this.showSuccess(res.message || 'Payout status synchronized with Razorpay.');
        this.loadPayouts();
      });
  }

  // ── Vendor Razorpay & Fund Accounts Manager ──────────────────────────────
  openVendorManager(vendorId?: string): void {
    let targetVendorId = vendorId || this.createPayoutForm.get('vendor_id')?.value || '';
    if (!targetVendorId && this.vendors().length > 0) {
      targetVendorId = this.getUserId(this.vendors()[0]);
    }

    this.selectedVendorIdForManager.set(targetVendorId);
    this.managerContactError.set('');
    this.managerAccountError.set('');
    this.isAddAccountInManagerOpen.set(false);
    this.isVendorManagerOpen.set(true);

    if (targetVendorId) {
      this.loadManagerVendorAccounts(targetVendorId);
    } else {
      this.managerBankAccounts.set([]);
    }
  }

  closeVendorManager(): void {
    this.isVendorManagerOpen.set(false);
    this.isAddAccountInManagerOpen.set(false);
    this.managerContactError.set('');
    this.managerAccountError.set('');
  }

  onSelectVendorInManager(vendorId: string): void {
    this.selectedVendorIdForManager.set(vendorId);
    this.isAddAccountInManagerOpen.set(false);
    this.managerContactError.set('');
    this.managerAccountError.set('');

    if (vendorId) {
      this.loadManagerVendorAccounts(vendorId);
    } else {
      this.managerBankAccounts.set([]);
    }
  }

  loadManagerVendorAccounts(vendorId: string): void {
    if (!vendorId) {
      this.managerBankAccounts.set([]);
      return;
    }

    this.isLoadingManagerAccounts.set(true);
    this.managerAccountError.set('');

    this.payoutApi
      .getVendorBankAccounts(vendorId)
      .pipe(
        finalize(() => this.isLoadingManagerAccounts.set(false)),
        catchError((err) => {
          this.managerAccountError.set(
            err?.error?.message || err?.message || 'Failed to load vendor accounts.'
          );
          return of(null);
        })
      )
      .subscribe((res) => {
        if (res && res.data) {
          const accounts = Array.isArray(res.data) ? res.data : [];
          this.managerBankAccounts.set(accounts);
        } else {
          this.managerBankAccounts.set([]);
        }
      });
  }

  createOrSyncRazorpayContact(vendorId?: string): void {
    const targetId = vendorId || this.selectedVendorIdForManager();
    if (!targetId) {
      this.managerContactError.set('Please select a vendor first.');
      return;
    }

    this.isCreatingRazorpayContact.set(true);
    this.managerContactError.set('');

    this.payoutApi
      .createVendorRazorpayContact(targetId)
      .pipe(
        finalize(() => this.isCreatingRazorpayContact.set(false)),
        catchError((err) => {
          const msg =
            err?.error?.message ||
            err?.message ||
            'Unable to create or sync Razorpay Contact.';
          this.managerContactError.set(msg);
          return of(null);
        })
      )
      .subscribe((res) => {
        if (!res || !res.data) return;
        const data = res.data;
        const contactId = data.id || 'Active';

        if (data.already_exists) {
          this.showSuccess(`Razorpay contact already exists — using existing contact (${contactId}).`);
        } else {
          this.showSuccess(`Razorpay Contact created / verified successfully! Contact ID: ${contactId}`);
        }

        this.loadManagerVendorAccounts(targetId);

        // Also refresh create modal accounts if open
        if (this.createPayoutForm.get('vendor_id')?.value === targetId) {
          this.loadVendorAccounts(targetId, false);
        }
      });
  }

  setAccountAsPrimary(account: VendorBankAccount): void {
    const vendorId = this.selectedVendorIdForManager() || this.createPayoutForm.get('vendor_id')?.value;
    const accountId = this.getBankAccountId(account);
    if (!vendorId || !accountId) return;

    this.isSettingPrimaryId.set(accountId);
    this.managerAccountError.set('');

    this.payoutApi
      .setPrimaryVendorBankAccount(vendorId, accountId)
      .pipe(
        finalize(() => this.isSettingPrimaryId.set(null)),
        catchError((err) => {
          const msg =
            err?.error?.message ||
            err?.message ||
            'Failed to set account as primary.';
          this.managerAccountError.set(msg);
          return of(null);
        })
      )
      .subscribe((res) => {
        if (!res) return;
        this.showSuccess('Primary payout account updated successfully.');

        // Update local arrays
        this.managerBankAccounts.update((list) =>
          list.map((a) => ({
            ...a,
            is_primary: this.getBankAccountId(a) === accountId,
          }))
        );

        if (this.createPayoutForm.get('vendor_id')?.value === vendorId) {
          this.vendorBankAccounts.update((list) =>
            list.map((a) => ({
              ...a,
              is_primary: this.getBankAccountId(a) === accountId,
            }))
          );
          this.createPayoutForm.patchValue({ bank_account_id: accountId });
        }
      });
  }

  openDeleteAccountModal(account: VendorBankAccount): void {
    this.deleteAccountTarget.set(account);
    this.deleteAccountError.set('');
    this.isDeleteAccountModalOpen.set(true);
  }

  closeDeleteAccountModal(): void {
    if (this.isDeletingAccount()) return;
    this.isDeleteAccountModalOpen.set(false);
    this.deleteAccountTarget.set(null);
    this.deleteAccountError.set('');
  }

  confirmDeleteAccount(): void {
    const target = this.deleteAccountTarget();
    const targetId = this.getBankAccountId(target);
    const vendorId = this.selectedVendorIdForManager() || this.createPayoutForm.get('vendor_id')?.value;
    if (!target || !targetId || !vendorId) return;

    this.isDeletingAccount.set(true);
    this.deleteAccountError.set('');

    this.payoutApi
      .deleteVendorBankAccount(vendorId, targetId)
      .pipe(
        finalize(() => this.isDeletingAccount.set(false)),
        catchError((err) => {
          const msg =
            err?.error?.message ||
            err?.message ||
            'Failed to delete vendor bank account.';
          this.deleteAccountError.set(msg);
          return of(null);
        })
      )
      .subscribe((res) => {
        if (!res) return;
        this.showSuccess('Bank account removed successfully.');
        this.closeDeleteAccountModal();

        // Update local lists
        this.managerBankAccounts.update((list) =>
          list.filter((a) => this.getBankAccountId(a) !== targetId)
        );

        if (this.createPayoutForm.get('vendor_id')?.value === vendorId) {
          this.vendorBankAccounts.update((list) =>
            list.filter((a) => this.getBankAccountId(a) !== targetId)
          );
          if (this.createPayoutForm.get('bank_account_id')?.value === targetId) {
            const nextPrimary = this.vendorBankAccounts().find((a) => a.is_primary) || this.vendorBankAccounts()[0];
            this.createPayoutForm.patchValue({ bank_account_id: this.getBankAccountId(nextPrimary) });
          }
        }
      });
  }

  toggleAddAccountInManager(): void {
    const nextState = !this.isAddAccountInManagerOpen();
    this.isAddAccountInManagerOpen.set(nextState);

    if (nextState) {
      const vendor = this.selectedVendorForManager();
      const vendorName = vendor?.full_name || vendor?.email || '';
      this.bankAccountError.set('');
      this.bankAccountForm.reset({
        account_type: 'bank_account',
        account_holder_name: vendorName,
        bank_name: '',
        account_number: '',
        confirm_account_number: '',
        ifsc_code: '',
        branch_name: '',
        upi_id: '',
        is_primary: this.managerBankAccounts().length === 0,
      });
    }
  }

  // ── Bank Account Management Modal ──────────────────────────────────────────
  openBankModalFromCreate(): void {
    const vendorId = this.createPayoutForm.get('vendor_id')?.value;
    if (!vendorId) {
      this.createPayoutError.set('Please select a vendor first before adding bank details.');
      return;
    }
    const vendorObj = this.vendors().find((v) => this.getUserId(v) === vendorId);
    this.openBankModal(vendorId, vendorObj?.full_name || vendorObj?.email || 'Vendor');
  }

  openBankModal(vendorId: string, vendorName: string): void {
    this.bankModalVendorId.set(vendorId);
    this.bankModalVendorName.set(vendorName);
    this.bankAccountError.set('');
    this.bankAccountForm.reset({
      account_type: 'bank_account',
      account_holder_name: vendorName || '',
      bank_name: '',
      account_number: '',
      confirm_account_number: '',
      ifsc_code: '',
      branch_name: '',
      upi_id: '',
      is_primary: true,
    });
    this.isBankModalOpen.set(true);
  }

  closeBankModal(): void {
    if (this.isSavingBankAccount()) return;
    this.isBankModalOpen.set(false);
    this.bankAccountError.set('');
  }

  onAccountTypeChange(type: BankAccountType): void {
    this.bankAccountForm.patchValue({ account_type: type });
  }

  onIfscInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input && input.value) {
      const upper = input.value.toUpperCase();
      this.bankAccountForm.patchValue({ ifsc_code: upper }, { emitEvent: false });
      input.value = upper;
    }
  }

  submitBankAccount(): void {
    const type = this.bankAccountForm.get('account_type')?.value as BankAccountType;
    const holder = this.bankAccountForm.get('account_holder_name')?.value?.trim();

    if (!holder) {
      this.bankAccountError.set('Account holder name is required.');
      return;
    }

    const payload: CreateBankAccountPayload = {
      account_type: type,
      account_holder_name: holder,
      is_primary: !!this.bankAccountForm.get('is_primary')?.value,
    };

    if (type === 'bank_account') {
      const accNum = this.bankAccountForm.get('account_number')?.value?.trim();
      const confirmAcc = this.bankAccountForm.get('confirm_account_number')?.value?.trim();
      const ifsc = this.bankAccountForm.get('ifsc_code')?.value?.trim()?.toUpperCase();
      const bankName = this.bankAccountForm.get('bank_name')?.value?.trim();
      const branchName = this.bankAccountForm.get('branch_name')?.value?.trim();

      if (!accNum || accNum.length < 8) {
        this.bankAccountError.set('Please enter a valid bank account number (at least 8 digits).');
        return;
      }
      if (accNum !== confirmAcc) {
        this.bankAccountError.set('Account numbers do not match.');
        return;
      }
      if (!ifsc || ifsc.length !== 11) {
        this.bankAccountError.set('Please enter a valid 11-character IFSC code.');
        return;
      }

      payload.account_number = accNum;
      payload.ifsc_code = ifsc;
      payload.bank_name = bankName || undefined;
      payload.branch_name = branchName || undefined;
    } else {
      const upi = this.bankAccountForm.get('upi_id')?.value?.trim();
      if (!upi || !upi.includes('@')) {
        this.bankAccountError.set('Please enter a valid UPI VPA ID (e.g. name@bank).');
        return;
      }
      payload.upi_id = upi;
    }

    const vendorId = this.bankModalVendorId() || this.selectedVendorIdForManager();
    if (!vendorId) {
      this.bankAccountError.set('Vendor must be selected to add bank account.');
      return;
    }

    this.isSavingBankAccount.set(true);
    this.bankAccountError.set('');

    this.payoutApi
      .createVendorBankAccount(vendorId, payload)
      .pipe(
        finalize(() => this.isSavingBankAccount.set(false)),
        catchError((error) => {
          const msg =
            error?.error?.message ||
            error?.message ||
            'Unable to save bank account details.';
          this.bankAccountError.set(msg);
          return of(null);
        })
      )
      .subscribe((res) => {
        if (!res) return;
        this.showSuccess('Bank account / Fund account added and registered on RazorpayX successfully.');

        if (this.isBankModalOpen()) {
          this.closeBankModal();
        }

        if (this.isAddAccountInManagerOpen()) {
          this.isAddAccountInManagerOpen.set(false);
        }

        // Refresh vendor accounts in manager if open
        if (this.isVendorManagerOpen()) {
          this.loadManagerVendorAccounts(vendorId);
        }

        // Refresh vendor accounts in Create Payout modal if open
        if (this.isCreateModalOpen() && this.createPayoutForm.get('vendor_id')?.value === vendorId) {
          this.loadVendorAccounts(vendorId, true);
        }
      });
  }

  // ── Action Confirmation (Disburse / Retry / Cancel / Sync) ────────────────
  openActionModal(payout: Payout, type: PayoutActionType): void {
    this.actionPayout.set(payout);
    this.actionType.set(type);
    this.actionErrorMessage.set('');

    const payoutId = this.getPayoutId(payout);
    const defaultNarration = `PO-${payoutId.slice(0, 8)}`.slice(0, 30);
    this.processActionForm.reset({
      mode: payout.mode || 'NEFT',
      narration: defaultNarration,
      purpose: 'payout',
    });

    this.isActionModalOpen.set(true);
  }

  closeActionModal(): void {
    if (this.isProcessingAction()) return;
    this.isActionModalOpen.set(false);
    this.actionPayout.set(null);
    this.actionType.set(null);
    this.actionErrorMessage.set('');
  }

  confirmAction(): void {
    const payout = this.actionPayout();
    const action = this.actionType();
    const payoutId = this.getPayoutId(payout);
    if (!payout || !action || !payoutId) return;

    this.isProcessingAction.set(true);
    this.actionErrorMessage.set('');

    if (action === 'process' || action === 'retry') {
      const formVal = this.processActionForm.getRawValue();
      const payload: ProcessPayoutPayload = {
        mode: formVal.mode || payout.mode || 'NEFT',
        narration: formVal.narration ? formVal.narration.trim().slice(0, 30) : undefined,
        purpose: formVal.purpose || 'payout',
      };

      this.payoutApi
        .processPayout(payoutId, payload)
        .pipe(
          finalize(() => this.isProcessingAction.set(false)),
          catchError((err) => {
            this.actionErrorMessage.set(
              err?.error?.message || err?.message || 'Unable to submit payout to RazorpayX.'
            );
            return of(null);
          })
        )
        .subscribe((res) => {
          if (!res) return;
          this.showSuccess(res.message || 'Payout submitted to RazorpayX successfully.');
          this.closeActionModal();
          this.loadPayouts();
          if (this.getPayoutId(this.selectedPayout()) === payoutId) {
            this.selectedPayout.set(res.data);
          }
        });
    } else if (action === 'sync') {
      this.payoutApi
        .syncPayout(payoutId)
        .pipe(
          finalize(() => this.isProcessingAction.set(false)),
          catchError((err) => {
            this.actionErrorMessage.set(
              err?.error?.message || err?.message || 'Failed to sync status from gateway.'
            );
            return of(null);
          })
        )
        .subscribe((res) => {
          if (!res) return;
          this.showSuccess(res.message || 'Payout status synced with Razorpay.');
          this.closeActionModal();
          this.loadPayouts();
          if (this.getPayoutId(this.selectedPayout()) === payoutId) {
            this.selectedPayout.set(res.data);
          }
        });
    } else if (action === 'cancel') {
      this.payoutApi
        .cancelPayout(payoutId)
        .pipe(
          finalize(() => this.isProcessingAction.set(false)),
          catchError((err) => {
            this.actionErrorMessage.set(
              err?.error?.message || err?.message || 'Failed to cancel payout.'
            );
            return of(null);
          })
        )
        .subscribe((res) => {
          if (!res) return;
          this.showSuccess(res.message || 'Payout cancelled successfully.');
          this.closeActionModal();
          this.loadPayouts();
          if (this.getPayoutId(this.selectedPayout()) === payoutId) {
            this.selectedPayout.set(res.data);
          }
        });
    }
  }

  // ── Receipt Modal ──────────────────────────────────────────────────────────
  openReceipt(payout: Payout): void {
    this.receiptPayout.set(payout);
    this.isReceiptModalOpen.set(true);
  }

  closeReceipt(): void {
    this.isReceiptModalOpen.set(false);
    this.receiptPayout.set(null);
  }

  printReceipt(): void {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }

  // ── Helpers & Formatters ───────────────────────────────────────────────────
  copyToClipboard(text: string, key: string): void {
    if (!text || typeof navigator === 'undefined' || !navigator.clipboard) return;
    navigator.clipboard.writeText(text).then(() => {
      this.copiedKey.set(key);
      if (this.copyTimeout) clearTimeout(this.copyTimeout);
      this.copyTimeout = setTimeout(() => this.copiedKey.set(null), 2000);
    });
  }

  formatCurrency(value?: number | null, currency = 'INR'): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      maximumFractionDigits: 2,
    }).format(value || 0);
  }

  formatDate(dateInput?: string | null): string {
    return dateInput ? this.settings.formatDate(dateInput) : '—';
  }

  formatDateTime(dateInput?: string | null): string {
    return dateInput ? this.settings.formatDateTime(dateInput) : '—';
  }

  getSerialNumber(index: number): number {
    return (this.currentPage() - 1) * this.meta.size + index + 1;
  }

  statusBadgeClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-300 animate-pulse dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30';
      case 'queued':
        return 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-500/10 dark:text-orange-300 dark:border-orange-500/30';
      case 'paid':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30';
      case 'failed':
        return 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30';
      case 'reversed':
        return 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-500/10 dark:text-purple-300 dark:border-purple-500/30';
      case 'cancelled':
        return 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
  }

  statusDotClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'bg-amber-500';
      case 'processing':
        return 'bg-blue-500';
      case 'queued':
        return 'bg-orange-500';
      case 'paid':
        return 'bg-emerald-500';
      case 'failed':
      case 'rejected':
        return 'bg-rose-500';
      case 'reversed':
        return 'bg-purple-500';
      case 'cancelled':
        return 'bg-slate-400';
      default:
        return 'bg-slate-400';
    }
  }

  statusLabel(status: string): string {
    if (!status) return 'Unknown';
    switch (status.toLowerCase()) {
      case 'paid':
        return 'Paid';
      case 'processing':
        return 'Processing';
      case 'queued':
        return 'Queued';
      case 'pending':
        return 'Pending';
      case 'failed':
        return 'Failed';
      case 'reversed':
        return 'Reversed';
      case 'rejected':
        return 'Rejected';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  }

  private showSuccess(msg: string): void {
    this.successMessage.set(msg);
    if (this.messageTimeout) clearTimeout(this.messageTimeout);
    this.messageTimeout = setTimeout(() => this.successMessage.set(''), 6000);
  }

  private showError(msg: string): void {
    this.errorMessage.set(msg);
    if (this.messageTimeout) clearTimeout(this.messageTimeout);
    this.messageTimeout = setTimeout(() => this.errorMessage.set(''), 7000);
  }

  dismissAlert(): void {
    this.errorMessage.set('');
    this.successMessage.set('');
  }
}
