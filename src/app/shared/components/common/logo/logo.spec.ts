import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SettingsService } from '../../../../services/settings/settings-service';
import { Logo } from './logo';

describe('Logo', () => {
  let component: Logo;
  let fixture: ComponentFixture<Logo>;
  let settingsService: SettingsService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Logo],
    }).compileComponents();

    settingsService = TestBed.inject(SettingsService);
    fixture = TestBed.createComponent(Logo);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should use the settings API app name when available and fall back to environment otherwise', () => {
    settingsService.setSettingsData({ app_name: 'Custom Homestay' });

    expect(component.applicationName()).toBe('Custom Homestay');

    settingsService.setSettingsData({});

    expect(component.applicationName()).toBe('TashiHome 1.0');
  });
});
