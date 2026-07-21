import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, TitleStrategy } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration, withNoHttpTransferCache } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors, withInterceptorsFromDi } from '@angular/common/http';
import { authInterceptor } from './interceptors/auth/auth-interceptor';
import { SettingsService } from './services/settings/settings-service';
import { catchError, firstValueFrom, of } from 'rxjs';
import { AppTitleStrategy } from './app-title-strategy';

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
      return firstValueFrom(
        settingsService.getPublicSettings().pipe(
          catchError(() => of(null))
        )
      );
    }),
  ]
};
