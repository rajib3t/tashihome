import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { EditStaff } from './edit-staff';
import { StaffService } from '../../../../../services/staff/staff-service';
import { ApiService } from '../../../../../services/api/api-service';

describe('EditStaff', () => {
  let component: EditStaff;
  let fixture: ComponentFixture<EditStaff>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditStaff],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        StaffService,
        ApiService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EditStaff);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

