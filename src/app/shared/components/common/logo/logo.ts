import { Component, computed, inject, Input } from '@angular/core';
import { environment } from '../../../../../environments/environment';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SettingsService } from '../../../../services/settings/settings-service';
import { ThemeService } from '../../../../services/theme/theme-service';

@Component({
  selector: 'app-logo',
  imports: [CommonModule, RouterModule],
  templateUrl: './logo.html',
  styleUrl: './logo.css',
})
export class Logo {
  public readonly settingService = inject(SettingsService);
  private readonly themeService = inject(ThemeService);

  readonly theme$ = this.themeService.theme$;

  readonly applicationName = computed(() => {
    const settings = this.settingService.settingsData();
    return settings?.['app_name']?.trim() || environment.applicationName;
  });

  @Input() size = 36;
  @Input() withText = true;
  @Input() href: string | null = '/';
  @Input() className = '';
  @Input() tagline = '';
  @Input() glow = false;
  @Input() variant: 'auto' | 'white' | 'dark' = 'auto';
  @Input() textColor = '';

  getLogoSrc(theme: string | null): string {
    const settings = this.settingService.settingsData();

    if (this.variant === 'white') {
      return settings?.['white_logo'] || '/images/tashi-logo-white.svg';
    }

    if (this.variant === 'dark') {
      return settings?.['app_logo'] || '/images/tashi-logo-blue.svg';
    }

    // 'auto' based on active theme
    if (theme === 'dark') {
      return settings?.['white_logo'] || settings?.['app_logo'] || '/images/tashi-logo-white.svg';
    }
    return settings?.['app_logo'] || '/images/tashi-logo-blue.svg';
  }

  getTextClass(theme: string | null): string {
    if (this.textColor) {
      return this.textColor;
    }
    if (this.variant === 'white') {
      return 'text-cloud';
    }
    if (this.variant === 'dark') {
      return 'text-ink';
    }
    return theme === 'dark' ? 'text-white' : 'text-foreground dark:text-white';
  }
}
