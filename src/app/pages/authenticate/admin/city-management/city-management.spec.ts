import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CityManagement } from './city-management';

describe('CityManagement', () => {
  let component: CityManagement;
  let fixture: ComponentFixture<CityManagement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CityManagement],
    }).compileComponents();

    fixture = TestBed.createComponent(CityManagement);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
