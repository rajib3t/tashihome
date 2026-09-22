import { inject, Injectable } from '@angular/core';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { environment } from '../environments/environment';
import { SettingsService } from './services/settings/settings-service';

@Injectable()
export class AppTitleStrategy extends TitleStrategy {
  private readonly titleService = inject(Title);
  private readonly settingsService = inject(SettingsService);

  override updateTitle(snapshot: RouterStateSnapshot) {
    const title = this.buildTitle(snapshot);
    const settings = this.settingsService.settingsData();
    const applicationName = settings?.['app_name']?.trim() || environment.applicationName || 'Tashihomes';
    const defaultMetaTitle = settings?.['meta_title']?.trim() || `${applicationName} | Verified Homestays in North Bengal`;
    const finalTitle = title ? `${title} | ${applicationName}` : defaultMetaTitle;

    // Use Title service (SSR & client safe)
    this.titleService.setTitle(finalTitle);
  }
}
