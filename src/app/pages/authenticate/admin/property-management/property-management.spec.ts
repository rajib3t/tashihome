import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PropertyManagement } from './property-management';

describe('PropertyManagement', () => {
  let component: PropertyManagement;
  let fixture: ComponentFixture<PropertyManagement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PropertyManagement],
    }).compileComponents();

    fixture = TestBed.createComponent(PropertyManagement);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create with a multi-step property form', () => {
    expect(component).toBeTruthy();
    expect(component.wizardSteps.length).toBeGreaterThan(1);
    expect(component.currentStep()).toBe(0);
    expect(component.propertyForm).toBeTruthy();
  });
});
