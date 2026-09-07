import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Profile } from './profile';
import { AuthService } from '../../../../services/auth/auth-service';
import { UserService } from '../../../../services/user/user-service';
import { BookingService } from '../../../../services/booking/booking-service';
import { TestimonialService } from '../../../../services/testimonial/testimonial-service';
import { RazorpayService } from '../../../../services/booking/razorpay-service';
import { SettingsService } from '../../../../services/settings/settings-service';
import { ApiService } from '../../../../services/api/api-service';

describe('Profile', () => {
  let component: Profile;
  let fixture: ComponentFixture<Profile>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Profile],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        AuthService,
        UserService,
        BookingService,
        TestimonialService,
        RazorpayService,
        SettingsService,
        ApiService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Profile);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
