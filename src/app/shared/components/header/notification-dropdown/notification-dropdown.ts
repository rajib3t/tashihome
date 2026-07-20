import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { DropdownItem } from '../../ui/dropdown/dropdown-item/dropdown-item';
import { Dropdown } from '../../ui/dropdown/dropdown';

@Component({
  selector: 'app-notification-dropdown',
  imports: [CommonModule,RouterModule, DropdownItem, Dropdown],
  templateUrl: './notification-dropdown.html',
  styleUrl: './notification-dropdown.css',
})
export class NotificationDropdown {
  isOpen = false;
  notifying = true;

  toggleDropdown() {
    this.isOpen = !this.isOpen;
    this.notifying = false;
  }

  closeDropdown() {
    this.isOpen = false;
  }
}
