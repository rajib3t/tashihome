export type RefundStatus = 'pending' | 'approved' | 'rejected' | 'processed';
export interface RefundPerson { id: string; full_name: string; email: string; }
export interface RefundBooking { id: string; booking_reference: string; }
export interface RefundPayment { id: string; amount: number; currency: string; gateway: string; transaction_id: string; status: string; refunded_amount: number; }
export interface RefundRequest {
  id: string; amount: number; reason: string; status: RefundStatus; approved_at?: string | null; created_at: string; updated_at: string;
  booking: RefundBooking; payment: RefundPayment; requester: RefundPerson; approver?: RefundPerson | null;
}
export interface RefundQuery { page?: number; size?: number; status?: RefundStatus | ''; booking_id?: string; sort_order?: 'asc' | 'desc'; }
export interface ProcessRefundResult { refund_request: RefundRequest; razorpay_refund_id: string; razorpay_status: string; }
