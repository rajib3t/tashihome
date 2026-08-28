import { Component, computed, inject, OnDestroy, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { HeaderPublic } from './header/header';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { SettingsService } from '../../../services/settings/settings-service';
import { CommonModule } from '@angular/common';
import { ComingSoon } from '../../components/coming-soon/coming-soon';
import { catchError, of } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { PublicFooter } from './footer/footer';

export function isSettingEnabled(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    return value.trim().toLowerCase() === 'true';
  }

  return false;
}

@Component({
  selector: 'app-public',
  imports: [
    HeaderPublic,
    RouterOutlet,
    CommonModule,
    ComingSoon,
    PublicFooter,
  ],
  templateUrl: './public.html',
  styleUrl: './public.css',
})
export class Public implements OnInit {
  public readonly settingService = inject(SettingsService);
  public readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  public readonly settingsData = computed(() => this.settingService.settingsData());
  public readonly currentUrl = signal(this.router.url);
  public readonly isComingSoonEnabled = computed(() => {
    const url = this.currentUrl();
    if (
      url === '/login' ||
      url.startsWith('/stay/') ||
      url === '/our-story' ||
      url === '/story' ||
      url === '/brand-story'
    ) {
      return false;
    }
    return isSettingEnabled(this.settingsData()?.['is_enabled_coming_soon']);
  });
  private routerSubscription: { unsubscribe: () => void } | null = null;
  menuItems: { label: string; route: string }[] = [
    { label: 'Home', route: '/' },
    { label: 'Our Story', route: '/our-story' },
    { label: 'Login', route: '/login' },
  ];

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.routerSubscription = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.currentUrl.set(event.urlAfterRedirects);
      }
    });

    this.settingService.getPublicSettings().pipe(
      catchError(() => of(null))
    ).subscribe();
  }

  ngOnDestroy(): void {
    this.routerSubscription?.unsubscribe();
  }
}
