import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestimonialService } from './testimonial-service';
import { ApiService } from '../api/api-service';
import {
  AdminTestimonialQuery,
  PublicTestimonialsParams,
  SubmitTestimonialRequest,
  TestimonialData,
  UpdateTestimonialRequest,
  UserTestimonialsParams,
} from './testimonial.model';
import { isValidUuid } from '../../utils/idempotency';

describe('TestimonialService', () => {
  let service: TestimonialService;
  let httpMock: HttpTestingController;

  const mockTestimonial: TestimonialData = {
    id: '3c98f12a-8d19-4f76-88ab-1029384756ab',
    name: 'Sonam Lepcha',
    designation: 'Homestay Host in Pelling',
    avatar_url: 'https://cdn.tashihome.com/avatars/sonam.jpg',
    rating: 5,
    content: 'Listing our property on TashiHome helped us connect with respectful guests.',
    status: 'approved',
    user_role: 'vendor',
    is_featured: true,
    created_at: '2026-08-15T12:00:00Z',
    updated_at: '2026-08-16T10:00:00Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [TestimonialService, ApiService],
    });
    service = TestBed.inject(TestimonialService);
    httpMock = TestBed.inject(HttpTestingController);
    document.cookie = 'csrf_token=test-csrf-token';
  });

  afterEach(() => {
    httpMock.verify();
    document.cookie = 'csrf_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Public Endpoints', () => {
    it('should fetch public approved testimonials with query params', () => {
      const params: PublicTestimonialsParams = {
        is_featured: true,
        user_role: 'vendor',
        page: 1,
        page_size: 6,
        sort_order: 'desc',
      };

      service.public.getTestimonials(params).subscribe((res) => {
        expect(res.data).toEqual([mockTestimonial]);
      });

      const req = httpMock.expectOne((r) => r.url.includes('/public/testimonials'));
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('is_featured')).toBe('true');
      expect(req.request.params.get('user_role')).toBe('vendor');
      expect(req.request.params.get('page_size')).toBe('6');
      req.flush({ data: [mockTestimonial] });
    });
  });

  describe('User Endpoints', () => {
    it('should submit guest testimonial with auto-generated idempotency key', () => {
      const payload: SubmitTestimonialRequest = {
        name: 'Rohan Sharma',
        designation: 'Solo Traveler from Delhi',
        rating: 5,
        content: 'TashiHome made finding authentic homestays in Sikkim so easy and trustworthy!',
      };

      service.user.submitTestimonial(payload).subscribe((res) => {
        expect(res.data).toEqual(mockTestimonial);
      });

      const req = httpMock.expectOne((r) => r.url.includes('/user/testimonials'));
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);
      const idempotencyHeader = req.request.headers.get('Idempotency-Key');
      expect(idempotencyHeader).toBeTruthy();
      expect(isValidUuid(idempotencyHeader!)).toBe(true);
      req.flush({ data: mockTestimonial });
    });

    it('should get user submitted testimonials with pagination', () => {
      const params: UserTestimonialsParams = { page: 1, page_size: 10, sort_order: 'desc' };

      service.user.getTestimonials(params).subscribe((res) => {
        expect(res.data).toEqual([mockTestimonial]);
      });

      const req = httpMock.expectOne((r) => r.url.includes('/user/testimonials'));
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('page')).toBe('1');
      expect(req.request.params.get('page_size')).toBe('10');
      req.flush({ data: [mockTestimonial] });
    });

    it('should update user submitted testimonial', () => {
      const updateData: UpdateTestimonialRequest = {
        designation: 'Frequent Homestay Traveler',
        rating: 5,
        content: 'Updated testimonial message.',
      };

      service.user.updateTestimonial('test-id-1', updateData).subscribe((res) => {
        expect(res.data).toEqual(mockTestimonial);
      });

      const req = httpMock.expectOne((r) => r.url.includes('/user/testimonials/test-id-1'));
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(updateData);
      req.flush({ data: mockTestimonial });
    });

    it('should delete user submitted testimonial', () => {
      service.user.deleteTestimonial('test-id-1').subscribe();

      const req = httpMock.expectOne((r) => r.url.includes('/user/testimonials/test-id-1'));
      expect(req.request.method).toBe('DELETE');
      req.flush({ data: null });
    });
  });

  describe('Vendor Endpoints', () => {
    it('should submit vendor testimonial with custom idempotency key', () => {
      const customKey = 'custom-uuid-key-456';
      const payload: SubmitTestimonialRequest = {
        name: 'Sonam Lepcha',
        designation: 'Homestay Host in Pelling',
        rating: 5,
        content: 'Listing our property on TashiHome helped us connect with respectful guests.',
      };

      service.vendor.submitTestimonial(payload, customKey).subscribe((res) => {
        expect(res.data).toEqual(mockTestimonial);
      });

      const req = httpMock.expectOne((r) => r.url.includes('/vendor/testimonials'));
      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('Idempotency-Key')).toBe(customKey);
      req.flush({ data: mockTestimonial });
    });

    it('should get vendor submitted testimonials', () => {
      service.vendor.getTestimonials().subscribe((res) => {
        expect(res.data).toEqual([mockTestimonial]);
      });

      const req = httpMock.expectOne((r) => r.url.includes('/vendor/testimonials'));
      expect(req.request.method).toBe('GET');
      req.flush({ data: [mockTestimonial] });
    });

    it('should update vendor submitted testimonial', () => {
      const updateData: UpdateTestimonialRequest = {
        content: 'Updated vendor story.',
      };

      service.vendor.updateTestimonial('vendor-test-id', updateData).subscribe();

      const req = httpMock.expectOne((r) => r.url.includes('/vendor/testimonials/vendor-test-id'));
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(updateData);
      req.flush({ data: mockTestimonial });
    });

    it('should delete vendor submitted testimonial', () => {
      service.vendor.deleteTestimonial('vendor-test-id').subscribe();

      const req = httpMock.expectOne((r) => r.url.includes('/vendor/testimonials/vendor-test-id'));
      expect(req.request.method).toBe('DELETE');
      req.flush({ data: null });
    });
  });

  describe('Admin Endpoints', () => {
    it('should list all testimonials with filters', () => {
      const query: AdminTestimonialQuery = {
        page: 1,
        page_size: 10,
        status: 'pending',
        user_role: 'vendor',
        is_featured: true,
        search: 'sonam',
        sort_order: 'desc',
      };

      service.admin.getTestimonials(query).subscribe((res) => {
        expect(res.data).toEqual([mockTestimonial]);
      });

      const req = httpMock.expectOne((r) => r.url.includes('/admin/testimonials'));
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('status')).toBe('pending');
      expect(req.request.params.get('user_role')).toBe('vendor');
      expect(req.request.params.get('is_featured')).toBe('true');
      expect(req.request.params.get('search')).toBe('sonam');
      req.flush({ data: [mockTestimonial] });
    });

    it('should approve testimonial', () => {
      service.admin.approveTestimonial('t-123').subscribe((res) => {
        expect(res.data).toEqual(mockTestimonial);
      });

      const req = httpMock.expectOne((r) => r.url.includes('/admin/testimonials/t-123/approve'));
      expect(req.request.method).toBe('POST');
      req.flush({ data: mockTestimonial });
    });

    it('should reject testimonial', () => {
      service.admin.rejectTestimonial('t-123').subscribe((res) => {
        expect(res.data).toEqual(mockTestimonial);
      });

      const req = httpMock.expectOne((r) => r.url.includes('/admin/testimonials/t-123/reject'));
      expect(req.request.method).toBe('POST');
      req.flush({ data: mockTestimonial });
    });

    it('should toggle / set featured status', () => {
      service.admin.featureTestimonial('t-123', true).subscribe();

      const req = httpMock.expectOne((r) => r.url.includes('/admin/testimonials/t-123/feature'));
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ is_featured: true });
      req.flush({ data: mockTestimonial });
    });

    it('should update testimonial status', () => {
      service.admin.updateStatus('t-123', 'approved').subscribe();

      const req = httpMock.expectOne((r) => r.url.includes('/admin/testimonials/t-123/status'));
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ status: 'approved' });
      req.flush({ data: mockTestimonial });
    });

    it('should delete testimonial permanently', () => {
      service.admin.deleteTestimonial('t-123').subscribe();

      const req = httpMock.expectOne((r) => r.url.includes('/admin/testimonials/t-123'));
      expect(req.request.method).toBe('DELETE');
      req.flush({ data: null });
    });
  });
});

