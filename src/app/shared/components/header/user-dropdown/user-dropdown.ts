import { Component, EventEmitter, inject, Output } from '@angular/core';
import { AuthService } from '../../../../services/auth/auth-service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Dropdown } from '../../ui/dropdown/dropdown';
import { DropdownItemTwo } from '../../ui/dropdown/dropdown-item/dropdown-item-two';

@Component({
  selector: 'app-user-dropdown',
  imports: [
    CommonModule, 
    RouterModule, 
    Dropdown, 
    DropdownItemTwo,  
    // Avatar
  ],
  templateUrl: './user-dropdown.html',
  styleUrl: './user-dropdown.css',
})
export class UserDropdown {
  @Output() logOut = new EventEmitter();
  private authService = inject(AuthService);
  authUser = this.authService.authUser; // live computed signal
  isOpen = false;

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
