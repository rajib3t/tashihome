import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, inject, OnInit, signal } from '@angular/core';
import { AuthService } from '../../../../services/auth/auth-service';
import { User } from '../../../../services/user/user.model';
import { Avatar } from '../../../../shared/components/users/avatar/avatar';
import { environment } from '../../../../../environments/environment';
@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    Avatar
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile implements OnInit, AfterViewInit {
  public readonly assetUrl = environment.assetUrl;
  activeTab: 'trips' | 'saved' | 'reviews' | 'account' = 'trips';

  private authService = inject(AuthService);
  public readonly user = signal<User | undefined>(undefined);

  ngOnInit(): void {
    this.user.set(this.authService.authUser() ?? undefined);
  }

  ngAfterViewInit(): void {
    if (typeof document === 'undefined') {
      return;
    }

    queueMicrotask(() => {
      document.querySelectorAll('.reveal').forEach((el) => el.classList.add('in'));
    });
  }

  setTab(tab: 'trips' | 'saved' | 'reviews' | 'account'): void {
    this.activeTab = tab;
  }
}