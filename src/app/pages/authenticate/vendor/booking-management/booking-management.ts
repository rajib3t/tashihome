import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { catchError, finalize, of } from 'rxjs';
import { BookingData, BookingQuery, BookingStatus } from '../../../../services/booking/booking.model';
import { BookingService } from '../../../../services/booking/booking-service';
import { SettingsService } from '../../../../services/settings/settings-service';
import { PageBreadcrumb } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb';
import { Card } from '../../../../shared/components/ui/card/card';
import { Modal } from '../../../../shared/components/ui/modal/modal';
import { Pagination } from '../../../../shared/components/ui/pagination/pagination';
import { PaginationMeta } from '../../../../services/api/api-response.model';
import { DateInput } from '../../../../shared/components/ui/date-input/date-input';
import { environment } from '../../../../../environments/environment';
const ALL_STATUS_OPTIONS: { value: BookingStatus; label: string }[] = [
  { value: 'pending',     label: 'Pending' },
  { value: 'confirmed',   label: 'Confirmed' },
  { value: 'checked_in',  label: 'Checked In' },
  { value: 'checked_out', label: 'Checked Out' },
  { value: 'completed',   label: 'Completed' },
  { value: 'cancelled',   label: 'Cancelled' },
  { value: 'no_show',     label: 'No Show' },
];

@Component({
  selector: 'app-vendor-booking-management',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PageBreadcrumb,
    Card,
    Modal,
    Pagination,
    DateInput,
  ],
  templateUrl: './booking-management.html',
  styleUrl: './booking-management.css',
})
export class VendorBookingManagement {
  private readonly assetUrl = environment.assetUrl
  private readonly bookingService = inject(BookingService);
  private readonly settingsService = inject(SettingsService);
  private readonly fb = inject(FormBuilder);

  // ── list state ──────────────────────────────────────────────────────────────
  readonly bookings = signal<BookingData[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly currentPage = signal(1);
  readonly pageSize = signal(10);
  meta!: PaginationMeta;
  readonly pageSizeOptions = [10, 20, 30];

  readonly searchForm = this.fb.group({
    booking_reference: [''],
    status: [''],
    payment_status: [''],
    check_in_date: [''],
    check_out_date: [''],
  });

  // ── detail modal ─────────────────────────────────────────────────────────────
  readonly isDetailModalOpen = signal(false);
  readonly selectedBooking = signal<BookingData | null>(null);

  // ── status change modal ───────────────────────────────────────────────────────
  readonly isStatusModalOpen = signal(false);
  readonly bookingToChangeStatus = signal<BookingData | null>(null);
  readonly selectedStatus = signal<BookingStatus>('checked_in');
  readonly isUpdatingStatus = signal(false);
  readonly statusErrorMessage = signal<string | null>(null);

  readonly allFilterStatuses = ALL_STATUS_OPTIONS;

  ngOnInit(): void {
    this.loadBookings();
  }

  // ── list actions ─────────────────────────────────────────────────────────────
  onSearch(): void {
    this.currentPage.set(1);
    this.loadBookings();
  }

  onReset(): void {
    this.searchForm.reset({
      booking_reference: '',
      status: '',
      payment_status: '',
      check_in_date: '',
      check_out_date: '',
    });
    this.currentPage.set(1);
    this.loadBookings();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadBookings();
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
    this.loadBookings();
  }

  private loadBookings(): void {
    const filters = this.searchForm.getRawValue();
    const query: BookingQuery = {
      page: this.currentPage(),
      size: this.pageSize(),
      sort_by: 'created_at',
      sort_order: 'desc',
      status: filters.status?.trim() || undefined,
      payment_status: filters.payment_status?.trim() || undefined,
      check_in_date: filters.check_in_date?.trim() || undefined,
      check_out_date: filters.check_out_date?.trim() || undefined,
      booking_reference: filters.booking_reference?.trim() || undefined,
    };

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.bookingService.vendor.getBookings(query)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        catchError((error) => {
          this.errorMessage.set(error?.error?.message || error?.message || 'Unable to load bookings.');
          this.bookings.set([]);
          return of(null);
        })
      )
      .subscribe((response) => {
        if (!response) return;
        this.bookings.set(response.data || []);
        this.meta = { ...response.meta };
      });
  }

  getSerialNumber(index: number): number {
    return (this.currentPage() - 1) * (this.meta?.size || this.pageSize()) + index + 1;
  }

  // ── Date Helpers ────────────────────────────────────────────────────────────
  getTodayString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  normalizeDateString(dateStr?: string | null): string {
    if (!dateStr) return '';
    return dateStr.split('T')[0];
  }

  validateCheckInDate(booking: BookingData): { isValid: boolean; message?: string } {
    const checkInDate = this.normalizeDateString(booking.check_in_date);
    const today = this.getTodayString();

    if (!checkInDate) {
      return { isValid: false, message: 'Check-in date is missing from this booking.' };
    }

    if (checkInDate > today) {
      return {
        isValid: false,
        message: `Check-in is not allowed before the scheduled date (${this.formatDate(checkInDate)}). Today is ${this.formatDate(today)}.`,
      };
    }

    return { isValid: true };
  }

  isCheckInEligible(booking: BookingData): boolean {
    return this.validateCheckInDate(booking).isValid;
  }

  // ── Vendor Status Permissions ───────────────────────────────────────────────
  /**
   * Status change rules for Vendor:
   * - Confirmed: Vendor can update to Checked-In, Cancelled, or No-Show
   * - Checked-In: Vendor can update to Checked-Out or Completed
   * - Pending: Vendor can update to Confirmed or Cancelled
   */
  getAvailableStatuses(booking: BookingData | null): { value: BookingStatus; label: string }[] {
    if (!booking) return [];
    switch (booking.status) {
      case 'confirmed':
        return [
          { value: 'checked_in', label: 'Check In' },
          { value: 'cancelled', label: 'Cancelled' },
          { value: 'no_show', label: 'No Show' },
        ];
      case 'checked_in':
      case 'check_in':
        return [
          { value: 'checked_out', label: 'Check Out' },
          { value: 'completed', label: 'Completed' },
        ];
      case 'checked_out':
      case 'check_out':
        return [
          { value: 'completed', label: 'Completed' },
        ];
      case 'pending':
        return [
          { value: 'confirmed', label: 'Confirmed' },
          { value: 'cancelled', label: 'Cancelled' },
        ];
      default:
        return [];
    }
  }

  isStatusChangeAllowed(booking: BookingData): boolean {
    return ['confirmed', 'checked_in', 'check_in', 'checked_out', 'check_out', 'pending'].includes(booking.status);
  }

  // ── detail modal ─────────────────────────────────────────────────────────────
  openDetail(booking: BookingData): void {
    this.selectedBooking.set(booking);
    this.isDetailModalOpen.set(true);
  }

  closeDetail(): void {
    this.isDetailModalOpen.set(false);
    this.selectedBooking.set(null);
  }

  // ── status change modal ───────────────────────────────────────────────────────
  openStatusModal(booking: BookingData): void {
    const available = this.getAvailableStatuses(booking);
    if (available.length === 0) {
      return;
    }

    this.bookingToChangeStatus.set(booking);
    this.selectedStatus.set(available[0].value);
    this.statusErrorMessage.set(null);
    this.isStatusModalOpen.set(true);
  }

  closeStatusModal(): void {
    this.isStatusModalOpen.set(false);
    this.bookingToChangeStatus.set(null);
    this.statusErrorMessage.set(null);
  }

  confirmStatusChange(): void {
    const booking = this.bookingToChangeStatus();
    if (!booking) return;

    const newStatus = this.selectedStatus();

    // Enforce check-in date validation with current date
    if (newStatus === 'checked_in' || newStatus === 'check_in') {
      const validation = this.validateCheckInDate(booking);
      if (!validation.isValid) {
        this.statusErrorMessage.set(
          validation.message || 'Check-in is not allowed before the scheduled check-in date.'
        );
        return;
      }
    }

    this.isUpdatingStatus.set(true);
    this.statusErrorMessage.set(null);

    this.bookingService.vendor.updateBookingStatus(booking.id, newStatus)
      .pipe(
        finalize(() => this.isUpdatingStatus.set(false)),
        catchError((error) => {
          this.statusErrorMessage.set(
            error?.error?.message || error?.message || 'Failed to update booking status.'
          );
          return of(null);
        })
      )
      .subscribe((response) => {
        if (!response) return;
        this.closeStatusModal();
        this.loadBookings();
      });
  }

  // ── helpers ───────────────────────────────────────────────────────────────────
  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      pending:     'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
      confirmed:   'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
      checked_in:  'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
      check_in:    'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
      checked_out: 'bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300',
      check_out:   'bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300',
      cancelled:   'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
      completed:   'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
      no_show:     'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
      failed:      'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300',
    };
    return map[status] ?? 'bg-slate-50 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300';
  }

  getPaymentStatusClass(status: string): string {
    const map: Record<string, string> = {
      paid:     'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
      pending:  'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
      failed:   'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
      refunded: 'bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300',
    };
    return map[status] ?? 'bg-slate-50 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300';
  }

  statusLabel(status: string): string {
    return ALL_STATUS_OPTIONS.find(s => s.value === status)?.label ?? status ?? 'Unknown';
  }

  formatCurrency(value: number | undefined, currency = 'INR'): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value ?? 0);
  }

  formatDate(dateStr: string | Date | number | undefined | null): string {
    return this.settingsService.formatDate(dateStr);
  }

  formatDateTime(dateStr: string | Date | number | undefined | null): string {
    return this.settingsService.formatDateTime(dateStr);
  }

  getPrimaryImage(booking: BookingData): string | null {
    const assets = booking.property?.property_assets;
    if (!assets?.length) return null;
    const primary = assets.find(a => a.is_primary) ?? assets[0];
    return primary?.file_url ?? null;
  }

   resolveAssetUrl(url?: string | null): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
      return url;
    }
    const base = this.assetUrl ? (this.assetUrl.endsWith('/') ? this.assetUrl : `${this.assetUrl}/`) : '';
    const cleanPath = url.startsWith('/') ? url.substring(1) : url;
    return `${base}${cleanPath}`;
  }
}
