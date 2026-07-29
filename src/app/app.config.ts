import { ApplicationConfig, inject, PLATFORM_ID, provideAppInitializer, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, TitleStrategy } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration, withNoHttpTransferCache } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors, withInterceptorsFromDi } from '@angular/common/http';
import { authInterceptor } from './interceptors/auth/auth-interceptor';
import { SettingsService } from './services/settings/settings-service';
import { catchError, firstValueFrom, of, timeout } from 'rxjs';
import { AppTitleStrategy } from './app-title-strategy';
import { isPlatformBrowser } from '@angular/common';

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
    provideAppInitializer(() => {
      const settingsService = inject(SettingsService);
      const platformId = inject(PLATFORM_ID);

      if (!isPlatformBrowser(platformId)) {
        return;
      }

      return firstValueFrom(
        settingsService.getPublicSettings().pipe(
          timeout({ first: 5000 }),
          catchError(() => of(null))
        )
      ).catch(() => undefined);
    }),
  ]
};
