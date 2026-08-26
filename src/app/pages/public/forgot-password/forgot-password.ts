import { AfterViewInit, Component, DestroyRef, inject, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { AuthService } from "../../../services/auth/auth-service";
import { Logo } from "../../../shared/components/common/logo/logo";

@Component({
  imports: [ReactiveFormsModule, RouterLink, Logo],
  selector: "app-forgot-password",
  styleUrl: "./forgot-password.css",
  templateUrl: "./forgot-password.html",
})
export class ForgotPassword implements AfterViewInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  public readonly forgotPasswordForm = this.formBuilder.group({
    email: ["", [Validators.required, Validators.email]],
  });
  public readonly errorMessage = signal("");
  public readonly isSubmitting = signal(false);
  public readonly isSent = signal(false);
  public readonly sentEmail = signal("");

  public onSubmit(): void {
    if (this.forgotPasswordForm.invalid) {
      this.forgotPasswordForm.markAllAsTouched();
      return;
    }

    const email = this.forgotPasswordForm.value.email as string;
    this.isSubmitting.set(true);
    this.errorMessage.set("");

    this.authService.forgotPassword({ email }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        if (response.status === "success" || response.status === 200) {
          this.sentEmail.set(email);
          this.isSent.set(true);
        } else {
          this.errorMessage.set(response.message || "Unable to send the reset link. Please try again.");
        }
        this.isSubmitting.set(false);
      },
      error: (error) => {
        this.errorMessage.set(
          this.authService.apiService.extractApiErrorMessage(error) || "Unable to send the reset link. Please try again.",
        );
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
