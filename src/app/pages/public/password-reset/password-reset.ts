import { AfterViewInit, Component, DestroyRef, inject, OnInit, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { AuthService } from "../../../services/auth/auth-service";
import { Logo } from "../../../shared/components/common/logo/logo";

@Component({
  imports: [ReactiveFormsModule, RouterLink, Logo],
  selector: "app-password-reset",
  styleUrl: "./password-reset.css",
  templateUrl: "./password-reset.html",
})
export class PasswordReset implements OnInit, AfterViewInit {
  private readonly route = inject(ActivatedRoute);
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private token = "";

  public readonly resetPasswordForm = this.formBuilder.group({
    password: ["", [Validators.required, Validators.minLength(8)]],
    confirmPassword: ["", [Validators.required]],
  });
  public readonly isLoading = signal(true);
  public readonly isSubmitting = signal(false);
  public readonly isReset = signal(false);
  public readonly isTokenInvalid = signal(false);
  public readonly errorMessage = signal("");

  public ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get("token") ?? this.route.snapshot.queryParamMap.get("token") ?? "";

    if (!this.token) {
      this.errorMessage.set("This password reset link is invalid or incomplete.");
      this.isTokenInvalid.set(true);
      this.isLoading.set(false);
      return;
    }

    this.authService.checkResetPasswordToken(this.token).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.isLoading.set(false),
      error: (error) => {
        this.errorMessage.set(this.authService.apiService.extractApiErrorMessage(error) || "This password reset link has expired or is invalid.");
        this.isTokenInvalid.set(true);
        this.isLoading.set(false);
      },
    });
  }

  public onSubmit(): void {
    if (this.resetPasswordForm.invalid) {
      this.resetPasswordForm.markAllAsTouched();
      return;
    }

    const password = this.resetPasswordForm.value.password as string;
    const confirmPassword = this.resetPasswordForm.value.confirmPassword as string;
    if (password !== confirmPassword) {
      this.errorMessage.set("Passwords do not match.");
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set("");
    this.authService.resetPassword({ token: this.token, password, confirm_password: confirmPassword })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (response.status === "success" || response.status === 200) {
            this.isReset.set(true);
          } else {
            this.errorMessage.set(response.message || "Unable to reset your password. Please try again.");
          }
          this.isSubmitting.set(false);
        },
        error: (error) => {
          this.errorMessage.set(this.authService.apiService.extractApiErrorMessage(error) || "Unable to reset your password. Please try again.");
          this.isSubmitting.set(false);
        },
      });
  }

  public ngAfterViewInit(): void {
    if (typeof document !== "undefined") {
      setTimeout(() => document.querySelectorAll(".reveal").forEach((element) => element.classList.add("in")), 100);
    }
  }
}
