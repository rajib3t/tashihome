import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { UserService } from './user-service';

describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [UserService]
    });
    service = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should send vendor search filters as query params', () => {
    service.getVendors({
      page: 2,
      size: 10,
      search: {
        name: '  Alice  ',
        email: '  alice@example.com  ',
        phone: '1234567890',
        status: 'active'
      }
    }).subscribe();

    const req = httpMock.expectOne((request) => request.url.includes('/vendors/'));

    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('size')).toBe('10');
    expect(req.request.params.get('name')).toBe('Alice');
    expect(req.request.params.get('email')).toBe('alice@example.com');
    expect(req.request.params.get('phone')).toBe('1234567890');
    expect(req.request.params.get('status')).toBe('active');

    req.flush({ data: [], meta: { total: 0, page: 2, size: 10, totalPages: 0 } });
  });

  it('should post registration payload to the public auth endpoint', () => {
    const payload = {
      full_name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '1234567890',
      password: 'Password123!',
      is_subscriber: true,
      is_terms_accept: true,
    };

    service.registerUser(payload).subscribe();

    const req = httpMock.expectOne((request) => request.url.includes('/auth/register'));

    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);

    req.flush({
      data: {
        full_name: 'Jane Doe',
        email: 'jane@example.com',
        phone: '1234567890'
      }
    });
  });
});
