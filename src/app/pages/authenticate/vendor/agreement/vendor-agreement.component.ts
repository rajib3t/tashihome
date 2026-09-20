import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DomSanitizer, SafeResourceUrl, Title } from '@angular/platform-browser';
import { AgreementService } from '../../../../services/agreement/agreement-service';
import { AuthService } from '../../../../services/auth/auth-service';
import { PublicAgreementDetail, SIGNATURE_FONT_OPTIONS } from '../../../../core/models/agreement.model';
import { Modal } from '../../../../shared/components/ui/modal/modal';

@Component({
  selector: 'app-vendor-agreement',
  standalone: true,
  imports: [CommonModule, RouterModule, Modal],
  templateUrl: './vendor-agreement.component.html',
})
export class VendorAgreementComponent implements OnInit, OnDestroy {
  private readonly agreementService = inject(AgreementService);
  public readonly authService = inject(AuthService);
  private readonly titleService = inject(Title);
  private readonly sanitizer = inject(DomSanitizer);

  public readonly loading = signal<boolean>(true);
  public readonly agreement = signal<PublicAgreementDetail | null>(null);
  public readonly errorMessage = signal<string | null>(null);

  // PDF Preview & Silent Download State
  public readonly isPreviewModalOpen = signal<boolean>(false);
  public readonly isPreviewLoading = signal<boolean>(false);
  public readonly previewError = signal<string | null>(null);
  public readonly previewPdfUrl = signal<SafeResourceUrl | null>(null);
  public readonly isDownloadingPdf = signal<boolean>(false);
  private currentPreviewBlob: Blob | null = null;
  private currentPreviewBlobUrl: string | null = null;

  ngOnInit(): void {
    this.titleService.setTitle('Host Partnership Agreement | Tashi Homes');
    this.loadMyAgreement();
  }

  ngOnDestroy(): void {
    this.cleanupPreviewBlob();
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
      heading: '3. Host Payout Rails & Statutory Compliance',
      content:
        'Settlements are processed electronically to the verified host bank account registered on file. The host acknowledges that statutory Tax Deducted at Source (TDS) under Section 194-O of the Income Tax Act shall be deducted and remitted where applicable.',
    },
    {
      heading: '4. Local Tourism Compliance & Safety',
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

  public get termsList(): Array<{ heading: string; content: string }> {
    const ag: any = this.agreement();
    const clauses = ag?.terms_clauses;
    return clauses && clauses.length > 0 ? clauses : this.defaultClauses;
  }

  private getPdfUrl(): string {
    const ag: any = this.agreement();
    return (
      ag?.pdf_file_url ||
      ag?.pdf_download_url ||
      ag?.pdf_url ||
      ag?.file_url ||
      (ag?.id ? `/public/agreements/${ag.id}/pdf` : '') ||
      (ag?.token ? `/public/agreements/${ag.token}/pdf` : '') ||
      this.agreementService.getVendorDownloadUrl()
    );
  }

  public previewPdf(): void {
    const ag: any = this.agreement();
    if (!ag) return;

    this.previewError.set(null);
    this.cleanupPreviewBlob();
    this.isPreviewModalOpen.set(true);
    this.isPreviewLoading.set(true);

    const url = this.getPdfUrl();
    const fallbackId = ag?.id || ag?.token;
    this.agreementService.fetchPdfBlob(url, fallbackId).subscribe({
      next: (blob) => {
        this.currentPreviewBlob = blob;
        this.currentPreviewBlobUrl = URL.createObjectURL(blob);
        this.previewPdfUrl.set(
          this.sanitizer.bypassSecurityTrustResourceUrl(this.currentPreviewBlobUrl)
        );
        this.isPreviewLoading.set(false);
      },
      error: (err) => {
        this.isPreviewLoading.set(false);
        this.previewError.set(
          this.agreementService.extractApiErrorMessage(err) ||
            'Failed to load agreement PDF. Please try downloading directly instead.'
        );
      },
    });
  }

  public closePreviewModal(): void {
    this.isPreviewModalOpen.set(false);
    this.cleanupPreviewBlob();
  }

  private cleanupPreviewBlob(): void {
    if (this.currentPreviewBlobUrl) {
      URL.revokeObjectURL(this.currentPreviewBlobUrl);
      this.currentPreviewBlobUrl = null;
    }
    this.currentPreviewBlob = null;
    this.previewPdfUrl.set(null);
  }

  public downloadCurrentPreview(): void {
    const ag: any = this.agreement();
    const idStr = ag?.id || ag?.token || 'agreement';
    const filename = `TashiHome-Host-Agreement-${idStr.slice(0, 8)}.pdf`;
    if (this.currentPreviewBlob) {
      this.agreementService.downloadBlob(this.currentPreviewBlob, filename);
    } else {
      this.downloadPdf();
    }
  }

  public downloadPdf(): void {
    const ag: any = this.agreement();
    const url = this.getPdfUrl();
    const fallbackId = ag?.id || ag?.token;
    const idStr = ag?.id || ag?.token || 'agreement';
    const filename = `TashiHome-Host-Agreement-${idStr.slice(0, 8)}.pdf`;
    this.isDownloadingPdf.set(true);

    this.agreementService.fetchPdfBlob(url, fallbackId).subscribe({
      next: (blob) => {
        this.isDownloadingPdf.set(false);
        this.agreementService.downloadBlob(blob, filename);
      },
      error: (err) => {
        this.isDownloadingPdf.set(false);
        const msg =
          this.agreementService.extractApiErrorMessage(err) ||
          'Failed to download agreement PDF. Please try again or contact support.';
        alert(msg);
      },
    });
  }

  public getSignatureFontFamily(fontId?: string | null): string {
    if (!fontId) return "'Dancing Script', cursive";
    const found = SIGNATURE_FONT_OPTIONS.find((f) => f.id === fontId);
    return found ? found.font_family : "'Dancing Script', cursive";
  }
}

