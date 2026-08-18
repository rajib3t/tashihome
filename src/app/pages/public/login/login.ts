import { CommonModule } from '@angular/common';
import { Component, inject, signal, AfterViewInit, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../services/auth/auth-service';
import { Router, RouterLink } from '@angular/router';
import { LoginRequest } from '../../../services/auth/auth.model';
import { Logo } from '../../../shared/components/common/logo/logo';
import { SettingsService } from '../../../services/settings/settings-service';
import { UserRole } from '../../../services/user/user.model';

@Component({
  selector: 'app-login',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    Logo,
    RouterLink
  ],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements AfterViewInit {
  public readonly settingService = inject(SettingsService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  public readonly settingsData = computed(() => this.settingService.settingsData());
  public readonly loginForm = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
    rememberMe: [false],
  });
  public errorMessage = signal('');
  public showPassword = signal(false);
  public isSubmitting = signal(false);

  public togglePasswordVisibility() {
    this.showPassword.set(!this.showPassword());
  }

  public ngAfterViewInit() {
    // Trigger reveal animation
    if (typeof document !== 'undefined') {
      setTimeout(() => {
        document.querySelectorAll('.reveal').forEach(el => el.classList.add('in'));
      }, 100);
    }
  }

  public onSubmit() {
    if (this.loginForm.invalid) {
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const { email, password, rememberMe } = this.loginForm.value;

    const payload: LoginRequest = {
      email: email as string,
      password: password as string,
      rememberMe: !!rememberMe,
    };
    this.authService.login(payload).subscribe({
      next: (response) => {
        console.log('Login response:', response);
        if (response.status === 'success' || response.status === 200) {
          const userRole = response.data.user.role?.toLowerCase() as UserRole;
          console.log('User role:', userRole);
          this.redirectBasedOnRole(userRole);
        } else {
          this.errorMessage.set(response.message || 'Login failed. Please try again.');
        }
        this.isSubmitting.set(false);
      },
      error: (err) => {
        console.error('Login error:', err);
        const error = this.authService.apiService.extractApiErrorMessage(err);
        this.errorMessage.set(error || 'An error occurred. Please try again.');
        this.isSubmitting.set(false);
      },
    });
  }

  private redirectBasedOnRole(role: UserRole | undefined): void {
    console.log('Redirecting based on role:', role);
    switch (role) {
      case 'admin':
        console.log('Navigating to /admin');
        this.router.navigate(['/admin']).then(
          (success) => console.log('Navigation to /admin successful:', success),
          (error) => console.error('Navigation to /admin failed:', error)
        );
        break;
      case 'vendor':
        // Vendor routes are not configured yet, redirect to profile as fallback
        console.log('Navigating to /profile (vendor)');
        this.router.navigate(['/profile']).then(
          (success) => console.log('Navigation to /profile successful:', success),
          (error) => console.error('Navigation to /profile failed:', error)
        );
        break;
      case 'user':
        console.log('Navigating to /profile (user)');
        this.router.navigate(['/profile']).then(
          (success) => console.log('Navigation to /profile successful:', success),
          (error) => console.error('Navigation to /profile failed:', error)
        );
        break;
      default:
        // Fallback to home page if role is not recognized
        console.log('Navigating to / (fallback)');
        this.router.navigate(['/']).then(
          (success) => console.log('Navigation to / successful:', success),
          (error) => console.error('Navigation to / failed:', error)
        );
        break;
    }
  }
}
