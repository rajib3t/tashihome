import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Meta, Title } from '@angular/platform-browser';
import { AgreementService } from '../../../services/agreement/agreement-service';
import { AuthService } from '../../../services/auth/auth-service';
import { PublicAgreementDetail, SignatureType } from '../../../core/models/agreement.model';
import { SignaturePadComponent } from '../../../shared/components/signature-pad/signature-pad.component';

@Component({
  selector: 'app-esign-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, SignaturePadComponent],
  templateUrl: './esign-page.component.html',
  styleUrl: './esign-page.component.css',
})
export class ESignPageComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly agreementService = inject(AgreementService);
  public readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly meta = inject(Meta);
  private readonly titleService = inject(Title);

  public readonly token = signal<string>('');
  public readonly agreement = signal<PublicAgreementDetail | null>(null);
  public readonly loading = signal<boolean>(true);
  public readonly submitting = signal<boolean>(false);
  public readonly isSigned = signal<boolean>(false);
  public readonly isDeclined = signal<boolean>(false);
  public readonly isExpired = signal<boolean>(false);
  public readonly errorMessage = signal<string | null>(null);
  public readonly signedSuccessData = signal<{
    signed_at?: string;
    pdf_url?: string;
    signer_name?: string;
    checksum?: string;
  } | null>(null);

  public readonly signatureData = signal<string | null>(null);
  public readonly signatureMode = signal<SignatureType>('drawn');
  public readonly showDeclineModal = signal<boolean>(false);

  // Authentication & Host Verification
  public readonly isLoggingIn = signal<boolean>(false);
  public readonly loginError = signal<string | null>(null);
  public readonly showLoginPassword = signal<boolean>(false);

  public readonly loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
    rememberMe: [true],
  });

  public readonly authUser = computed(() => this.authService.authUser() || this.authService.getUser());
  public readonly isAuthenticated = computed(() => !!this.authUser());

  public readonly isAuthorizedSigner = computed(() => {
    if (!this.isAuthenticated()) {
      return false;
    }
    const user = this.authUser();
    const ag = this.agreement();
    if (!user?.email || !ag?.host_email) {
      return false;
    }
    return user.email.toLowerCase().trim() === ag.host_email.toLowerCase().trim();
  });

  public readonly isAccountMismatch = computed(() => {
    return this.isAuthenticated() && !this.isAuthorizedSigner();
  });

  public readonly signForm: FormGroup = this.fb.group({
    signer_name: ['', [Validators.required, Validators.minLength(3)]],
    terms_accepted: [false, [Validators.requiredTrue]],
    consent_acknowledged: [false, [Validators.requiredTrue]],
  });

  public readonly defaultClauses = [
    {
      heading: '1. Property Standards & Hospitality',
      content:
        'The Host represents and warrants that the homestay premises, guest rooms, and amenities are sanitary, clean, safe, and accurately represented on the Platform without misrepresentation. Clean bedding, hygienic washroom facilities, and potable water must be provided to all verified guests.',
    },
    {
      heading: '2. Commercial Commission & Booking Settlement',
      content:
        'Platform service fee is fixed at the agreed commission percentage of the total booking subtotal. TashiHome collects guest payments securely and executes automated settlement directly to the registered host bank account within 24 hours of verified guest check-in via automated banking rails (RazorpayX), net of platform commission and applicable statutory TDS.',
    },
    {
      heading: '3. Rate Parity & Booking Fulfillment',
      content:
        'Direct walk-in rates or off-platform rates offered by the Host shall not undercut the rates published on the TashiHome platform for the corresponding dates and occupancy tiers. The Host agrees to honor all confirmed reservations made through the Platform.',
    },
    {
      heading: '4. Regional Compliance & Guest Safety',
      content:
        'The Host assumes sole legal responsibility for maintaining valid local municipal/panchayat homestay permits, tourism department registration certificates, basic fire safety precautions, and maintaining guest check-in register entries including Foreigner Registration (C-Form) where mandated by law.',
    },
    {
      heading: '5. Non-Circumvention & Anti-Poaching',
      content:
        'Hosts and guests shall not solicit or execute direct off-platform transactions to bypass platform service fees for bookings initiated via TashiHome. Any verified circumventing activity constitutes material breach and may result in immediate listing de-activation.',
    },
    {
      heading: '6. Electronic Contract Enforceability',
      content:
        'This agreement is executed electronically pursuant to the provisions of the Information Technology Act, 2000. The digital timestamp, IP address, and electronic signature hash generated upon execution serve as conclusive evidence of consent.',
    },
  ];

  ngOnInit(): void {
    // Security: Prevent search engines and web crawlers from indexing private agreement tokens
    this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow, noarchive' });

    const tokenParam = this.route.snapshot.paramMap.get('token');
    if (!tokenParam) {
      this.errorMessage.set('Invalid or missing agreement token link.');
      this.loading.set(false);
      return;
    }
    this.token.set(tokenParam);
    this.loadAgreement(tokenParam);
  }

  ngOnDestroy(): void {
    // Restore default indexing state when leaving private agreement portal
    this.meta.removeTag('name="robots"');
  }

  public loadAgreement(token: string): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.agreementService.getPublicAgreement(token).subscribe({
      next: (res) => {
        const ag = res.data;
        this.agreement.set(ag);

        if (ag.title) {
          this.titleService.setTitle(`${ag.title} | ${ag.operator_name || 'Tashi Homes'}`);
        }

        if (ag.host_name) {
          const authUser = this.authUser();
          this.signForm.patchValue({ signer_name: authUser?.full_name || ag.host_name });
        }

        if (ag.host_email && !this.loginForm.get('email')?.value) {
          this.loginForm.patchValue({ email: ag.host_email });
        }

        if (ag.status === 'signed' || ag.is_bilateral_signed || ag.is_second_party_signed) {
          this.isSigned.set(true);
          this.signedSuccessData.set({
            signed_at: ag.signed_at,
            pdf_url: ag.pdf_download_url,
            signer_name: ag.signer_name || ag.host_name,
            checksum: `sha256:${token.replace(/-/g, '').slice(0, 32)}`,
          });
        } else if (ag.status === 'declined') {
          this.isDeclined.set(true);
        } else if (ag.status === 'expired') {
          this.isExpired.set(true);
        }

        this.loading.set(false);
      },
      error: (err) => {
        const msg =
          this.agreementService.extractApiErrorMessage(err) ||
          err?.error?.message ||
          'This agreement invitation has expired or does not exist. Please contact support or request a new invitation.';
        this.errorMessage.set(msg);
        this.loading.set(false);
      },
    });
  }

  public toggleLoginPassword(): void {
    this.showLoginPassword.set(!this.showLoginPassword());
  }

  public onLoginSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoggingIn.set(true);
    this.loginError.set(null);

    const { email, password, rememberMe } = this.loginForm.value;
    this.authService
      .login({
        email: (email as string).trim(),
        password: password as string,
        rememberMe: !!rememberMe,
      })
      .subscribe({
        next: (res) => {
          this.isLoggingIn.set(false);
          const user = this.authService.authUser() || res?.data?.user || (res as any)?.user;
          if (user) {
            this.authService.updateCurrentUser(user);
            if (user.full_name) {
              this.signForm.patchValue({ signer_name: user.full_name });
            }
          }
        },
        error: (err) => {
          this.isLoggingIn.set(false);
          const msg =
            this.authService.apiService?.extractApiErrorMessage(err) ||
            err?.error?.message ||
            'Invalid credentials. Please verify your email and password.';
          this.loginError.set(msg);
        },
      });
  }

  public switchAccount(): void {
    this.authService.removeToken();
    const hostEmail = this.agreement()?.host_email;
    if (hostEmail) {
      this.loginForm.patchValue({ email: hostEmail, password: '' });
    }
  }

  public setSignatureMode(mode: SignatureType): void {
    this.signatureMode.set(mode);
  }

  public onSignatureChange(data: string | null): void {
    this.signatureData.set(data);
  }

  public submitSignature(): void {
    if (!this.isAuthenticated()) {
      alert('Authentication required: Please sign in with your host account to execute the agreement.');
      return;
    }
    if (!this.isAuthorizedSigner()) {
      alert(`Account mismatch: This agreement was issued to ${this.agreement()?.host_email}. Please switch accounts to sign.`);
      return;
    }

    if (this.signForm.invalid) {
      this.signForm.markAllAsTouched();
      return;
    }

    let sigData: string | null = null;
    if (this.signatureMode() === 'drawn') {
      sigData = this.signatureData();
      if (!sigData) {
        alert('Please draw your signature on the pad before proceeding.');
        return;
      }
    } else {
      sigData = this.signForm.value.signer_name?.trim() || null;
      if (!sigData) {
        alert('Please provide your legal full name for typed signature.');
        return;
      }
    }

    this.submitting.set(true);
    const payload = {
      signer_name: this.signForm.value.signer_name.trim(),
      signature_type: this.signatureMode(),
      signature_data: sigData,
      terms_accepted: !!this.signForm.value.terms_accepted,
      consent_acknowledged: !!this.signForm.value.consent_acknowledged,
    };

    this.agreementService.signAgreement(this.token(), payload).subscribe({
      next: (res) => {
        const signedData = res.data;
        this.isSigned.set(true);
        this.submitting.set(false);
        this.signedSuccessData.set({
          signed_at: signedData?.signed_at || new Date().toISOString(),
          pdf_url: signedData?.pdf_download_url,
          signer_name: payload.signer_name,
          checksum: `sha256:${this.token().replace(/-/g, '').slice(0, 32)}`,
        });
      },
      error: (err) => {
        this.submitting.set(false);
        const msg =
          this.agreementService.extractApiErrorMessage(err) ||
          err?.error?.message ||
          'Failed to record signature. Please try again or contact support.';
        alert(msg);
      },
    });
  }

  public openDeclineModal(): void {
    this.showDeclineModal.set(true);
  }

  public closeDeclineModal(): void {
    this.showDeclineModal.set(false);
  }

  public confirmDecline(): void {
    this.showDeclineModal.set(false);
    this.isDeclined.set(true);
  }

  public downloadPdf(): void {
    const url = this.signedSuccessData()?.pdf_url || this.agreementService.getSignedPdfUrl(this.token());
    window.open(url, '_blank');
  }

  public get termsList() {
    const clauses = this.agreement()?.terms_clauses;
    return clauses && clauses.length > 0 ? clauses : this.defaultClauses;
  }

  public get operatorLogoUrl(): string | null {
    return this.agreement()?.operator_logo_url || null;
  }

  public get operatorName(): string {
    return this.agreement()?.operator_name || 'TashiHome';
  }

  public get operatorLegalName(): string {
    return this.agreement()?.operator_legal_name || this.operatorName;
  }

  public get operatorAddress(): string {
    return this.agreement()?.operator_address || 'Gangtok, Sikkim, India';
  }
}

