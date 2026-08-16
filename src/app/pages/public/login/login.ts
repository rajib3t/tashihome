import { CommonModule } from '@angular/common';
import { Component, inject, signal, AfterViewInit, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../services/auth/auth-service';
import { Router } from '@angular/router';
import { LoginRequest } from '../../../services/auth/auth.model';
import { Logo } from '../../../shared/components/common/logo/logo';
import { SettingsService } from '../../../services/settings/settings-service';

@Component({
  selector: 'app-login',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    Logo
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
    setTimeout(() => {
      document.querySelectorAll('.reveal').forEach(el => el.classList.add('in'));
    }, 100);
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
        if (response.status === 'success' || response.status === 200) {
          const userRole = response.data.user.role?.toLowerCase();
          if (userRole === 'admin') {
            this.router.navigate(['/admin']);
          }
          // else if (userRole === 'vendor') {
          //   this.router.navigate(['/vendor']);
          // } else {
          //   this.router.navigate(['/dashboard']);
          // }
        } else {
          this.errorMessage.set(response.message || 'Login failed. Please try again.');
        }
        this.isSubmitting.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.message || 'An error occurred. Please try again.');
        this.isSubmitting.set(false);
      },
    });
  }
}
