import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { StaffManagement } from './staff-management';
import { StaffService } from '../../../../services/staff/staff-service';
import { ApiService } from '../../../../services/api/api-service';

describe('StaffManagement', () => {
  let component: StaffManagement;
  let fixture: ComponentFixture<StaffManagement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StaffManagement],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        StaffService,
        ApiService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StaffManagement);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

