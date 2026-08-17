import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActiveAccount } from './active-account';

describe('ActiveAccount', () => {
  let component: ActiveAccount;
  let fixture: ComponentFixture<ActiveAccount>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActiveAccount],
    }).compileComponents();

    fixture = TestBed.createComponent(ActiveAccount);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
