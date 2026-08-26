import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../services/auth/auth-service';
import { Avatar } from '../../../../shared/components/users/avatar/avatar';

@Component({
  selector: 'app-profile',
  imports: [RouterLink, Avatar],
  styleUrl: './profile.css',
  templateUrl: './profile.html',
})
export class Profile {
  private readonly authService = inject(AuthService);

  public readonly authUser = this.authService.authUser;
  public readonly activeTab = signal<'trips' | 'saved' | 'reviews' | 'account'>('trips');

  public selectTab(tab: 'trips' | 'saved' | 'reviews' | 'account'): void {
    this.activeTab.set(tab);
  }
}
