// ─── Enums & Literals ──────────────────────────────────────────────────────────

export type PayoutStatus =
  | 'pending'
  | 'processing'
  | 'queued'
  | 'paid'
  | 'failed'
  | 'reversed'
  | 'rejected'
  | 'cancelled';

export type PayoutMode = 'NEFT' | 'IMPS' | 'RTGS' | 'UPI';

export type BankAccountType = 'bank_account' | 'vpa';

// ─── Entities ─────────────────────────────────────────────────────────────────

export interface PayoutVendor {
  id?: string;
  public_id?: string;
  email: string;
  phone: string | null;
  full_name: string | null;
}

export interface VendorBankAccount {
  id?: string;
  public_id?: string;
  account_type: BankAccountType;
  account_holder_name: string;
  account_number: string | null; // null for VPA
  ifsc_code: string | null;      // null for VPA
  bank_name: string | null;
  branch_name: string | null;
  upi_id: string | null;         // null for bank_account
  is_primary: boolean;
  is_verified: boolean;          // true = Razorpay Fund Account registered
  razorpay_contact_id: string | null;
  razorpay_fund_account_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payout {
  id?: string;
  public_id?: string;
  amount: number;                // Net disbursement amount (INR)
  gross_amount: number | null;
  commission_amount: number | null;
  commission_percentage?: number | null;
  currency: string;
  period_start: string;          // YYYY-MM-DD
  period_end: string;            // YYYY-MM-DD
  status: PayoutStatus;
  mode: PayoutMode | null;
  transaction_id: string | null;
  razorpay_payout_id: string | null;
  razorpay_fund_account_id: string | null;
  utr: string | null;            // Bank UTR after settlement
  failure_reason: string | null;
  notes: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  vendor?: PayoutVendor;
  bank_account?: VendorBankAccount;
}

export interface VendorEarningsSummary {
  vendor_public_id: string;
  vendor_name: string | null;
  vendor_email: string;
  period_start: string | null;
  period_end: string | null;
  completed_bookings_count: number;
  gross_booking_amount: number;
  commission_percentage: number;
  commission_amount: number;
  net_earned_amount: number;
  already_disbursed_amount: number;
  pending_payable_amount: number;
}

export interface RazorpayContactResponse {
  id: string;
  entity?: string;
  name?: string;
  contact?: string | null;
  email?: string | null;
  type?: string;
  reference_id?: string;
  active?: boolean;
  already_exists?: boolean;
}

export type RazorpayContact = RazorpayContactResponse;

// ─── Query & Payload Types ────────────────────────────────────────────────────

export interface PayoutQueryParams {
  page?: number;
  size?: number;
  vendor_id?: string;
  status?: PayoutStatus | '';
  period_start?: string;
  period_end?: string;
  sort_order?: 'asc' | 'desc';
  search?: string;
}

export interface CalculateEarningsParams {
  vendor_id: string;
  period_start?: string;
  period_end?: string;
  commission_percentage?: number;
}

export interface CreatePayoutPayload {
  vendor_id: string;
  bank_account_id?: string;
  gross_amount?: number;
  commission_amount?: number;
  commission_percentage?: number;
  amount: number;
  currency?: string;
  period_start: string;
  period_end: string;
  mode?: PayoutMode;
  notes?: string;
}

export interface ProcessPayoutPayload {
  mode?: PayoutMode;
  purpose?: string;
  narration?: string; // Max 30 chars
  notes?: Record<string, string>;
}

export interface CreateBankAccountPayload {
  account_type: BankAccountType;
  account_holder_name: string;
  account_number?: string;
  ifsc_code?: string;
  bank_name?: string;
  branch_name?: string;
  upi_id?: string;
  is_primary?: boolean;
  notes?: string;
}

export interface PayoutMetrics {
  totalDisbursed: number;
  pendingAmount: number;
  pendingCount: number;
  processingAmount: number;
  processingCount: number;
  queuedAmount: number;
  queuedCount: number;
  failedAmount: number;
  failedCount: number;
}
