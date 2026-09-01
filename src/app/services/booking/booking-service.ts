import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from '../api/api-service';
import { ApiResponse, PaginatedResponse } from '../api/api-response.model';
import {
  BookingData,
  BookingPaymentRequest,
  BookingPayment,
  BookingQuery,
  BookingStatus,
  CancelBookingRequest,
  CheckAvailabilityRequest,
  CheckAvailabilityResponseData,
  CreateBookingRequest,
  RazorpayOrderResponse,
  RazorpayVerifyRequest,
} from './booking.model';
import {
  generateIdempotencyKey,
  generatePaymentVerificationKey,
} from '../../utils/idempotency';

function buildBookingQueryParams(query?: BookingQuery): Record<string, string | number> {
  const params: Record<string, string | number> = {
    page: query?.page ?? 1,
    size: query?.size ?? 10,
    sort_by: query?.sort_by ?? 'created_at',
    sort_order: query?.sort_order ?? 'desc',
  };

  if (query?.status?.trim()) {
    params['status'] = query.status.trim();
  }
  if (query?.payment_status?.trim()) {
    params['payment_status'] = query.payment_status.trim();
  }
  if (query?.check_in_date?.trim()) {
    params['check_in_date'] = query.check_in_date.trim();
  }
  if (query?.check_out_date?.trim()) {
    params['check_out_date'] = query.check_out_date.trim();
  }
  if (query?.booking_reference?.trim()) {
    params['booking_reference'] = query.booking_reference.trim();
  }

  return params;
}

@Injectable({ providedIn: 'root' })
export class BookingService {
  private readonly apiService = inject(ApiService);

  public extractApiErrorMessage(error: any): string | null {
    return this.apiService.extractApiErrorMessage(error);
  }

  /**
   * Check room/property availability for selected dates, room type, rooms, and guests
   * Endpoint: POST /api/v1/user/bookings/check-availability
   */
  public checkAvailability(
    payload: CheckAvailabilityRequest
  ): Observable<ApiResponse<CheckAvailabilityResponseData>> {
    return this.apiService
      .post<ApiResponse<CheckAvailabilityResponseData>>(
        '/user/bookings/check-availability',
        payload
      )
      .pipe(
        map((res) => res.data),
        catchError(this.apiService.passthroughError)
      );
  }

  /**
   * Create a new booking
   * Endpoint: POST /api/v1/user/bookings/
   */
  public createBooking(
    payload: CreateBookingRequest,
    idempotencyKey?: string
  ): Observable<ApiResponse<BookingData>> {
    const key = idempotencyKey || generateIdempotencyKey();
    return this.apiService
      .protectedPost<ApiResponse<BookingData>>('/user/bookings/', payload, {
        idempotencyKey: key,
      })
      .pipe(
        map((res) => res.data),
        catchError(this.apiService.passthroughError)
      );
  }

  /**
   * Cancel a booking
   * Endpoint: POST /api/v1/user/bookings/{booking_id}/cancel
   */
  public cancelBooking(
    bookingId: string,
    payload: CancelBookingRequest = {},
    idempotencyKey?: string
  ): Observable<ApiResponse<BookingData>> {
    const options: { idempotencyKey?: string } = {};
    if (idempotencyKey) {
      options.idempotencyKey = idempotencyKey;
    }
    return this.apiService
      .protectedPost<ApiResponse<BookingData>>(
        `/user/bookings/${encodeURIComponent(bookingId)}/cancel`,
        payload,
        options
      )
      .pipe(
        map((res) => res.data),
        catchError(this.apiService.passthroughError)
      );
  }

  /**
   * Record a payment (internal, gateway, cash, etc.)
   * Endpoint: POST /api/v1/user/bookings/{booking_id}/payments
   */
  public recordPayment(
    bookingId: string,
    payload: BookingPaymentRequest,
    idempotencyKey?: string
  ): Observable<ApiResponse<BookingPayment>> {
    const key = idempotencyKey || generateIdempotencyKey();
    return this.apiService
      .protectedPost<ApiResponse<BookingPayment>>(
        `/user/bookings/${encodeURIComponent(bookingId)}/payments`,
        payload,
        { idempotencyKey: key }
      )
      .pipe(
        map((res) => res.data),
        catchError(this.apiService.passthroughError)
      );
  }

  /**
   * Create a Razorpay Order for a specific booking
   * Endpoint: POST /api/v1/user/bookings/{booking_id}/razorpay/order
   */
  public createRazorpayOrder(
    bookingId: string,
    idempotencyKey?: string
  ): Observable<ApiResponse<RazorpayOrderResponse>> {
    const key = idempotencyKey || generateIdempotencyKey();
    return this.apiService
      .protectedPost<ApiResponse<RazorpayOrderResponse>>(
        `/user/bookings/${encodeURIComponent(bookingId)}/razorpay/order`,
        {},
        { idempotencyKey: key }
      )
      .pipe(
        map((res) => res.data),
        catchError(this.apiService.passthroughError)
      );
  }

  /**
   * Verify Razorpay Payment signature after successful payment popup
   * Endpoint: POST /api/v1/user/bookings/{booking_id}/razorpay/verify
   */
  public verifyRazorpayPayment(
    bookingId: string,
    payload: RazorpayVerifyRequest,
    idempotencyKey?: string
  ): Observable<ApiResponse<any>> {
    const key =
      idempotencyKey ||
      generatePaymentVerificationKey(payload.razorpay_payment_id);
    return this.apiService
      .protectedPost<ApiResponse<any>>(
        `/user/bookings/${encodeURIComponent(bookingId)}/razorpay/verify`,
        payload,
        { idempotencyKey: key }
      )
      .pipe(
        map((res) => res.data),
        catchError(this.apiService.passthroughError)
      );
  }

  /**
   * Fetch paginated bookings of the authenticated user
   * Endpoint: GET /api/v1/user/bookings/?page=1&size=10&sort_by=created_at&sort_order=desc
   */
  public getUserBookings(
    query?: BookingQuery
  ): Observable<PaginatedResponse<BookingData>> {
    const params = buildBookingQueryParams(query);
    return this.apiService
      .protectedGet<PaginatedResponse<BookingData>>('/user/bookings/', { params })
      .pipe(
        map((res) => res.data),
        catchError(this.apiService.passthroughError)
      );
  }

  /**
   * Fetch specific booking details by ID
   * Endpoint: GET /api/v1/user/bookings/{booking_id}
   */
  public getBookingById(
    bookingId: string
  ): Observable<ApiResponse<BookingData>> {
    return this.apiService
      .protectedGet<ApiResponse<BookingData>>(
        `/user/bookings/${encodeURIComponent(bookingId)}`
      )
      .pipe(
        map((res) => res.data),
        catchError(this.apiService.passthroughError)
      );
  }

  // ── Admin sub-service ────────────────────────────────────────────────────────
  public readonly admin = {
    /**
     * Fetch paginated bookings for admin
     * Endpoint: GET /api/v1/admin/bookings/
     */
    getBookings: (query?: BookingQuery): Observable<PaginatedResponse<BookingData>> => {
      const params = buildBookingQueryParams(query);
      return this.apiService
        .protectedGet<PaginatedResponse<BookingData>>('/admin/bookings/', { params })
        .pipe(
          map((res) => res.data),
          catchError(this.apiService.passthroughError)
        );
    },

    /**
     * Fetch booking detail by ID for admin
     * Endpoint: GET /api/v1/admin/bookings/{booking_id}
     */
    getBookingById: (bookingId: string): Observable<ApiResponse<BookingData>> => {
      return this.apiService
        .protectedGet<ApiResponse<BookingData>>(
          `/admin/bookings/${encodeURIComponent(bookingId)}`
        )
        .pipe(
          map((res) => res.data),
          catchError(this.apiService.passthroughError)
        );
    },

    /**
     * Update booking status for admin
     * Endpoint: PATCH /api/v1/admin/bookings/{booking_id}/status
     */
    updateBookingStatus: (
      bookingId: string,
      status: BookingStatus
    ): Observable<ApiResponse<BookingData>> => {
      return this.apiService
        .protectedPatch<ApiResponse<BookingData>>(
          `/admin/bookings/${encodeURIComponent(bookingId)}/status`,
          { status }
        )
        .pipe(
          map((res) => res.data),
          catchError(this.apiService.passthroughError)
        );
    },
  };

  // ── Vendor sub-service ───────────────────────────────────────────────────────
  public readonly vendor = {
    /**
     * Fetch paginated bookings for vendor's properties
     * Endpoint: GET /api/v1/vendor/bookings/
     */
    getBookings: (query?: BookingQuery): Observable<PaginatedResponse<BookingData>> => {
      const params = buildBookingQueryParams(query);
      return this.apiService
        .protectedGet<PaginatedResponse<BookingData>>('/vendor/bookings/', { params })
        .pipe(
          map((res) => res.data),
          catchError(this.apiService.passthroughError)
        );
    },

    /**
     * Fetch booking detail by ID for vendor
     * Endpoint: GET /api/v1/vendor/bookings/{booking_id}
     */
    getBookingById: (bookingId: string): Observable<ApiResponse<BookingData>> => {
      return this.apiService
        .protectedGet<ApiResponse<BookingData>>(
          `/vendor/bookings/${encodeURIComponent(bookingId)}`
        )
        .pipe(
          map((res) => res.data),
          catchError(this.apiService.passthroughError)
        );
    },

    /**
     * Update booking status for vendor
     * Endpoint: PATCH /api/v1/vendor/bookings/{booking_id}/status
     */
    updateBookingStatus: (
      bookingId: string,
      status: BookingStatus
    ): Observable<ApiResponse<BookingData>> => {
      return this.apiService
        .protectedPatch<ApiResponse<BookingData>>(
          `/vendor/bookings/${encodeURIComponent(bookingId)}/status`,
          { status }
        )
        .pipe(
          map((res) => res.data),
          catchError(this.apiService.passthroughError)
        );
    },
  };
}
