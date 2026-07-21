import { computed, inject, Service, signal } from '@angular/core';
import { ApiService } from '../api/api-service';
import { catchError, finalize, map, Observable, tap, throwError } from 'rxjs';
import { ApiResponse } from '../api/api-response.model';
import { SettingItem } from './setting.model';



const normalizeSettingsPayload = (value: unknown) => {
  if (!value) {
    return {} as Record<string, string | null>;
  }

  if (Array.isArray(value)) {
    return value.reduce<Record<string, string | null>>((accumulator, item) => {
      if (item && typeof item === 'object' && 'name' in item && 'value' in item) {
        accumulator[String((item as { name?: string }).name)] = (item as { value?: string | null }).value ?? null;
      }
      return accumulator;
    }, {});
  }

  if (typeof value === 'object') {
    return value as Record<string, string | null>;
  }

  return {} as Record<string, string | null>;
};

@Service()
export class SettingsService {
    public readonly apiService = inject(ApiService);

    #settingsData = signal<Record<string, string | null>>({});
    #publicSettingsRequest: Observable<unknown> | null = null;
    settingsData = computed(() => this.#settingsData());

    setSettingsData(data: any) {
      const normalized = normalizeSettingsPayload(data);
      this.#settingsData.set(normalized);
      this.syncFavicon(normalized['app_favicon']);
    }

    private syncFavicon(faviconUrl: string | null | undefined) {
      if (typeof document === 'undefined') {
        return;
      }

      const resolvedHref = faviconUrl?.trim()
        ? this.resolveAssetUrl(faviconUrl.trim())
        : '/favicon.ico';

      let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');

      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }

      link.type = 'image/x-icon';
      link.href = resolvedHref;
    }

    private resolveAssetUrl(url: string) {
      if (/^(https?:)?\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) {
        return url;
      }

      return new URL(url, document.baseURI).toString();
    }

    saveSettings(formData: FormData): Observable<ApiResponse<SettingItem[]>> {
      return this.apiService.protectedUpload<ApiResponse<SettingItem[]>>('settings/', formData, {
        headers: {
          Accept: 'application/json',
        },
      }).pipe(
        map(response => response.data),
        catchError(this.apiService.passthroughError)
      );
    }


    getSettings(): Observable<any> {
      return this.apiService.protectedGet<any>('/settings/fetch').pipe(
        map(response => response.data),
        tap(data => this.setSettingsData(data.data)),
       catchError(this.apiService.passthroughError)
      );
    }

    loadPublicSettings(): Observable<any> {
      if (this.#publicSettingsRequest) {
        return this.#publicSettingsRequest;
      }

      this.#publicSettingsRequest = this.apiService.get<any>('/settings/fetch').pipe(
        map(response => response.data),
        tap(data => this.setSettingsData(data?.data ?? data)),
        catchError((error) => {
          this.setSettingsData({});
          return throwError(() => error);
        }),
        finalize(() => {
          this.#publicSettingsRequest = null;
        })
      );

      return this.#publicSettingsRequest;
    }

    getPublicSettings(): Observable<any> {
      return this.loadPublicSettings();
    }
}
