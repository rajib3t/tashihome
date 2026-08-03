import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompanyCard } from './company-card';

describe('CompanyCard', () => {
  let component: CompanyCard;
  let fixture: ComponentFixture<CompanyCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompanyCard],
    }).compileComponents();

    fixture = TestBed.createComponent(CompanyCard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
