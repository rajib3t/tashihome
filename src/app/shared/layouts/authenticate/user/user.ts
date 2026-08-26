import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../../services/auth/auth-service';
import { Logo } from '../../../components/common/logo/logo';

@Component({
  selector: 'app-user',
  imports: [RouterLink, RouterOutlet, Logo],
  styleUrl: './user.css',
  templateUrl: './user.html',
})
export class User {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  public readonly initials = computed(() => {
    const name = this.authService.authUser()?.full_name?.trim() || '';
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'U';
  });

  public logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => {
        this.authService.removeToken();
        this.router.navigate(['/login']);
      },
    });
  }
}
