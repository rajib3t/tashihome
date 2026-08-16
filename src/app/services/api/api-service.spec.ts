import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ApiService } from './api-service';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(ApiService);
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

  it('should add csrf headers to normal requests', () => {
    service.get('/test-endpoint').subscribe();

    const req = httpMock.expectOne((request) => request.url.includes('/test-endpoint'));

    expect(req.request.headers.get('X-CSRF-Token')).toBe('test-csrf-token');
    expect(req.request.headers.get('X-XSRF-TOKEN')).toBe('test-csrf-token');

    req.flush({ data: {} });
  });

  it('should add csrf headers to upload requests', () => {
    const formData = new FormData();
    formData.append('file', new Blob(['demo'], { type: 'text/plain' }), 'demo.txt');

    service.protectedUpload('/upload', formData).subscribe();

    const req = httpMock.expectOne((request) => request.url.includes('/upload'));

    expect(req.request.headers.get('X-CSRF-Token')).toBe('test-csrf-token');
    expect(req.request.headers.get('X-XSRF-TOKEN')).toBe('test-csrf-token');

    req.flush({ data: {} });
  });
});
