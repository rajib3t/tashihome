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

const BOOKING_STATUSES: { value: BookingStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'check_in', label: 'Check In' },
  { value: 'check_out', label: 'Check Out' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'completed', label: 'Completed' },
];

@Component({
  selector: 'app-admin-booking-management',
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
export class AdminBookingManagement {
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
  readonly selectedStatus = signal<BookingStatus>('pending');
  readonly isUpdatingStatus = signal(false);
  readonly statusErrorMessage = signal<string | null>(null);

  readonly allStatuses = BOOKING_STATUSES;

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

    this.bookingService.admin.getBookings(query)
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
        message: `Check-in date is in the future (${this.formatDate(checkInDate)}). Today is ${this.formatDate(today)}. Check-in is only allowed on or after the scheduled date.`,
      };
    }

    return { isValid: true };
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
    this.bookingToChangeStatus.set(booking);
    this.selectedStatus.set(booking.status as BookingStatus);
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

    // Check-in date validation
    if (newStatus === 'check_in') {
      const validation = this.validateCheckInDate(booking);
      if (!validation.isValid) {
        this.statusErrorMessage.set(validation.message || 'Check-in is not allowed before the scheduled date.');
        return;
      }
    }

    this.isUpdatingStatus.set(true);
    this.statusErrorMessage.set(null);

    this.bookingService.admin.updateBookingStatus(booking.id, newStatus)
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
      pending:   'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
      confirmed: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
      check_in:  'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
      check_out: 'bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300',
      cancelled: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
      completed: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
      failed:    'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300',
    };
    return map[status] ?? 'bg-slate-50 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300';
  }

  getPaymentStatusClass(status: string): string {
    const map: Record<string, string> = {
      paid:    'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
      pending: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
      failed:  'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
      refunded:'bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300',
    };
    return map[status] ?? 'bg-slate-50 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300';
  }

  statusLabel(status: string): string {
    return BOOKING_STATUSES.find(s => s.value === status)?.label ?? status ?? 'Unknown';
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
}
