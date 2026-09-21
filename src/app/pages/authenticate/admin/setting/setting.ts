import { Component, inject, signal, OnInit, PLATFORM_ID, DestroyRef} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, catchError, throwError, of } from 'rxjs';
import { PageBreadcrumb } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb';
import { Card } from '../../../../shared/components/ui/card/card';
import { UploadImage } from '../../../../shared/components/common/upload-image/upload-image';
import { SettingsService } from '../../../../services/settings/settings-service';
import { SystemSettingsMap } from '../../../../services/settings/setting.model';
import { environment } from '../../../../../environments/environment';

export type SettingsTab = 'general' | 'contact' | 'financials' | 'seo' | 'coming-soon';

@Component({
  selector: 'app-setting',
  imports: [
    CommonModule,
    PageBreadcrumb,
    Card,
    ReactiveFormsModule,
    UploadImage,
    RouterLink
  ],
  templateUrl: './setting.html',
  styleUrl: './setting.css',
})
export class Setting implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly settingsService = inject(SettingsService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  public readonly assetUrl = environment.assetUrl;

  // Tab State
  public activeTab = signal<SettingsTab>('general');

  // Form State
  public errorMessage = signal<string>('');
  public successMessage = signal<string>('');
  public isSubmitting = signal<boolean>(false);
  public isLoading = signal<boolean>(false);

  // Previews
  public logoPreview = signal<string>('');
  public whiteLogoPreview = signal<string>('');
  public faviconPreview = signal<string>('');
  public ogImagePreview = signal<string>('');
  public comingBackgroundImagePreview = signal<string>('');
  public comingSoonVideoPreview = signal<string>('');

  public readonly settingForm: FormGroup = this.formBuilder.group({
    // General & Brand
    app_name: ['Tashi Homes', [Validators.required]],
    default_currency: ['INR', [Validators.required]],
    currency_symbol: ['₹', [Validators.required]],
    app_timezone: ['Asia/Kolkata', [Validators.required]],
    app_date_format: ['DD/MM/YYYY', [Validators.required]],
    app_time_format: ['12h', [Validators.required]],
    app_logo: [null as File | string | null],
    white_logo: [null as File | string | null],
    app_favicon: [null as File | string | null],

    // Contact & Support
    contact_email: ['support@tashihomes.in', [Validators.email]],
    contact_phone: ['+91 9876543210'],
    contact_address: ['MG Marg, Gangtok, Sikkim - 737101, India'],
    contact_whatsapp: ['+91 9876543210'],

    // Homestay & Booking Financials
    default_commission_percentage: [10.0, [Validators.min(0), Validators.max(100)]],
    service_fee_percentage: [0.0, [Validators.min(0), Validators.max(100)]],
    check_in_time: ['14:00'],
    check_out_time: ['11:00'],
    min_booking_days: [1, [Validators.min(1)]],
    max_booking_days: [30, [Validators.min(1)]],
    cancellation_grace_period_hours: [24, [Validators.min(0)]],

    // Social Links
    facebook_url: [''],
    instagram_url: [''],
    twitter_url: [''],
    linkedin_url: [''],
    youtube_url: [''],

    // SEO & Policies
    meta_title: ['Tashi Homes - Premium Homestays & Stays'],
    meta_description: ['Discover handpicked homestays and heritage retreats across Northeast India.'],
    meta_keywords: ['homestay, sikkim, luxury stays, northeast india'],
    meta_image: [null as File | string | null],
    og_image: [null as File | string | null],
    terms_and_conditions_url: ['/terms'],
    privacy_policy_url: ['/privacy-policy'],
    refund_policy_url: ['/refund-policy'],

    // Coming Soon
    is_enabled_coming_soon: [false],
    launch_date: [''],
    coming_soon_message: ['We are preparing authentic Himalayan homestays for you. Stay tuned!'],
    coming_background_image: [null as File | string | null],
    coming_soon_video: [null as File | string | null],
  });

  ngOnInit(): void {
    // Read active tab from query parameter if present
    this.route.queryParams.subscribe((params) => {
      const tabParam = params['tab']?.toLowerCase();
      if (tabParam === 'coming-soon' || tabParam === 'maintenance') {
        this.activeTab.set('coming-soon');
      } else if (tabParam === 'contact') {
        this.activeTab.set('contact');
      } else if (tabParam === 'financials' || tabParam === 'booking') {
        this.activeTab.set('financials');
      } else if (tabParam === 'seo' || tabParam === 'social') {
        this.activeTab.set('seo');
      } else if (tabParam === 'taxes' || tabParam === 'tax') {
        this.router.navigate(['/admin/tax-management']);
        return;
      } else if (tabParam === 'general') {
        this.activeTab.set('general');
      } else {
        this.activeTab.set('general');
        if (!params['tab'] && isPlatformBrowser(this.platformId)) {
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { tab: 'general' },
            queryParamsHandling: 'merge',
            replaceUrl: true,
          });
        }
      }
    });

    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.fetchSettings();
  }

  public setTab(tab: SettingsTab): void {
    this.activeTab.set(tab);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
    });
  }

  public onOgImageChange(file: File): void {
    this.settingForm.controls['og_image'].setValue(file);
    this.settingForm.controls['meta_image'].setValue(file);
  }

  public fetchSettings(): void {
    this.isLoading.set(true);

    this.settingsService.getSettings()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => {
          const arrayPayload = Array.isArray(response) ? response : response?.data;
          const payload: Record<string, string | null> = Array.isArray(arrayPayload)
            ? arrayPayload.reduce<Record<string, string | null>>((accumulator, item) => {
                accumulator[item.name] = item.value ?? null;
                return accumulator;
              }, {})
            : response?.data && typeof response.data === 'object' && !Array.isArray(response.data)
            ? response.data
            : response;

          const settings: SystemSettingsMap = {
            app_name: payload?.['app_name'] ?? 'Tashi Homes',
            default_currency: payload?.['default_currency'] ?? 'INR',
            currency_symbol: payload?.['currency_symbol'] ?? '₹',
            app_timezone: payload?.['app_timezone'] ?? 'Asia/Kolkata',
            app_date_format: payload?.['app_date_format'] ?? 'DD/MM/YYYY',
            app_time_format: payload?.['app_time_format'] ?? '12h',
            app_logo: payload?.['app_logo'] ?? null,
            white_logo: payload?.['white_logo'] ?? null,
            app_favicon: payload?.['app_favicon'] ?? null,

            contact_email: payload?.['contact_email'] ?? 'support@tashihomes.in',
            contact_phone: payload?.['contact_phone'] ?? '+91 9876543210',
            contact_address: payload?.['contact_address'] ?? 'MG Marg, Gangtok, Sikkim - 737101, India',
            contact_whatsapp: payload?.['contact_whatsapp'] ?? payload?.['contact_phone'] ?? '+91 9876543210',

            default_commission_percentage: payload?.['default_commission_percentage'] ?? 10.0,
            service_fee_percentage: payload?.['service_fee_percentage'] ?? 0.0,
            check_in_time: payload?.['check_in_time'] ?? '14:00',
            check_out_time: payload?.['check_out_time'] ?? '11:00',
            min_booking_days: payload?.['min_booking_days'] ?? 1,
            max_booking_days: payload?.['max_booking_days'] ?? 30,
            cancellation_grace_period_hours: payload?.['cancellation_grace_period_hours'] ?? 24,

            facebook_url: payload?.['facebook_url'] ?? '',
            instagram_url: payload?.['instagram_url'] ?? '',
            twitter_url: payload?.['twitter_url'] ?? '',
            linkedin_url: payload?.['linkedin_url'] ?? '',
            youtube_url: payload?.['youtube_url'] ?? '',

            meta_title: payload?.['meta_title'] ?? 'Tashi Homes - Premium Homestays & Stays',
            meta_description: payload?.['meta_description'] ?? 'Discover handpicked homestays and heritage retreats across Northeast India.',
            meta_keywords: payload?.['meta_keywords'] ?? 'homestay, sikkim, luxury stays',
            meta_image: payload?.['meta_image'] ?? payload?.['og_image'] ?? '',
            og_image: payload?.['og_image'] ?? payload?.['meta_image'] ?? '',
            terms_and_conditions_url: payload?.['terms_and_conditions_url'] ?? '/terms',
            privacy_policy_url: payload?.['privacy_policy_url'] ?? '/privacy-policy',
            refund_policy_url: payload?.['refund_policy_url'] ?? '/refund-policy',

            is_enabled_coming_soon: String(payload?.['is_enabled_coming_soon'] ?? false) === 'true',
            launch_date: this.normalizeDateOnly(payload?.['launch_date']),
            coming_soon_message: payload?.['coming_soon_message'] ?? 'We are preparing authentic Himalayan homestays for you. Stay tuned!',
            coming_background_image: payload?.['coming_background_image'] ?? null,
            coming_soon_video: payload?.['coming_soon_video'] ?? null,
          };

          this.settingForm.patchValue(settings);
          if (settings.app_logo) {
            this.logoPreview.set(this.settingsService.resolveAssetUrl(settings.app_logo));
          }
          if (settings.white_logo) {
            this.whiteLogoPreview.set(this.settingsService.resolveAssetUrl(settings.white_logo));
          }
          if (settings.app_favicon) {
            this.faviconPreview.set(this.settingsService.resolveAssetUrl(settings.app_favicon));
          }
          const ogImg = settings.og_image || settings.meta_image;
          if (ogImg) {
            this.ogImagePreview.set(this.settingsService.resolveAssetUrl(ogImg));
          }
          if (settings.coming_background_image) {
            this.comingBackgroundImagePreview.set(this.settingsService.resolveAssetUrl(settings.coming_background_image));
          }
          if (settings.coming_soon_video) {
            this.comingSoonVideoPreview.set(this.settingsService.resolveAssetUrl(settings.coming_soon_video));
          }
        },
        error: (error) => {
          console.warn('Notice loading settings from server:', error);
        }
      });
  }

  private normalizeDateOnly(value: string | null | undefined): string {
    if (!value) return '';
    const trimmed = String(value).trim();
    if (!trimmed) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const isoDateMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
    if (isoDateMatch) return isoDateMatch[1];
    const parsedDate = new Date(trimmed);
    if (!Number.isNaN(parsedDate.getTime())) {
      return new Date(parsedDate.getTime() - parsedDate.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    }
    return trimmed.slice(0, 10);
  }

  public save(): void {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (this.settingForm.invalid) {
      this.settingForm.markAllAsTouched();
      this.errorMessage.set('Please check all tabs and fill in required fields correctly.');
      return;
    }

    this.isSubmitting.set(true);

    const formData = new FormData();
    const raw = this.settingForm.getRawValue();

    const appendFileOnly = (key: string, value: string | File | null | undefined) => {
      if (value instanceof File) {
        formData.append(key, value);
      }
    };

    // General & Brand
    formData.append('app_name', raw.app_name ?? '');
    formData.append('default_currency', raw.default_currency ?? 'INR');
    formData.append('currency_symbol', raw.currency_symbol ?? '₹');
    formData.append('app_timezone', raw.app_timezone ?? 'Asia/Kolkata');
    formData.append('app_date_format', raw.app_date_format ?? 'DD/MM/YYYY');
    formData.append('app_time_format', raw.app_time_format ?? '12h');
    appendFileOnly('app_logo', raw.app_logo);
    appendFileOnly('white_logo', raw.white_logo);
    appendFileOnly('app_favicon', raw.app_favicon);

    // Contact
    formData.append('contact_email', raw.contact_email ?? '');
    formData.append('contact_phone', raw.contact_phone ?? '');
    formData.append('contact_address', raw.contact_address ?? '');
    formData.append('contact_whatsapp', raw.contact_whatsapp ?? '');

    // Financials
    formData.append('default_commission_percentage', String(raw.default_commission_percentage ?? 10));
    formData.append('service_fee_percentage', String(raw.service_fee_percentage ?? 0));
    formData.append('check_in_time', raw.check_in_time ?? '14:00');
    formData.append('check_out_time', raw.check_out_time ?? '11:00');
    formData.append('min_booking_days', String(raw.min_booking_days ?? 1));
    formData.append('max_booking_days', String(raw.max_booking_days ?? 30));
    formData.append('cancellation_grace_period_hours', String(raw.cancellation_grace_period_hours ?? 24));

    // Social
    formData.append('facebook_url', raw.facebook_url ?? '');
    formData.append('instagram_url', raw.instagram_url ?? '');
    formData.append('twitter_url', raw.twitter_url ?? '');
    formData.append('linkedin_url', raw.linkedin_url ?? '');
    formData.append('youtube_url', raw.youtube_url ?? '');

    // SEO
    formData.append('meta_title', raw.meta_title ?? '');
    formData.append('meta_description', raw.meta_description ?? '');
    formData.append('meta_keywords', raw.meta_keywords ?? '');
    appendFileOnly('og_image', raw.og_image);
    appendFileOnly('meta_image', raw.meta_image || raw.og_image);
    formData.append('terms_and_conditions_url', raw.terms_and_conditions_url ?? '');
    formData.append('privacy_policy_url', raw.privacy_policy_url ?? '');
    formData.append('refund_policy_url', raw.refund_policy_url ?? '');

    // Coming soon
    formData.append('is_enabled_coming_soon', String(!!raw.is_enabled_coming_soon));
    formData.append('launch_date', this.normalizeDateOnly(raw.launch_date));
    formData.append('coming_soon_message', raw.coming_soon_message ?? '');
    appendFileOnly('coming_background_image', raw.coming_background_image);
    appendFileOnly('coming_soon_video', raw.coming_soon_video);

    this.settingsService.saveSettings(formData)
      .pipe(
        finalize(() => this.isSubmitting.set(false)),
        catchError((error) => {
          const msg = this.settingsService.apiService.extractApiErrorMessage(error);
          this.errorMessage.set(msg || 'Settings saved locally.');
          this.settingsService.setSettingsData(raw);
          return of(null);
        })
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const arrayPayload = Array.isArray(response) ? response : (response as any)?.data;
          if (arrayPayload) {
            this.settingsService.setSettingsData(arrayPayload);
          } else {
            this.settingsService.setSettingsData(raw);
          }
          this.successMessage.set('System settings saved successfully.');
        }
      });
  }

  public reset(): void {
    this.fetchSettings();
  }
}
