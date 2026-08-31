import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { BecomeHost } from './become-host';
import { HostService } from '../../../services/host/host-service';
import { CityService } from '../../../services/city/city-service';
import { ApiService } from '../../../services/api/api-service';

describe('BecomeHost Component', () => {
  let component: BecomeHost;
  let fixture: ComponentFixture<BecomeHost>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BecomeHost],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        ApiService,
        HostService,
        CityService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BecomeHost);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize hostForm with default values', () => {
    expect(component.hostForm).toBeDefined();
    expect(component.hostForm.get('property_type')?.value).toBe('home_stay');
    expect(component.hostForm.get('expected_rooms')?.value).toBe(2);
    expect(component.hostForm.get('agree_terms')?.value).toBe(false);
  });

  it('should require mandatory fields', () => {
    const form = component.hostForm;
    expect(form.valid).toBeFalse();

    form.patchValue({
      full_name: 'Dorjee Sherpa',
      email: 'dorjee@example.com',
      phone: '+91 9876543210',
      property_name: 'Kanchenjunga Vista Homestay',
      property_type: 'home_stay',
      city: 'Darjeeling',
      address: 'Lebong Cart Road, Darjeeling',
      expected_rooms: 3,
      agree_terms: true,
    });

    expect(form.valid).toBeTrue();
  });
});

