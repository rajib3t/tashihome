import { Component, inject } from '@angular/core';
import {  HeaderPublic } from './header/header';
import { RouterOutlet } from '@angular/router';
import { SettingsService } from '../../../services/settings/settings-service';
import { CommonModule } from '@angular/common';
import { ComingSoon } from '../../components/coming-soon/coming-soon';

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
export class Public {
  public readonly settingService = inject(SettingsService);
  menuItems: { label: string; route: string }[] = [
    { label: 'Home', route: '/' },
    { label: 'Login', route: '/login' },
  ];

  public settingsData = this.settingService.settingsData();
}
