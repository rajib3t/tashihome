import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, signal, AfterViewInit, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
// Stronger email validator: stricter pattern and basic anti-spam checks
function strongEmailValidator(control: AbstractControl): ValidationErrors | null {
  const value = (control.value || '').toString().trim();
  if (!value) return null;

  // Basic stricter email regex: no consecutive dots, reasonable local part, and TLD length
  const emailRegex = /^[A-Za-z0-9]+(?:[._%+-][A-Za-z0-9]+)*@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,63}$/;
  if (!emailRegex.test(value)) return { invalidEmail: true };

  // Reject consecutive dots anywhere
  if (/\.\./.test(value)) return { invalidEmail: true };

  return null;
}

// E.164-like phone validator: require 8-15 digits and optional leading +
function e164PhoneValidator(control: AbstractControl): ValidationErrors | null {
  const value = (control.value || '').toString().trim();
  if (!value) return null;

  const digits = value.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) return { invalidPhone: true };

  const e164 = /^\+?[1-9]\d{7,14}$/;
  if (!e164.test(value) && !e164.test('+' + digits)) return { invalidPhone: true };

  return null;
}

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
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  public readonly settingsData = computed(() => this.settingService.settingsData());
  public readonly registerForm = this.formBuilder.group({
    fullName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email, strongEmailValidator]],
    phone: ['', [Validators.required, e164PhoneValidator]],
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

    this.userService.registerUser(userData).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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
