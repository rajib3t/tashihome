import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { EditUser } from './edit-user';
import { UserService } from '../../../../../services/user/user-service';
import { ApiService } from '../../../../../services/api/api-service';

describe('EditUser', () => {
  let component: EditUser;
  let fixture: ComponentFixture<EditUser>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditUser],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        UserService,
        ApiService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EditUser);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

