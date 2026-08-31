import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { StaffService } from './staff-service';
import { ApiService } from '../api/api-service';
import { CreateStaffDTO, UpdateStaffDTO } from './staff.model';

describe('StaffService', () => {
  let service: StaffService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [StaffService, ApiService],
    });
    service = TestBed.inject(StaffService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get staff accounts with query parameters', () => {
    service
      .getStaffs({
        page: 1,
        size: 10,
        search: {
          full_name: 'John',
          email: 'john@example.com',
          phone: '1234567890',
          role: 'admin',
          status: 'active',
        },
      })
      .subscribe((res) => {
        expect(res).toBeDefined();
      });

    const req = httpMock.expectOne((request) => request.url.includes('/admin/staffs'));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('full_name')).toBe('John');
    expect(req.request.params.get('email')).toBe('john@example.com');
    expect(req.request.params.get('role')).toBe('admin');
    expect(req.request.params.get('status')).toBe('active');

    req.flush({ data: [], meta: { total: 0, page: 1, size: 10 } });
  });

  it('should create a new staff account', () => {
    const payload: CreateStaffDTO = {
      full_name: 'Jane Staff',
      email: 'jane@example.com',
      phone: '9876543210',
      password: 'Password123!',
      role: 'staff',
      is_subscribed: false,
    };

    service.createStaff(payload).subscribe((res) => {
      expect(res).toBeDefined();
    });

    const req = httpMock.expectOne((request) => request.url.includes('/admin/staffs'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);

    req.flush({ data: { id: 'uuid-1', ...payload, status: 'active' }, message: 'Created' });
  });

  it('should update staff detail and role', () => {
    const payload: UpdateStaffDTO = {
      full_name: 'Jane Updated',
      email: 'jane_up@example.com',
      phone: '9876543210',
      role: 'admin',
    };

    service.updateStaff('uuid-1', payload).subscribe((res) => {
      expect(res).toBeDefined();
    });

    const req = httpMock.expectOne((request) => request.url.includes('/admin/staffs/uuid-1'));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(payload);

    req.flush({ data: { id: 'uuid-1', ...payload }, message: 'Updated' });
  });

  it('should update staff status via path and body', () => {
    service.changeStaffStatusByPath('uuid-1', 'inactive').subscribe();
    const reqPath = httpMock.expectOne((r) => r.url.includes('/admin/staffs/change/uuid-1/inactive'));
    expect(reqPath.request.method).toBe('PATCH');
    reqPath.flush({ data: { id: 'uuid-1', status: 'inactive' }, message: 'Status updated' });

    service.updateStaffStatus('uuid-1', { status: 'active' }).subscribe();
    const reqBody = httpMock.expectOne((r) => r.url.includes('/admin/staffs/uuid-1/status'));
    expect(reqBody.request.method).toBe('PATCH');
    expect(reqBody.request.body).toEqual({ status: 'active' });
    reqBody.flush({ data: { id: 'uuid-1', status: 'active' }, message: 'Status updated' });
  });

  it('should send password reset link', () => {
    service.sendStaffPasswordReset('uuid-1', 'CONFIRM').subscribe();
    const req = httpMock.expectOne((r) => r.url.includes('/admin/staffs/uuid-1/password-reset'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ confirm: 'CONFIRM' });
    req.flush({ data: null, message: 'Reset email sent' });
  });
});

