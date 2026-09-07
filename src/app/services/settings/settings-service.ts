import { computed, inject, Service, signal } from '@angular/core';
import { ApiService } from '../api/api-service';
import { catchError, finalize, map, Observable, tap, throwError } from 'rxjs';
import { ApiResponse } from '../api/api-response.model';
import { SettingItem, SystemSettingsMap, toSettingsMap } from './setting.model';
import { environment } from '../../../environments/environment';

const normalizeSettingsPayload = (value: unknown): Record<string, string | null> => {
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

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export function applyDateFormat(
  dateInput: string | Date | number | null | undefined,
  formatPattern: string = 'DD/MM/YYYY'
): string {
  if (!dateInput) return '—';

  let date: Date;
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
    const [y, m, d] = dateInput.trim().split('-').map(Number);
    date = new Date(y, m - 1, d);
  } else {
    date = new Date(dateInput);
  }

  if (Number.isNaN(date.getTime())) {
    return String(dateInput);
  }

  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  const YYYY = String(year);
  const YY = String(year).slice(-2);
  const MMMM = MONTH_NAMES[month];
  const MMM = MONTH_SHORT[month];
  const MM = String(month + 1).padStart(2, '0');
  const M = String(month + 1);
  const DD = String(day).padStart(2, '0');
  const D = String(day);

  return formatPattern
    .replace(/\bYYYY\b/g, YYYY)
    .replace(/\bYY\b/g, YY)
    .replace(/\bMMMM\b/g, MMMM)
    .replace(/\bMMM\b/g, MMM)
    .replace(/\bMM\b/g, MM)
    .replace(/\bM\b/g, M)
    .replace(/\bDD\b/g, DD)
    .replace(/\bD\b/g, D);
}

export function applyDateTimeFormat(
  dateInput: string | Date | number | null | undefined,
  dateFormatPattern: string = 'DD/MM/YYYY',
  timeFormatPattern: string = '12h'
): string {
  if (!dateInput) return '—';

  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) {
    return String(dateInput);
  }

  const formattedDate = applyDateFormat(date, dateFormatPattern);

  const hours24 = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');

  let formattedTime = '';
  if (timeFormatPattern === '24h') {
    formattedTime = `${String(hours24).padStart(2, '0')}:${minutes}`;
  } else {
    const ampm = hours24 >= 12 ? 'PM' : 'AM';
    const hours12 = hours24 % 12 || 12;
    formattedTime = `${String(hours12).padStart(2, '0')}:${minutes} ${ampm}`;
  }

  return `${formattedDate}, ${formattedTime}`;
}

@Service()
export class SettingsService {
  public readonly apiService = inject(ApiService);
  public readonly assetUrl = environment.assetUrl;

  #settingsData = signal<Record<string, string | null>>({});
  #publicSettingsRequest: Observable<unknown> | null = null;
  
  settingsData = computed(() => this.#settingsData());
  settingsMap = computed<SystemSettingsMap>(() => toSettingsMap(this.#settingsData()));

  appName = computed(() => this.#settingsData()['app_name'] || environment.applicationName || 'Tashi Homes');
  appLogo = computed(() => this.#settingsData()['app_logo'] || null);
  whiteLogo = computed(() => this.#settingsData()['white_logo'] || null);
  appFavicon = computed(() => this.#settingsData()['app_favicon'] || null);
  dateFormat = computed(() => this.#settingsData()['app_date_format'] || 'DD/MM/YYYY');
  timeFormat = computed(() => this.#settingsData()['app_time_format'] || '12h');
  timezone = computed(() => this.#settingsData()['app_timezone'] || 'Asia/Kolkata');
  defaultCurrency = computed(() => this.#settingsData()['default_currency'] || 'INR');
  currencySymbol = computed(() => this.#settingsData()['currency_symbol'] || '₹');
  
  // Contact & Support
  contactEmail = computed(() => this.#settingsData()['contact_email'] || 'support@tashihomes.in');
  contactPhone = computed(() => this.#settingsData()['contact_phone'] || '+91 9876543210');
  contactAddress = computed(() => this.#settingsData()['contact_address'] || 'MG Marg, Gangtok, Sikkim - 737101, India');
  contactWhatsapp = computed(() => this.#settingsData()['contact_whatsapp'] || this.#settingsData()['contact_phone'] || '+91 9876543210');

  // Homestay & Booking Financials
  commissionPercentage = computed(() => Number(this.#settingsData()['default_commission_percentage'] ?? 10));
  serviceFeePercentage = computed(() => Number(this.#settingsData()['service_fee_percentage'] ?? 0));
  checkInTime = computed(() => this.#settingsData()['check_in_time'] || '14:00');
  checkOutTime = computed(() => this.#settingsData()['check_out_time'] || '11:00');
  minBookingDays = computed(() => Number(this.#settingsData()['min_booking_days'] ?? 1));
  maxBookingDays = computed(() => Number(this.#settingsData()['max_booking_days'] ?? 30));
  cancellationGraceHours = computed(() => Number(this.#settingsData()['cancellation_grace_period_hours'] ?? 24));

  // Social Links
  facebookUrl = computed(() => this.#settingsData()['facebook_url'] || null);
  instagramUrl = computed(() => this.#settingsData()['instagram_url'] || null);
  twitterUrl = computed(() => this.#settingsData()['twitter_url'] || null);
  linkedinUrl = computed(() => this.#settingsData()['linkedin_url'] || null);
  youtubeUrl = computed(() => this.#settingsData()['youtube_url'] || null);

  // SEO & Policies
  metaTitle = computed(() => this.#settingsData()['meta_title'] || 'Tashi Homes - Premium Homestays & Stays');
  metaDescription = computed(() => this.#settingsData()['meta_description'] || 'Discover handpicked homestays and heritage retreats across Northeast India.');
  metaKeywords = computed(() => this.#settingsData()['meta_keywords'] || 'homestay, sikkim, luxury stays');
  metaImage = computed(() => this.#settingsData()['meta_image'] || null);
  termsUrl = computed(() => this.#settingsData()['terms_and_conditions_url'] || '/terms');
  privacyUrl = computed(() => this.#settingsData()['privacy_policy_url'] || '/privacy-policy');
  refundUrl = computed(() => this.#settingsData()['refund_policy_url'] || '/refund-policy');

  // Coming Soon
  isComingSoonEnabled = computed(() => {
    const val = this.#settingsData()['is_enabled_coming_soon'];
    return val?.trim().toLowerCase() === 'true';
  });
  launchDate = computed(() => this.#settingsData()['launch_date'] || null);
  comingSoonMessage = computed(() => this.#settingsData()['coming_soon_message'] || 'We are preparing authentic Himalayan homestays for you. Stay tuned!');
  comingSoonBgImage = computed(() => this.#settingsData()['coming_background_image'] || null);
  comingSoonVideo = computed(() => this.#settingsData()['coming_soon_video'] || null);

  public formatPrice(amount: number): string {
    const symbol = this.currencySymbol();
    return `${symbol} ${Number(amount).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  public formatDate(dateInput: string | Date | number | null | undefined, customFormat?: string): string {
    const pattern = customFormat || this.#settingsData()['app_date_format'] || 'DD/MM/YYYY';
    return applyDateFormat(dateInput, pattern);
  }

  public formatDateTime(
    dateInput: string | Date | number | null | undefined,
    customDateFormat?: string,
    customTimeFormat?: string
  ): string {
    const datePattern = customDateFormat || this.#settingsData()['app_date_format'] || 'DD/MM/YYYY';
    const timePattern = customTimeFormat || this.#settingsData()['app_time_format'] || '12h';
    return applyDateTimeFormat(dateInput, datePattern, timePattern);
  }

  setSettingsData(data: any) {
    const normalized = normalizeSettingsPayload(data);
    this.#settingsData.set(normalized);
    this.syncFavicon(normalized['app_favicon']);
    this.syncMetaTags(normalized);
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

  private syncMetaTags(settings: Record<string, string | null>) {
    if (typeof document === 'undefined') {
      return;
    }

    const setMetaTag = (attribute: string, value: string, content: string | null | undefined) => {
      if (!content) return;
      let tag = document.querySelector<HTMLMetaElement>(`meta[${attribute}="${value}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attribute, value);
        document.head.appendChild(tag);
      }
      tag.content = content;
    };

    const desc = settings['meta_description'] || 'Discover handpicked homestays and heritage retreats across Northeast India.';
    const keywords = settings['meta_keywords'] || 'homestay, sikkim, luxury stays';
    const title = settings['meta_title'] || settings['app_name'] || 'Tashi Homes';
    const ogImage = settings['meta_image'] ? this.resolveAssetUrl(settings['meta_image']) : undefined;

    setMetaTag('name', 'description', desc);
    setMetaTag('name', 'keywords', keywords);
    setMetaTag('property', 'og:title', title);
    setMetaTag('property', 'og:description', desc);
    if (ogImage) {
      setMetaTag('property', 'og:image', ogImage);
    }
  }

  public resolveAssetUrl(url: string): string {
    if (!url) {
      return '';
    }

    if (/^(https?:)?\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) {
      return url;
    }

    const base = environment.assetUrl
      ? (environment.assetUrl.endsWith('/') ? environment.assetUrl : `${environment.assetUrl}/`)
      : '';
    const cleanPath = url.startsWith('/') ? url.substring(1) : url;
    return `${base}${cleanPath}`;
  }

  saveSettings(formData: FormData): Observable<ApiResponse<SettingItem[]>> {
    return this.apiService.protectedUpload<ApiResponse<SettingItem[]>>('admin/settings/', formData, {
      headers: {
        Accept: 'application/json',
      },
    }).pipe(
      map(response => response.data),
      catchError(this.apiService.passthroughError)
    );
  }

  getSettings(): Observable<any> {
    return this.apiService.protectedGet<any>('/admin/settings/fetch').pipe(
      map(response => response.data),
      tap(data => this.setSettingsData(data.data)),
      catchError(this.apiService.passthroughError)
    );
  }

  loadPublicSettings(): Observable<any> {
    if (this.#publicSettingsRequest) {
      return this.#publicSettingsRequest;
    }

    this.#publicSettingsRequest = this.apiService.get<any>('/public/settings/').pipe(
      map(response => response.data),
      tap(data => this.setSettingsData(data?.data ?? data)),
      catchError(() => {
        // Fallback to admin/settings/fetch if public/settings route differs
        return this.apiService.get<any>('/admin/settings/fetch').pipe(
          map(response => response.data),
          tap(data => this.setSettingsData(data?.data ?? data)),
          catchError((error) => {
            this.setSettingsData({});
            return throwError(() => error);
          })
        );
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
