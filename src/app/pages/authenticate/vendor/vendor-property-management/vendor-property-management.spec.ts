import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VendorPropertyManagement } from './vendor-property-management';

describe('VendorPropertyManagement', () => {
  let component: VendorPropertyManagement;
  let fixture: ComponentFixture<VendorPropertyManagement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VendorPropertyManagement],
    }).compileComponents();

    fixture = TestBed.createComponent(VendorPropertyManagement);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
