import { ComponentFixture, TestBed } from '@angular/core/testing';

import { isSettingEnabled, Public } from './public';

describe('Public', () => {
  let component: Public;
  let fixture: ComponentFixture<Public>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Public],
    }).compileComponents();

    fixture = TestBed.createComponent(Public);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should parse the coming-soon flag from booleans and strings', () => {
    expect(isSettingEnabled(true)).toBeTrue();
    expect(isSettingEnabled('true')).toBeTrue();
    expect(isSettingEnabled(' TRUE ')).toBeTrue();
    expect(isSettingEnabled(false)).toBeFalse();
    expect(isSettingEnabled('false')).toBeFalse();
    expect(isSettingEnabled(null)).toBeFalse();
  });
});
