import { Component, computed, inject, signal, PLATFORM_ID } from '@angular/core';
import { SettingsService } from '../../../services/settings/settings-service';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { environment } from '../../../../environments/environment';
function formatLaunchDate(value: string | null | undefined): string | null {
  if (!value) return null;
 
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
 
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed);
}
 
function resolveMediaUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  if (/^(blob:|data:|https?:\/\/)/i.test(value)) return value;
  return value.startsWith('/') ? value : `/${value}`;
}
 
function getCountdownTarget(value: string | null | undefined): Date | null {
  if (!value) return null;
 
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
 
interface Countdown {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
  finished: boolean;
}
 
function formatCountdown(target: Date | null): Countdown {
  if (!target) {
    return { days: '00', hours: '00', minutes: '00', seconds: '00', finished: false };
  }
 
  const diff = Math.max(target.getTime() - Date.now(), 0);
  const totalSeconds = Math.floor(diff / 1000);
 
  return {
    days: String(Math.floor(totalSeconds / 86400)).padStart(2, '0'),
    hours: String(Math.floor((totalSeconds % 86400) / 3600)).padStart(2, '0'),
    minutes: String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0'),
    seconds: String(totalSeconds % 60).padStart(2, '0'),
    finished: diff === 0,
  };
}
@Component({
  selector: 'app-coming-soon',
  imports: [
    CommonModule
  ],
  templateUrl: './coming-soon.html',
  styleUrl: './coming-soon.css',
})
export class ComingSoon {
   private readonly settingService = inject(SettingsService);
   private readonly platformId = inject(PLATFORM_ID);

  public readonly assetUrl = environment.assetUrl;

  // mirrors useAtomValue(appName) / useAtomValue(whiteLogo)
  readonly name = this.settingService.settingsData()['app_name']?.trim() || 'TashiHome 1.0';
  readonly logo = this.settingService.settingsData()['white_logo'] || null;
 
  // mirrors useComingSoonSetting()
  readonly isLoading = signal(true);
  readonly data = signal<{
    video_url?: string | null;
    background_image_url?: string | null;
    launch_date?: string | null;
  } | null>(null);
 
  private readonly now = signal(Date.now());
  private timerId: ReturnType<typeof setInterval> | null = null;
 
  readonly media = computed(() => {
    const d = this.data();
    return {
      video: resolveMediaUrl(this.settingService.settingsData()['coming_soon_video']?.trim()),
      image: resolveMediaUrl(this.settingService.settingsData()['coming_background_image']?.trim()),
      launchDate: formatLaunchDate(this.settingService.settingsData()['launch_date']),
      countdownTarget: getCountdownTarget(this.settingService.settingsData()['launch_date']),
    };
  });
 
  readonly countdown = computed(() => {
    this.now(); // depend on the ticking clock
    return formatCountdown(this.media().countdownTarget);
  });


 
  ngOnInit(): void {
    
    this.data.set(this.settingService.settingsData());
    this.isLoading.set(false);
    if (isPlatformBrowser(this.platformId)) {
      this.restartTimer();
    }
  }
 
  ngOnDestroy(): void {
    if (this.timerId) clearInterval(this.timerId);
  }
 
  private restartTimer(): void {
    if (this.timerId) clearInterval(this.timerId);
    if (!this.media().countdownTarget) return;
 
    this.timerId = setInterval(() => this.now.set(Date.now()), 1000);
  }
}
