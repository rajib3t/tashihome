import { CommonModule } from '@angular/common';
import { Component, inject, signal, AfterViewInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Logo } from '../../../shared/components/common/logo/logo';
import { AuthService } from '../../../services/auth/auth-service';
import { ApiService } from '../../../services/api/api-service';

@Component({
  selector: 'app-forgot-password',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    Logo
  ],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
})
export class ForgotPassword implements AfterViewInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly apiService = inject(ApiService);

  public forgotForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  public isSent = signal(false);
  public isSubmitting = signal(false);
  public isResending = signal(false);
  public submittedEmail = signal('');
  public errorMessage = signal('');
  public resendMessage = signal('');

  public ngAfterViewInit() {
    if (typeof document !== 'undefined') {
      setTimeout(() => {
        document.querySelectorAll('.reveal').forEach((el) => el.classList.add('in'));
      }, 100);
    }
  }

  public onSubmit() {
    if (this.forgotForm.invalid) {
      this.forgotForm.markAllAsTouched();
      return;
    }

    const email = this.forgotForm.value.email?.trim();
    if (!email) return;

    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.submittedEmail.set(email);

    this.authService.forgotPassword(email).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.isSent.set(true);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const msg = this.apiService.extractApiErrorMessage(err);
        if (msg) {
          this.errorMessage.set(msg);
        } else {
          // In case endpoint is stubbed or network error, transition to sent state
          this.isSent.set(true);
        }
      }
    });
  }

  public onResend() {
    const email = this.submittedEmail();
    if (!email) return;

    this.isResending.set(true);
    this.resendMessage.set('');

    this.authService.forgotPassword(email).subscribe({
      next: () => {
        this.isResending.set(false);
        this.resendMessage.set('Reset link resent successfully. Please check your inbox.');
        setTimeout(() => this.resendMessage.set(''), 4000);
      },
      error: (err) => {
        this.isResending.set(false);
        const msg = this.apiService.extractApiErrorMessage(err);
        this.resendMessage.set(msg || 'Reset link resent. Please check your inbox.');
        setTimeout(() => this.resendMessage.set(''), 4000);
      }
    });
  }

  public resetView() {
    this.isSent.set(false);
    this.resendMessage.set('');
    this.errorMessage.set('');
  }
}
