import { Component, HostListener, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Logo } from '../../../components/common/logo/logo';

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
export class HeaderPublic {
  @Input() menuItems: { label: string; route: string }[] = [
    { label: 'Stays', route: '#stays' },
    { label: 'Experiences', route: '#experiences' },
    { label: 'Hosts', route: '#hosts' },
    { label: 'How it works', route: '#how' },
  ];

  isMenuOpen = false;
  isScrolled = false;

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
}
