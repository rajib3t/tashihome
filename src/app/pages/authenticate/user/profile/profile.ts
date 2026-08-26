import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../services/auth/auth-service';

@Component({
  selector: 'app-profile',
  imports: [RouterLink],
  styleUrl: './profile.css',
  templateUrl: './profile.html',
})
export class Profile {
  private readonly authService = inject(AuthService);

  public readonly authUser = this.authService.authUser;
  public readonly activeTab = signal<'trips' | 'saved' | 'reviews' | 'account'>('trips');
  public readonly initials = computed(() => {
    const name = this.authUser()?.full_name?.trim() || '';
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'U';
  });

  public selectTab(tab: 'trips' | 'saved' | 'reviews' | 'account'): void {
    this.activeTab.set(tab);
  }
}
