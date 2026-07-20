import { Component, inject, signal } from '@angular/core';
import { PageBreadcrumb } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb';
import { Card } from '../../../../shared/components/ui/card/card';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UploadImage } from '../../../../shared/components/common/upload-image/upload-image';
import { CommonModule } from '@angular/common';
import { SettingsService } from '../../../../services/settings/settings-service';
import { catchError, finalize } from 'rxjs';
import { throwError } from 'rxjs';

@Component({
  selector: 'app-setting',
  imports: [
    CommonModule,
    PageBreadcrumb ,
    Card,
    ReactiveFormsModule,
    UploadImage
  ],
  templateUrl: './setting.html',
  styleUrl: './setting.css',
})
export class Setting {
  private formBuilder = inject(FormBuilder);
  private settingsService = inject(SettingsService);


  public errorMessage = signal('');
  public showPassword = signal(false);
  public isSubmitting = signal(false);
  public logoPreview = signal('');
  public whiteLogoPreview = signal('');
  public faviconPreview = signal('');
  public comingBackgroundImagePreview = signal('');
  public comingSoonVideoPreview = signal('');
  public readonly settingForm = this.formBuilder.group({
    app_name: ['', Validators.required],
    app_logo: [null as File | string | null],
    white_logo: [null as File | string | null],
    app_favicon: [null as File | string | null],
    app_timezone: ['Asia/Kolkata', Validators.required],
    app_date_format: ['DD/MM/YYYY', Validators.required],
    app_time_format: ['12h', Validators.required],
    is_enabled_coming_soon: [false, Validators.required],
    coming_soon_message: [''],
    coming_background_image: [null as File | string | null],
    coming_soon_video: [null as File | string | null],
    launch_date:['']
  });


  ngOnInit() {
    this.settingsService.getSettings().subscribe({
      next: (response) => {
        const arrayPayload = Array.isArray(response) ? response : response?.data;
        const payload = Array.isArray(arrayPayload)
          ? arrayPayload.reduce<Record<string, string | null>>((accumulator, item) => {
              accumulator[item.name] = item.value ?? null;
              return accumulator;
            }, {})
          : response?.data && typeof response.data === 'object' && !Array.isArray(response.data)
            ? response.data
            : response;

        const settings = {
          app_name: payload?.app_name ?? '',
          app_logo: payload?.app_logo ?? null,
          white_logo: payload?.white_logo ?? null,
          app_favicon: payload?.app_favicon ?? null,
          app_timezone: payload?.app_timezone ?? 'Asia/Kolkata',
          app_date_format: payload?.app_date_format ?? 'DD/MM/YYYY',
          app_time_format: payload?.app_time_format ?? '12h',
          is_enabled_coming_soon: String(payload?.is_enabled_coming_soon ?? false) === 'true',
          coming_soon_message: payload?.coming_soon_message ?? '',
          coming_background_image: payload?.coming_background_image ?? null,
          coming_soon_video: payload?.coming_soon_video ?? null,
          launch_date: this.normalizeDateOnly(payload?.launch_date),
        };

        this.settingForm.patchValue(settings);
        this.logoPreview.set(settings.app_logo || '');
        this.whiteLogoPreview.set(settings.white_logo || '');
        this.faviconPreview.set(settings.app_favicon || '');
        this.comingBackgroundImagePreview.set(settings.coming_background_image || '');
        this.comingSoonVideoPreview.set(settings.coming_soon_video || '');
      },
      error: (error) => {
        console.error('Error fetching settings:', error);
      }
    });
  }

  private normalizeDateOnly(value: string | null | undefined) {
    if (!value) {
      return '';
    }

    const trimmed = String(value).trim();
    if (!trimmed) {
      return '';
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }

    const isoDateMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
    if (isoDateMatch) {
      return isoDateMatch[1];
    }

    const parsedDate = new Date(trimmed);
    if (!Number.isNaN(parsedDate.getTime())) {
      return new Date(
        parsedDate.getTime() - parsedDate.getTimezoneOffset() * 60000
      ).toISOString().slice(0, 10);
    }

    return trimmed.slice(0, 10);
  }

  save() {
    this.errorMessage.set('');

    if (this.settingForm.invalid) {
      this.settingForm.markAllAsTouched();
      this.errorMessage.set('Please fill in all required fields.');
      return;
    }

    this.isSubmitting.set(true);

    const formData = new FormData();
    const { 
      app_name,
      app_logo,
      white_logo,
      app_favicon,
      app_timezone,
      app_date_format,
      app_time_format,
      is_enabled_coming_soon,
      coming_soon_message,
      coming_background_image,
      coming_soon_video,
      launch_date
    } = this.settingForm.getRawValue();



    const appendFileOnly = (key: string, value: string | File | null | undefined) => {
      if (value instanceof File) {
        formData.append(key, value);
      }
    };

formData.append('app_name', app_name ?? '');
appendFileOnly('app_logo', app_logo);
appendFileOnly('white_logo', white_logo);
appendFileOnly('app_favicon', app_favicon);
formData.append('app_timezone', app_timezone ?? '');
formData.append('app_date_format', app_date_format ?? '');
formData.append('app_time_format', app_time_format ?? '');
formData.append('is_enabled_coming_soon', String(!!is_enabled_coming_soon));
formData.append('coming_soon_message', coming_soon_message ?? '');
appendFileOnly('coming_background_image', coming_background_image);
appendFileOnly('coming_soon_video', coming_soon_video);
formData.append('launch_date', this.normalizeDateOnly(launch_date));

// Debug: log FormData contents
console.log('FormData contents:');
for (const [key, value] of formData.entries()) {
  console.log(`${key}:`, value instanceof File ? `File: ${value.name} (${value.size} bytes)` : value);
}

    this.settingsService.saveSettings(formData).pipe(
      finalize(() => this.isSubmitting.set(false)),
      catchError((error) => {
        this.errorMessage.set(
          error?.error?.message ||
          error?.message ||
          'Unable to save settings. Please try again.'
        );
        return throwError(() => error);
      })
    ).subscribe({
      next: (response) => {
        this.settingsService.setSettingsData(response);
        this.errorMessage.set('Settings saved successfully.');
      }
    });
  }
  
  reset() {
    this.settingForm.reset();
  }
}
