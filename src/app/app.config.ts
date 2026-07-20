import { APP_INITIALIZER, ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, TitleStrategy } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration, withNoHttpTransferCache } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors, withInterceptorsFromDi } from '@angular/common/http';
import { authInterceptor } from './interceptors/auth/auth-interceptor';
import { SettingsService } from './services/settings/settings-service';
import { catchError, firstValueFrom, of } from 'rxjs';
import { AppTitleStrategy } from './app-title-strategy';

const initializeSettings = (settingsService: SettingsService) => () =>
  firstValueFrom(
    settingsService.getSettings().pipe(
      catchError(() => of(null))
    )
  );

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(
      withInterceptors([authInterceptor]),
      withInterceptorsFromDi()
    ),
    provideRouter(routes),
    {
      provide: TitleStrategy,
      useClass: AppTitleStrategy,
    },
    provideClientHydration(withNoHttpTransferCache()),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeSettings,
      deps: [SettingsService],
      multi: true,
    },
  ]
};
