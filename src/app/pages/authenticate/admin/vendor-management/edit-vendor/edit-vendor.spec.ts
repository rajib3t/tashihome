import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from '../../../../services/user/user-service';

import { EditVendor } from './edit-vendor';

describe('EditVendor', () => {
  let component: EditVendor;
  let fixture: ComponentFixture<EditVendor>;
  let userService: jasmine.SpyObj<UserService>;

  beforeEach(async () => {
    userService = jasmine.createSpyObj<UserService>('UserService', ['getVendorById', 'updateImage']);
    userService.getVendorById.and.returnValue(of({ data: null }));
    userService.updateImage.and.returnValue(of({
      data: {
        id: 'vendor-1',
        full_name: 'Updated Vendor',
        email: 'updated@example.com',
        phone: '1234567890',
        role: 'vendor',
        status: 'active',
        is_profile_image_url: '/uploads/vendor.png'
      }
    } as any));

    await TestBed.configureTestingModule({
      imports: [EditVendor],
      providers: [
        { provide: UserService, useValue: userService },
        { provide: ActivatedRoute, useValue: { paramMap: of({ get: () => 'vendor-1' }) } },
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EditVendor);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should update the vendor with the uploaded image response', () => {
    const file = new File(['test'], 'avatar.png', { type: 'image/png' });

    component.vendorId.set('vendor-1');
    component.uploadAvatar(file);

    expect(userService.updateImage).toHaveBeenCalledWith('vendor-1', file);
    expect(component.vendor()).toEqual(jasmine.objectContaining({
      id: 'vendor-1',
      full_name: 'Updated Vendor',
      email: 'updated@example.com'
    }));
  });
});
