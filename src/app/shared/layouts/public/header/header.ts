import { Component, HostListener, inject, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Logo } from '../../../components/common/logo/logo';
import { AuthService } from '../../../../services/auth/auth-service';

@Component({
  selector: 'app-public-header',
  imports: [
    CommonModule,
    RouterLink,
    Logo
  ],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class HeaderPublic implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  @Input() menuItems: { label: string; route: string }[] = [
    { label: 'Stays', route: '#stays' },
    { label: 'Experiences', route: '#experiences' },
    { label: 'Hosts', route: '#hosts' },
    { label: 'How it works', route: '#how' },
  ];

  isMenuOpen = false;
  isScrolled = false;
  isAuthenticated = false;

  ngOnInit(): void {
    this.checkAuthStatus();
  }

  checkAuthStatus(): void {
    const user = this.authService.authUser();
    this.isAuthenticated = !!user;
  }

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    if (typeof window !== 'undefined') {
      this.isScrolled = window.scrollY > 40;
    }
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  closeMenu(): void {
    this.isMenuOpen = false;
  }
  
  navigateToProfile(): void {
    const user = this.authService.authUser();
    
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }
    
    const role = user?.role?.toLowerCase();
    
    if (role === 'admin') {
      this.router.navigate(['/admin']);
    } else if (role === 'vendor') {
      this.router.navigate(['/vendor']);
    } else if (role === 'user') {
      this.router.navigate(['/user/dashboard']);
    }
  }
}
