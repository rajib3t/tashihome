import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HeaderPublic } from './header';

describe('HeaderPublic', () => {
  let component: HeaderPublic;
  let fixture: ComponentFixture<HeaderPublic>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderPublic],
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderPublic);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start with the menu closed', () => {
    expect(component.isMenuOpen).toBeFalse();
  });

  it('should toggle the mobile menu when the menu button is clicked', () => {
    const button = fixture.nativeElement.querySelector('button[aria-label="Toggle menu"]');

    expect(button).toBeTruthy();
    button.click();
    fixture.detectChanges();

    expect(component.isMenuOpen).toBeTrue();
  });
});
