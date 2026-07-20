import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CountryManagement } from './country-management';

describe('CountryManagement', () => {
  let component: CountryManagement;
  let fixture: ComponentFixture<CountryManagement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CountryManagement],
    }).compileComponents();

    fixture = TestBed.createComponent(CountryManagement);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
