import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { CustomerManagement } from './customer-management';
import { UserService } from '../../../../services/user/user-service';
import { ApiService } from '../../../../services/api/api-service';

describe('CustomerManagement', () => {
  let component: CustomerManagement;
  let fixture: ComponentFixture<CustomerManagement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomerManagement],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        UserService,
        ApiService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CustomerManagement);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

