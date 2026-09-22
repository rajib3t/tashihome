export interface AgreementClause {
  id?: string;
  heading: string;
  content: string;
  body?: string;
  is_mandatory?: boolean;
}

export interface AgreementTemplateSettings {
  template_title: string;
  template_version: string;
  default_validity_days: number;
  operator_legal_name: string;
  operator_signatory_name: string;
  operator_signatory_role: string;
  operator_address: string;
  clauses: AgreementClause[];
}

export type AgreementTemplateType = 'rich_text' | 'pdf_upload';
export type AgreementTemplateStatus = 'active' | 'draft' | 'archived';

export interface AgreementTemplateItem {
  id: string; // public_id UUID
  name: string;
  version: string;
  description?: string | null;
  template_type: AgreementTemplateType;
  status: AgreementTemplateStatus;
  is_default: boolean;
  content_json?: string | null;
  pdf_file_key?: string | null;
  pdf_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CreateAgreementTemplatePayload {
  name: string;
  version?: string;
  description?: string;
  template_type: AgreementTemplateType;
  content_json?: string;
  status?: AgreementTemplateStatus;
}

export interface UpdateAgreementTemplatePayload {
  name?: string;
  version?: string;
  description?: string;
  template_type?: AgreementTemplateType;
  content_json?: string;
  status?: AgreementTemplateStatus;
}

export interface AgreementTemplateListResponse {
  success: boolean;
  message: string;
  data: AgreementTemplateItem[];
  meta?: {
    total?: number;
    page?: number;
    pages?: number;
    page_size?: number;
    size?: number;
    limit?: number;
    total_pages?: number;
  };
}

export interface AgreementTemplateResponse {
  success: boolean;
  message: string;
  data: AgreementTemplateItem;
}

export interface AgreementTemplatePreviewData {
  template_type: AgreementTemplateType;
  clauses?: Array<{ heading: string; body?: string; content?: string }>;
  pdf_url?: string;
}

export const DEFAULT_AGREEMENT_CLAUSES: AgreementClause[] = [
  {
    id: 'purpose_scope',
    heading: '1. Purpose & Scope of Partnership',
    content:
      "This Host Partnership & Service Agreement ('Agreement') governs the terms under which the Host lists and operates homestay accommodations on the TashiHome platform. TashiHome acts as a technology intermediary connecting travelers with licensed homestay hosts.",
    is_mandatory: true,
  },
  {
    id: 'standards_compliance',
    heading: '2. Homestay Standards & Regulatory Compliance',
    content:
      'The Host warrants that all listed homestay rooms are clean, hygienic, and compliant with local tourism, safety, and municipal hospitality guidelines. The Host agrees to maintain proper guest identification registers (Form C for foreign guests where applicable under Indian law) upon check-in.',
    is_mandatory: true,
  },
  {
    id: 'commission_settlement',
    heading: '3. Platform Commission & Payment Settlements',
    content:
      "TashiHome shall retain the agreed platform service fee percentage on all completed guest bookings. Net host earnings shall be disbursed directly to the Host's verified bank account or UPI address registered with TashiHome within 24 hours of successful guest check-in, subject to RazorpayX settlement cycles.",
    is_mandatory: true,
  },
  {
    id: 'rate_parity',
    heading: '4. Rate Parity & Booking Fulfillment',
    content:
      'The Host agrees not to offer identical rooms to walk-in guests or other distribution channels at rates lower than those published on the TashiHome platform for the corresponding dates. All confirmed reservations must be honored without unapproved cancellations.',
    is_mandatory: true,
  },
  {
    id: 'cancellation_refund',
    heading: '5. Cancellation & Guest Refund Policies',
    content:
      'Cancellations and refunds shall strictly follow the cancellation policy selected by the Host on the listing. In the event of an emergency cancellation initiated by the Host, the Host agrees to assist in re-accommodating affected guests or absorbing platform reallocation charges.',
    is_mandatory: true,
  },
  {
    id: 'indemnification_liability',
    heading: '6. Indemnification & Limitation of Liability',
    content:
      'The Host agrees to indemnify and hold harmless TashiHome Technologies, its directors, and affiliates against any property damage, physical injury, or regulatory penalties occurring on the homestay premises. TashiHome acts solely as a booking facilitator and is not liable for guest conduct or property disputes.',
    is_mandatory: true,
  },
  {
    id: 'electronic_consent',
    heading: '7. Electronic Contract Enforceability',
    content:
      'This agreement is executed electronically pursuant to the provisions of the Information Technology Act, 2000. The digital timestamp, IP address, and electronic signature hash generated upon execution serve as conclusive evidence of consent.',
    is_mandatory: true,
  },
];
