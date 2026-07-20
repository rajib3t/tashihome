import { Component } from '@angular/core';
import { SidebarService } from '../../../services/sidebar/sidebar-service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-backdrop',
  imports: [CommonModule],
  templateUrl: './backdrop.html',
  styleUrl: './backdrop.css',
})
export class Backdrop {
  public readonly isMobileOpen$;

  constructor(private sidebarService: SidebarService) {
    this.isMobileOpen$ = this.sidebarService.isMobileOpen$;
  }

  closeSidebar() {
    this.sidebarService.setMobileOpen(false);
  }
}