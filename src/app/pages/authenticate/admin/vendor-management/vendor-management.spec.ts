import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VendorManagement } from './vendor-management';

describe('VendorManagement', () => {
  let component: VendorManagement;
  let fixture: ComponentFixture<VendorManagement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VendorManagement],
    }).compileComponents();

    fixture = TestBed.createComponent(VendorManagement);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
