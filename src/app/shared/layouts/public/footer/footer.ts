import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Logo } from '../../../components/common/logo/logo';
import { SettingsService } from '../../../../services/settings/settings-service';

export interface SocialLink {
  label: string;
  url: string;
  icon: string;
}

@Component({
  selector: 'app-public-footer',
  imports: [
    CommonModule,
    Logo,
    RouterLink,
  ],
  templateUrl: './footer.html',
  styleUrl: './footer.css',
})
export class PublicFooter {
  public readonly settingService = inject(SettingsService);
  public readonly currentYear = new Date().getFullYear();

  public readonly socialLinks = computed<SocialLink[]>(() => {
    const list: SocialLink[] = [];
    const fb = this.settingService.facebookUrl();
    const insta = this.settingService.instagramUrl();
    const twitter = this.settingService.twitterUrl();
    const linkedin = this.settingService.linkedinUrl();
    const youtube = this.settingService.youtubeUrl();

    if (fb) list.push({ label: 'Facebook', url: fb, icon: 'facebook' });
    if (insta) list.push({ label: 'Instagram', url: insta, icon: 'instagram' });
    if (twitter) list.push({ label: 'Twitter / X', url: twitter, icon: 'twitter' });
    if (linkedin) list.push({ label: 'LinkedIn', url: linkedin, icon: 'linkedin' });
    if (youtube) list.push({ label: 'YouTube', url: youtube, icon: 'youtube' });

    return list;
  });

  public isExternalUrl(url: string | null | undefined): boolean {
    if (!url) return false;
    return /^https?:\/\//i.test(url.trim());
  }
}

