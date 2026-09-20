import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { AgreementService } from '../../../../services/agreement/agreement-service';
import { AuthService } from '../../../../services/auth/auth-service';
import { PublicAgreementDetail } from '../../../../core/models/agreement.model';

@Component({
  selector: 'app-vendor-agreement',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './vendor-agreement.component.html',
})
export class VendorAgreementComponent implements OnInit {
  private readonly agreementService = inject(AgreementService);
  public readonly authService = inject(AuthService);
  private readonly titleService = inject(Title);

  public readonly loading = signal<boolean>(true);
  public readonly agreement = signal<PublicAgreementDetail | null>(null);
  public readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.titleService.setTitle('Host Partnership Agreement | Tashi Homes');
    this.loadMyAgreement();
  }

  public loadMyAgreement(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.agreementService.getMyAgreement().subscribe({
      next: (ag) => {
        this.agreement.set(ag);
        this.loading.set(false);
      },
      error: (err) => {
        const msg =
          this.agreementService.extractApiErrorMessage(err) ||
          'Failed to load your partnership agreement. Please try again or contact support.';
        this.errorMessage.set(msg);
        this.loading.set(false);
      },
    });
  }

  public downloadPdf(): void {
    const ag = this.agreement();
    if (ag?.pdf_download_url) {
      window.open(ag.pdf_download_url, '_blank');
      return;
    }
    // Fallback to authenticated download endpoint
    const url = this.agreementService.getVendorDownloadUrl();
    window.open(url, '_blank');
  }
}

