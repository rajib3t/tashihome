import { CommonModule } from '@angular/common';
import { Component, inject, signal, AfterViewInit, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Logo } from '../../../shared/components/common/logo/logo';
import { SettingsService } from '../../../services/settings/settings-service';
import { UserService } from '../../../services/user/user-service';
import { RegisterUserRequest } from '../../../services/user/user.model';

@Component({
  selector: 'app-register',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    Logo,
    RouterLink
  ],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register implements AfterViewInit {
  public readonly settingService = inject(SettingsService);
  private readonly userService = inject(UserService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  public readonly settingsData = computed(() => this.settingService.settingsData());
  public readonly registerForm = this.formBuilder.group({
    fullName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    agreeTerms: [false, [Validators.requiredTrue]],
    subscribe: [false],
  });
  public errorMessage = signal('');
  public showPassword = signal(false);
  public isSubmitting = signal(false);
  public successMessage = signal('');
  public passwordStrength = computed(() => {
    const password = this.registerForm.get('password')?.value || '';
    let score = 0;
    if (password.length >= 8) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    const percentages = [10, 35, 65, 85, 100];
    const colors = ['#E3F0F2', '#FAA52D', '#FAA52D', '#479FB5', '#0C4550'];
    const labels = ['Use 8+ characters with a number', 'Weak', 'Okay', 'Good', 'Strong password'];

    return {
      percentage: percentages[score],
      color: colors[score],
      label: password.length === 0 ? 'Use 8+ characters with a number' : labels[score]
    };
  });

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
    if (this.registerForm.invalid) {
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const { fullName, email, phone, password, subscribe, agreeTerms } = this.registerForm.value;

    const userData: RegisterUserRequest = {
      full_name: fullName ?? '',
      email: email ?? '',
      phone: phone ?? '',
      password: password ?? '',
      is_subscriber: !!subscribe,
      is_terms_accept: !!agreeTerms
    };

    this.userService.registerUser(userData).subscribe({
      next: (response) => {
        if (response.status === 'success' || response.status === 200) {
          this.registerForm.reset();
          this.successMessage.set(response.message || 'Registration successful! Please check your email for verification.');
        } else {
          this.errorMessage.set(response.message || 'Registration failed. Please try again.');
        }
        this.isSubmitting.set(false);
      },
      error: (err) => {
        const errorMsg = this.userService.apiService.extractApiErrorMessage(err);
        this.errorMessage.set(errorMsg || 'An error occurred. Please try again.');
        this.isSubmitting.set(false);
      },
    });
  }
}
