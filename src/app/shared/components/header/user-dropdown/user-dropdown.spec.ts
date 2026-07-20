import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserDropdown } from './user-dropdown';

describe('UserDropdown', () => {
  let component: UserDropdown;
  let fixture: ComponentFixture<UserDropdown>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserDropdown],
    }).compileComponents();

    fixture = TestBed.createComponent(UserDropdown);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
