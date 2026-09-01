import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { BookingService } from './booking-service';
import { ApiService } from '../api/api-service';
import { CreateBookingRequest, BookingPaymentRequest, RazorpayVerifyRequest } from './booking.model';
import { isValidUuid } from '../../utils/idempotency';

describe('BookingService Idempotency Integration', () => {
  let service: BookingService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [BookingService, ApiService],
    });
    service = TestBed.inject(BookingService);
    httpMock = TestBed.inject(HttpTestingController);
    document.cookie = 'csrf_token=test-csrf-token';
  });

  afterEach(() => {
    httpMock.verify();
    document.cookie = 'csrf_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  });

  it('should attach auto-generated UUID v4 Idempotency-Key on createBooking when none is supplied', () => {
    const payload: CreateBookingRequest = {
      property_id: 'prop-123',
      check_in_date: '2026-10-01',
      check_out_date: '2026-10-05',
      room_type_id: 'room-456',
      num_guests: 2,
      num_rooms: 1,
    };

    service.createBooking(payload).subscribe();

    const req = httpMock.expectOne((r) => r.url.includes('/user/bookings/'));
    const idempotencyHeader = req.request.headers.get('Idempotency-Key');

    expect(idempotencyHeader).toBeTruthy();
    expect(isValidUuid(idempotencyHeader!)).toBeTrue();
    req.flush({ data: { id: 'booking-1' } });
  });

  it('should use explicitly passed Idempotency-Key on createBooking', () => {
    const customKey = 'explicit-uuid-key-999';
    const payload: CreateBookingRequest = {
      property_id: 'prop-123',
      check_in_date: '2026-10-01',
      check_out_date: '2026-10-05',
    };

    service.createBooking(payload, customKey).subscribe();

    const req = httpMock.expectOne((r) => r.url.includes('/user/bookings/'));
    expect(req.request.headers.get('Idempotency-Key')).toBe(customKey);
    req.flush({ data: { id: 'booking-1' } });
  });

  it('should attach Idempotency-Key on createRazorpayOrder', () => {
    const customKey = 'razorpay-order-key-555';
    service.createRazorpayOrder('booking-123', customKey).subscribe();

    const req = httpMock.expectOne((r) =>
      r.url.includes('/user/bookings/booking-123/razorpay/order')
    );
    expect(req.request.headers.get('Idempotency-Key')).toBe(customKey);
    req.flush({ data: { order_id: 'order_123' } });
  });

  it('should attach deterministic Idempotency-Key on verifyRazorpayPayment', () => {
    const verifyPayload: RazorpayVerifyRequest = {
      razorpay_order_id: 'order_123',
      razorpay_payment_id: 'pay_ABC123',
      razorpay_signature: 'sig_xyz',
    };

    service.verifyRazorpayPayment('booking-123', verifyPayload).subscribe();

    const req = httpMock.expectOne((r) =>
      r.url.includes('/user/bookings/booking-123/razorpay/verify')
    );
    expect(req.request.headers.get('Idempotency-Key')).toBe('verify-pay_ABC123');
    req.flush({ data: { status: 'confirmed' } });
  });

  it('should attach Idempotency-Key on recordPayment', () => {
    const customKey = 'payment-key-777';
    const payload: BookingPaymentRequest = {
      payment_method: 'pay_at_homestay',
      amount: 5000,
    };

    service.recordPayment('booking-123', payload, customKey).subscribe();

    const req = httpMock.expectOne((r) =>
      r.url.includes('/user/bookings/booking-123/payments')
    );
    expect(req.request.headers.get('Idempotency-Key')).toBe(customKey);
    req.flush({ data: { id: 'payment-1' } });
  });
});

