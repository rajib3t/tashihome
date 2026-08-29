import { Component, EventEmitter, inject, Output } from '@angular/core';
import { AuthService } from '../../../../services/auth/auth-service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Dropdown } from '../../ui/dropdown/dropdown';
import { DropdownItemTwo } from '../../ui/dropdown/dropdown-item/dropdown-item-two';
import { Avatar } from '../../users/avatar/avatar';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-user-dropdown',
  imports: [
    CommonModule, 
    RouterModule, 
    Dropdown, 
    DropdownItemTwo,  
    Avatar,
  ],
  templateUrl: './user-dropdown.html',
  styleUrl: './user-dropdown.css',
})
export class UserDropdown {
  @Output() logOut = new EventEmitter();
  private authService = inject(AuthService);
  authUser = this.authService.authUser; // live computed signal
  isOpen = false;
  readonly assetUrl = environment.assetUrl;

  get profileUrl(): string {
    const role = this.authUser()?.role?.toLowerCase();
    if (role === 'admin') return '/admin/profile';
    if (role === 'vendor') return '/vendor/profile';
    return '/user';
  }

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

  ngOnInit() {
    
  }

  toggleDropdown() {
    this.isOpen = !this.isOpen;
  }

  closeDropdown() {
    this.isOpen = false;
  }

  onLogout() {
    this.logOut.emit();
  }

  getInitials(name: string){
    return this.authService.userService.getInitials(name);
  }
}
