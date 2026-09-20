export type AgreementStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'partially_signed'
  | 'signed'
  | 'declined'
  | 'expired'
  | 'cancelled';

export type AgreementType =
  | 'host_onboarding'
  | 'commission_agreement'
  | 'supplemental';

export type SignatureType = 'typed' | 'drawn';

export interface VendorAgreementItem {
  id: string; // public_id UUID
  title: string;
  version: string;
  status: AgreementStatus;
  agreement_type: AgreementType;
  commission_percentage: number;
  sent_at: string | null;
  viewed_at: string | null;
  signed_at: string | null;
  expires_at: string;
  signer_name: string | null;
  signer_email: string | null;
  signer_phone: string | null;
  pdf_file_url: string | null;
  first_party_signer_name?: string | null;
  first_party_signer_role?: string | null;
  first_party_signature_type?: string | null;
  first_party_signature_data?: string | null;
  first_party_signed_at?: string | null;
  is_first_party_signed?: boolean | null;
  is_second_party_signed?: boolean | null;
  is_bilateral_signed?: boolean | null;
  notes?: string | null;
  vendor: {
    id: string;
    full_name: string;
    email: string;
    phone?: string;
    company?: {
      name: string;
      city?: string;
    };
  };
  created_at: string;
}

export interface PublicAgreementDetail {
  token: string;
  title: string;
  version: string;
  status: AgreementStatus;
  commission_percentage: number;
  expires_at: string;
  sent_at?: string | null;
  host_name: string;
  host_email: string;
  host_phone?: string;
  company_name: string;
  property_address?: string;
  city?: string;
  terms_clauses: Array<{
    heading: string;
    content: string;
  }>;
  pdf_download_url?: string;
  signed_at?: string;
  signer_name?: string;
  signer_email?: string;
  signature_type?: SignatureType;
  signature_data?: string;
  document_hash?: string;
  signer_ip?: string;
  first_party_signer_name?: string | null;
  first_party_signer_role?: string | null;
  first_party_signature_type?: string | null;
  first_party_signature_data?: string | null;
  first_party_signed_at?: string | null;
  is_first_party_signed?: boolean | null;
  is_second_party_signed?: boolean | null;
  is_bilateral_signed?: boolean | null;
  created_at?: string;
  agreement_type?: string;
  operator_name?: string;
  operator_legal_name?: string;
  operator_logo_url?: string;
  operator_address?: string;
}

export interface SignAgreementPayload {
  signer_name: string;
  signature_type: SignatureType;
  signature_data: string; // Base64 PNG data URL or typed font string
  terms_accepted: boolean;
  consent_acknowledged: boolean;
}

export interface AdminCountersignPayload {
  signer_name?: string;
  signer_role?: string;
  signature_type?: string;
  signature_data?: string;
}

export interface AdminOnboardHostPayload {
  full_name: string;
  email: string;
  phone: string;
  password?: string;
  company_name?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  send_agreement?: boolean;
  commission_percentage?: number;
  agreement_notes?: string;
}

export interface SendAgreementToVendorPayload {
  commission_percentage?: number;
  valid_days?: number;
  custom_notes?: string;
}

export interface AgreementListResponse {
  success: boolean;
  message: string;
  data: VendorAgreementItem[];
  meta?: {
    page?: number;
    limit?: number;
    size?: number;
    total?: number;
    total_pages?: number;
  };
}

export interface AgreementResponse {
  success: boolean;
  message: string;
  data: VendorAgreementItem;
}

export interface PublicAgreementResponse {
  success: boolean;
  message: string;
  data: PublicAgreementDetail;
}

