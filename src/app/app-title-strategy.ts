import { inject, Injectable } from '@angular/core';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { environment } from '../environments/environment';
import { SettingsService } from './services/settings/settings-service';

@Injectable()
export class AppTitleStrategy extends TitleStrategy {
  private readonly settingsService = inject(SettingsService);

  override updateTitle(snapshot: RouterStateSnapshot) {
    const title = this.buildTitle(snapshot);
    const settings = this.settingsService.settingsData();
    const applicationName = settings?.['app_name']?.trim() || environment.applicationName;
    const finalTitle = title ? `${title} | ${applicationName}` : applicationName;

    if (typeof document !== 'undefined') {
      document.title = finalTitle;
    }
  }
}
