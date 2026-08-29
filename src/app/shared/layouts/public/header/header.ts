import { Component, HostListener, inject, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Logo } from '../../../components/common/logo/logo';
import { Avatar } from '../../../components/users/avatar/avatar';
import { AuthService } from '../../../../services/auth/auth-service';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-public-header',
  imports: [CommonModule, RouterLink, Logo, Avatar],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class HeaderPublic {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  readonly assetUrl = environment.assetUrl;

  @Input() menuItems: { label: string; route: string }[] = [
    { label: 'Stays', route: '#stays' },
    { label: 'Experiences', route: '#experiences' },
    { label: 'Hosts', route: '#hosts' },
    { label: 'How it works', route: '#how' },
  ];

  isMenuOpen = false;
  isScrolled = false;
  readonly authUser = this.authService.authUser;
  isAuthenticated = computed(() => !!this.authService.authUser());

  get userAvatarUrl(): string | undefined {
    const url = this.authUser()?.is_profile_image_url;
    if (!url) return undefined;
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
      return url;
    }
    const base = this.assetUrl.endsWith('/') ? this.assetUrl : `${this.assetUrl}/`;
    const cleanPath = url.startsWith('/') ? url.substring(1) : url;
    return `${base}${cleanPath}`;
  }

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    if (typeof window !== 'undefined') this.isScrolled = window.scrollY > 40;
  }

  toggleMenu(): void { this.isMenuOpen = !this.isMenuOpen; }
  closeMenu(): void { this.isMenuOpen = false; }

  public signOut(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => {
        this.authService.removeToken();
        this.router.navigate(['/login']);
      },
    });
  }

  navigateToProfile(): void {
    const role = this.authService.authUser()?.role?.toLowerCase();
    if (role === 'admin') this.router.navigate(['/admin/profile']);
    else if (role === 'vendor') this.router.navigate(['/vendor/profile']);
    else if (role === 'user') this.router.navigate(['/user']);
    else this.router.navigate(['/login']);
  }
}
