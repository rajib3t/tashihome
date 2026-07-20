import { Component, computed, inject, Input } from '@angular/core';
import { environment } from '../../../../../environments/environment';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SettingsService } from '../../../../services/settings/settings-service';
import { ThemeService } from '../../../../services/theme/theme-service';

@Component({
  selector: 'app-logo',
  imports: [
    CommonModule,
    RouterModule,
  ],
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
  @Input() tagline = 'CyberControl';
  @Input() glow = true;
}
