import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { AuthService } from '../../../../services/auth/auth-service';
import { Router, RouterOutlet } from '@angular/router';
import { SidebarService } from '../../../../services/sidebar/sidebar-service';
import { NavItem, Sidebar } from '../../sidebar/sidebar'
import { Backdrop } from '../../backdrop/backdrop';
import { Header } from '../../header/authenticate/header/header';

@Component({
  selector: 'app-admin',
  imports: [
    CommonModule,
    Sidebar,
    Backdrop,
    Header,
    RouterOutlet
  ],
  templateUrl: './admin.html',
  styleUrl: './admin.css',
})
export class Admin {
  readonly isExpanded$;
  readonly isHovered$;
  readonly isMobileOpen$;

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly sidebarService = inject(SidebarService);
  constructor() {
    this.isExpanded$ = this.sidebarService.isExpanded$;
    this.isHovered$ = this.sidebarService.isHovered$;
    this.isMobileOpen$ = this.sidebarService.isMobileOpen$
  }
  get navItems(): NavItem[] {
    const role = this.authService.authUser()?.role?.toLowerCase();

    const baseItems: NavItem[] = [
      {
        icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M5.5 3.25C4.25736 3.25 3.25 4.25736 3.25 5.5V8.99998C3.25 10.2426 4.25736 11.25 5.5 11.25H9C10.2426 11.25 11.25 10.2426 11.25 8.99998V5.5C11.25 4.25736 10.2426 3.25 9 3.25H5.5ZM4.75 5.5C4.75 5.08579 5.08579 4.75 5.5 4.75H9C9.41421 4.75 9.75 5.08579 9.75 5.5V8.99998C9.75 9.41419 9.41421 9.74998 9 9.74998H5.5C5.08579 9.74998 4.75 9.41419 4.75 8.99998V5.5ZM5.5 12.75C4.25736 12.75 3.25 13.7574 3.25 15V18.5C3.25 19.7426 4.25736 20.75 5.5 20.75H9C10.2426 20.75 11.25 19.7427 11.25 18.5V15C11.25 13.7574 10.2426 12.75 9 12.75H5.5ZM4.75 15C4.75 14.5858 5.08579 14.25 5.5 14.25H9C9.41421 14.25 9.75 14.5858 9.75 15V18.5C9.75 18.9142 9.41421 19.25 9 19.25H5.5C5.08579 19.25 4.75 18.9142 4.75 18.5V15ZM12.75 5.5C12.75 4.25736 13.7574 3.25 15 3.25H18.5C19.7426 3.25 20.75 4.25736 20.75 5.5V8.99998C20.75 10.2426 19.7426 11.25 18.5 11.25H15C13.7574 11.25 12.75 10.2426 12.75 8.99998V5.5ZM15 4.75C14.5858 4.75 14.25 5.08579 14.25 5.5V8.99998C14.25 9.41419 14.5858 9.74998 15 9.74998H18.5C18.9142 9.74998 19.25 9.41419 19.25 8.99998V5.5C19.25 5.08579 18.9142 4.75 18.5 4.75H15ZM15 12.75C13.7574 12.75 12.75 13.7574 12.75 15V18.5C12.75 19.7426 13.7574 20.75 15 20.75H18.5C19.7426 20.75 20.75 19.7427 20.75 18.5V15C20.75 13.7574 19.7426 12.75 18.5 12.75H15ZM14.25 15C14.25 14.5858 14.5858 14.25 15 14.25H18.5C18.9142 14.25 19.25 14.5858 19.25 15V18.5C19.25 18.9142 18.9142 19.25 18.5 19.25H15C14.5858 19.25 14.25 18.9142 14.25 18.5V15Z" fill="currentColor"></path></svg>`,
        name: 'Dashboard',
        subItems: [{ name: 'Overview', path: '/admin' }],
      },
      {
        icon: `
          <svg
            viewBox="0 0 32 32"
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor">
            <path d="M16.114-0.011c-6.559 0-12.114 5.587-12.114 12.204 0 6.93 6.439 14.017 10.77 18.998 0.017 0.020 0.717 0.797 1.579 0.797h0.076c0.863 0 1.558-0.777 1.575-0.797 4.064-4.672 10-12.377 10-18.998 0-6.618-4.333-12.204-11.886-12.204zM16.515 29.849c-0.035 0.035-0.086 0.074-0.131 0.107-0.046-0.032-0.096-0.072-0.133-0.107l-0.523-0.602c-4.106-4.71-9.729-11.161-9.729-17.055 0-5.532 4.632-10.205 10.114-10.205 6.829 0 9.886 5.125 9.886 10.205 0 4.474-3.192 10.416-9.485 17.657zM16.035 6.044c-3.313 0-6 2.686-6 6s2.687 6 6 6 6-2.687 6-6-2.686-6-6-6zM16.035 16.044c-2.206 0-4.046-1.838-4.046-4.044s1.794-4 4-4c2.207 0 4 1.794 4 4 0.001 2.206-1.747 4.044-3.954 4.044z"/>
          </svg>
        `,
        name: 'Location',
        subItems: [
          {
            name:'Countries',
            path:'/admin/country-management'
          },
          {
            name:'Cities',
            path:'/admin/city-management'
          },
          {
            name:'Locations',
            path:'/admin/location-management'
          }
        ]
      },
      {
        icon:'<svg width="800px" height="800px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M9 12v1h1v-1H9zm-2 0v1h1v-1H7zm-2 0v1h1v-1H5zm4-4v1h1V8H9zM7 8v1h1V8H7zM5 8v1h1V8H5zm4-4v1h1V4H9zM7 5h1V4H7v1zM5 5h1V4H5v1zm4 3v1h1V8H9zM7 9h1V8H7v1zM5 9h1V8H5v1zm4 3v1h1v-1H9zm-2 1h1v-1H7v1zm-2 0h1v-1H5v1zm17 2V2H2v13h13v3h-2v1H4v1h9v1h5v-1h2v-1h-2v-1h-2v-3h6zM3 3h18v3H3V3zm0 4h18v3H3V7zm14 12v1h-3v-1h3zM3 14v-3h18v3H3zm6-1h1v-1H9v1zm0-4h1V8H9v1zm0-4h1V4H9v1zm-2 8h1v-1H7v1zm0-4h1V8H7v1zm0-4h1V4H7v1zm-2 8h1v-1H5v1zm0-4h1V8H5v1zm0-4h1V4H5v1zm4-1v1h1V4H9zM7 4v1h1V4H7zM5 4v1h1V4H5z"/><path fill="none" d="M0 0h24v24H0z"/></svg>',
        name:'Attributes',
        subItems:[
          {
            name:'Facilities',
            path:'/admin/facility-management'
          },
          {
            name:'Amenities',
            path:'/admin/amenity-management'
          }
        ]
      }
     
    ];







    return baseItems;
  }
  // Others nav items

  get containerClasses() {
    return [
      'flex-1',
      'transition-all',
      'duration-300',
      'ease-in-out',
      (this.isExpanded$ || this.isHovered$) ? 'xl:ml-[290px]' : 'xl:ml-[90px]',
      this.isMobileOpen$ ? 'ml-0' : ''
    ];
  }

  onLogout() {
    this.authService.logout().subscribe({
      next: (response) => {
        this.router.navigate(['login'])
        console.log('Logout successful:', response);
      },
      error: (error) => console.error(error),
    });
  }
}
