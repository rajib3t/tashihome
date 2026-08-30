import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { EditCustomer } from './edit-customer';
import { UserService } from '../../../../../services/user/user-service';
import { ApiService } from '../../../../../services/api/api-service';

describe('EditCustomer', () => {
  let component: EditCustomer;
  let fixture: ComponentFixture<EditCustomer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditCustomer],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        UserService,
        ApiService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EditCustomer);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

