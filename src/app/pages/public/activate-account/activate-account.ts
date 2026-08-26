import { AfterViewInit, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { of, switchMap } from 'rxjs';
import { RouterLink } from '@angular/router';
import { Logo } from '../../../shared/components/common/logo/logo';
import { AuthService } from '../../../services/auth/auth-service';

@Component({
  imports: [Logo, RouterLink],
  selector: 'app-activate-account',
  styleUrl: './activate-account.css',
  templateUrl: './activate-account.html',
})
export class ActivateAccount implements OnInit, AfterViewInit {
  
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  public readonly isLoading = signal(true);
  public readonly isActivated = signal(false);
  public readonly errorMessage = signal('');

  public ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token');

    if (!token) {
      this.errorMessage.set('This activation link is invalid or incomplete.');
      this.isLoading.set(false);
      return;
    }

    this.authService.checkActiveAccount(token).pipe(
      switchMap((response) => {
        const isAlreadyActive = response.status === 'success'
        return isAlreadyActive ? of(null) : this.authService.activateAccount(token);
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: () => {
        this.isActivated.set(true);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(this.authService.apiService.extractApiErrorMessage(error) || 'Unable to activate your account. The link may have expired.');
        this.isLoading.set(false);
      },
    });
  }

  public ngAfterViewInit(): void {
    if (typeof document === 'undefined') {
      return;
    }

    setTimeout(() => document.querySelectorAll('.reveal').forEach((element) => element.classList.add('in')), 100);
  }
}
