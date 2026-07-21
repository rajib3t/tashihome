import { Component, computed, inject, OnInit } from '@angular/core';
import {  HeaderPublic } from './header/header';
import { RouterOutlet } from '@angular/router';
import { SettingsService } from '../../../services/settings/settings-service';
import { CommonModule } from '@angular/common';
import { ComingSoon } from '../../components/coming-soon/coming-soon';
import { catchError, of } from 'rxjs';

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
    ComingSoon
  ],
  templateUrl: './public.html',
  styleUrl: './public.css',
})
export class Public implements OnInit {
  public readonly settingService = inject(SettingsService);
  public readonly settingsData = computed(() => this.settingService.settingsData());
  public readonly isComingSoonEnabled = computed(() => isSettingEnabled(this.settingsData()?.['is_enabled_coming_soon']));
  menuItems: { label: string; route: string }[] = [
    { label: 'Home', route: '/' },
    { label: 'Login', route: '/login' },
  ];

  ngOnInit(): void {
    this.settingService.getPublicSettings().pipe(
      catchError(() => of(null))
    ).subscribe();
  }
}
