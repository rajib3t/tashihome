import { CommonModule } from '@angular/common';
import { Component, inject, signal, AfterViewInit, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Logo } from '../../../shared/components/common/logo/logo';
import { UserService } from '../../../services/user/user-service';

@Component({
  selector: 'app-active-account',
  imports: [
    CommonModule,
    Logo,
    RouterLink
  ],
  templateUrl: './active-account.html',
  styleUrl: './active-account.css',
})
export class ActiveAccount implements OnInit, AfterViewInit {
  private readonly route = inject(ActivatedRoute);
  private readonly userService = inject(UserService);

  public token = signal<string>('');
  public isSubmitting = signal(false);
  public isActivated = signal(false);
  public errorMessage = signal('');
  public successMessage = signal('');

  public ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      console.log(params);
      const tokenFromParam = params.get('token');
      if (tokenFromParam) {
        this.token.set(tokenFromParam);
      }
    });

    this.route.queryParamMap.subscribe((queryParams) => {
      const tokenFromQuery = queryParams.get('token');
      if (tokenFromQuery && !this.token()) {
        this.token.set(tokenFromQuery);
      }
    });
  }

  public ngAfterViewInit() {
    // Trigger reveal animation
    if (typeof document !== 'undefined') {
      setTimeout(() => {
        document.querySelectorAll('.reveal').forEach((el) => el.classList.add('in'));
      }, 100);
    }
  }

  public onActivate() {
    const tokenVal = this.token();
    if (!tokenVal) {
      this.errorMessage.set('Activation token is missing. Please check the link from your email.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    this.userService.activateAccount(tokenVal).subscribe({
      next: (response) => {
        if (response.status === 'success' || response.status === 200) {
          this.successMessage.set(response.message || 'Your account has been successfully activated!');
          this.isActivated.set(true);
        } else {
          this.errorMessage.set(response.message || 'Activation failed. The link may be invalid or expired.');
        }
        this.isSubmitting.set(false);
      },
      error: (err) => {
        const errorMsg = this.userService.apiService.extractApiErrorMessage(err);
        this.errorMessage.set(errorMsg || 'Activation failed. The link may be invalid or expired.');
        this.isSubmitting.set(false);
      },
    });
  }
}
