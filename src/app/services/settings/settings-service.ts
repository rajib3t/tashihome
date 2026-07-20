import { computed, inject, Service, signal } from '@angular/core';
import { ApiService } from '../api/api-service';
import { catchError, map, Observable, tap, throwError } from 'rxjs';
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
    settingsData = computed(() => this.#settingsData());

    setSettingsData(data: any) {
      this.#settingsData.set(normalizeSettingsPayload(data));
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
      return this.apiService.protectedGet<any>('/settings/').pipe(
        map(response => response.data),
        tap(data => this.setSettingsData(data.data)),
       catchError(this.apiService.passthroughError)
      );
    }
}
