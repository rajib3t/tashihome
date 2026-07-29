import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LocationManagement } from './location-management';

describe('LocationManagement', () => {
  let component: LocationManagement;
  let fixture: ComponentFixture<LocationManagement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LocationManagement],
    }).compileComponents();

    fixture = TestBed.createComponent(LocationManagement);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
