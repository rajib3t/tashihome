import { Component, ElementRef, EventEmitter, inject, Output, PLATFORM_ID, ViewChild } from '@angular/core';
import { AuthService } from '../../../../../services/auth/auth-service';
import { SidebarService } from '../../../../../services/sidebar/sidebar-service';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Logo } from '../../../../components/common/logo/logo';
import { ThemeToggle } from '../../../../components/common/theme-toggle/theme-toggle';
import { UserDropdown } from '../../../../components/header/user-dropdown/user-dropdown';
import { NotificationDropdown } from '../../../../components/header/notification-dropdown/notification-dropdown';

@Component({
  selector: 'app-header',
  imports: [
    CommonModule,
    RouterModule,
    ThemeToggle,
    UserDropdown,
    NotificationDropdown,
    Logo
  ],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  private platformId = inject(PLATFORM_ID);
  // Inject the singleton service
  authService = inject(AuthService);
  public authUser = this.authService.authUser;

  @Output() logOut = new EventEmitter();

  isApplicationMenuOpen = false;
  readonly isMobileOpen$;
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  constructor(public sidebarService: SidebarService) {
    this.isMobileOpen$ = this.sidebarService.isMobileOpen$;
    console.log(this.authUser())
  }
  handleToggle() {
    if (window.innerWidth >= 1280) {
      this.sidebarService.toggleExpanded();
    } else {
      this.sidebarService.toggleMobileOpen();
    }
  }

  toggleApplicationMenu() {
    this.isApplicationMenuOpen = !this.isApplicationMenuOpen;
  }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      document.addEventListener('keydown', this.handleKeyDown);
    }
  }

  ngOnDestroy() {
    if (isPlatformBrowser(this.platformId)) {
      document.removeEventListener('keydown', this.handleKeyDown);
    }
  }


  handleKeyDown = (event: KeyboardEvent) => {
    if (isPlatformBrowser(this.platformId)) {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        this.searchInput?.nativeElement.focus();
      }
    }
  };


  onLogout() {
    this.logOut.emit();
  }
}
