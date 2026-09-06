// ==========================================
// Tax & GST Type Definitions
// ==========================================

export type TaxStatus = 'active' | 'inactive';
export type TaxType = 'percentage' | 'fixed';

export interface TaxItem {
  id: string; // UUID or string identifier
  name: string;
  code: string;
  rate: number;
  tax_type: TaxType;
  is_inclusive: boolean;
  is_default: boolean;
  gst_number?: string | null;
  legal_name?: string | null;
  address?: string | null;
  hsn_sac_code?: string | null;
  cgst_rate?: number | null;
  sgst_rate?: number | null;
  igst_rate?: number | null;
  description?: string | null;
  status: TaxStatus;
  created_at?: string;
  updated_at?: string;
}

export interface TaxCreatePayload {
  name: string;
  code: string;
  rate: number;
  tax_type?: TaxType;
  is_inclusive?: boolean;
  is_default?: boolean;
  gst_number?: string;
  legal_name?: string;
  address?: string;
  hsn_sac_code?: string;
  cgst_rate?: number;
  sgst_rate?: number;
  igst_rate?: number;
  description?: string;
  status?: TaxStatus;
}

export type TaxUpdatePayload = Partial<TaxCreatePayload>;

export interface TaxQueryFilters {
  page?: number;
  size?: number;
  search?: string;
  status?: TaxStatus | '';
  is_default?: boolean;
}

export interface PriceCalculationResult {
  baseAmount: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  isInclusive: boolean;
  taxRate: number;
  taxName?: string;
  taxCode?: string;
}

/**
 * Calculates booking price including tax and GST component breakdowns.
 */
export function calculateBookingPrice(
  pricePerNight: number,
  nights: number,
  numRooms: number = 1,
  discount: number = 0,
  tax?: {
    name?: string;
    code?: string;
    rate: number;
    isInclusive: boolean;
    cgstRate?: number | null;
    sgstRate?: number | null;
    igstRate?: number | null;
  }
): PriceCalculationResult {
  const safeNights = Math.max(1, nights);
  const safeRooms = Math.max(1, numRooms);
  const baseAmount = Math.round(pricePerNight * safeRooms * safeNights * 100) / 100;
  const taxableBase = Math.max(0, baseAmount - discount);

  if (!tax || tax.rate <= 0) {
    return {
      baseAmount,
      discountAmount: discount,
      taxAmount: 0,
      totalAmount: taxableBase,
      isInclusive: false,
      taxRate: 0,
      taxName: tax?.name,
      taxCode: tax?.code,
    };
  }

  if (tax.isInclusive) {
    // Net base before tax = Total / (1 + Rate/100)
    const netBase = taxableBase / (1 + tax.rate / 100);
    const taxAmount = Math.round((taxableBase - netBase) * 100) / 100;
    
    // Proportional breakdown for inclusive tax
    const cgstRate = tax.cgstRate ?? (tax.rate / 2);
    const sgstRate = tax.sgstRate ?? (tax.rate / 2);
    const cgstAmount = Math.round(netBase * (cgstRate / 100) * 100) / 100;
    const sgstAmount = Math.round(netBase * (sgstRate / 100) * 100) / 100;

    return {
      baseAmount,
      discountAmount: discount,
      taxAmount,
      totalAmount: taxableBase,
      cgstAmount,
      sgstAmount,
      isInclusive: true,
      taxRate: tax.rate,
      taxName: tax.name,
      taxCode: tax.code,
    };
  } else {
    // Exclusive: Tax = TaxableBase * (Rate / 100)
    const taxAmount = Math.round(taxableBase * (tax.rate / 100) * 100) / 100;
    const cgstRate = tax.cgstRate ?? (tax.rate / 2);
    const sgstRate = tax.sgstRate ?? (tax.rate / 2);
    const cgstAmount = Math.round(taxableBase * (cgstRate / 100) * 100) / 100;
    const sgstAmount = Math.round(taxableBase * (sgstRate / 100) * 100) / 100;

    return {
      baseAmount,
      discountAmount: discount,
      taxAmount,
      totalAmount: Math.round((taxableBase + taxAmount) * 100) / 100,
      cgstAmount,
      sgstAmount,
      isInclusive: false,
      taxRate: tax.rate,
      taxName: tax.name,
      taxCode: tax.code,
    };
  }
}

