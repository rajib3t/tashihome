export interface SettingItem {
  name: string;
  value: string | null;
}

export interface SettingsResponse {
  status: string;
  message: string;
  data: SettingItem[];
}

export interface SystemSettingsMap {
  // Branding & General
  app_name?: string | null;
  app_logo?: string | null;
  white_logo?: string | null;
  app_favicon?: string | null;
  app_timezone?: string | null;
  app_date_format?: string | null;
  app_time_format?: string | null;
  default_currency?: string | null;
  currency_symbol?: string | null;

  // Contact & Support
  contact_email?: string | null;
  contact_phone?: string | null;
  contact_address?: string | null;
  contact_whatsapp?: string | null;

  // Homestay & Booking Financials
  default_commission_percentage?: string | number | null;
  service_fee_percentage?: string | number | null;
  check_in_time?: string | null;
  check_out_time?: string | null;
  min_booking_days?: string | number | null;
  max_booking_days?: string | number | null;
  cancellation_grace_period_hours?: string | number | null;

  // Social Links
  facebook_url?: string | null;
  instagram_url?: string | null;
  twitter_url?: string | null;
  linkedin_url?: string | null;
  youtube_url?: string | null;

  // SEO & Policies
  meta_title?: string | null;
  meta_description?: string | null;
  meta_keywords?: string | null;
  meta_image?: string | null;
  og_image?: string | null;
  terms_and_conditions_url?: string | null;
  privacy_policy_url?: string | null;
  refund_policy_url?: string | null;

  // Coming Soon
  is_enabled_coming_soon?: string | boolean | null;
  launch_date?: string | null;
  coming_soon_message?: string | null;
  coming_background_image?: string | null;
  coming_soon_video?: string | null;

  // Agreement Template & Legal Settings (Backend-Driven)
  agreement_title?: string | null;
  agreement_template_terms?: string | null;
  agreement_company_legal_name?: string | null;
  agreement_company_address?: string | null;
  agreement_default_expiry_days?: string | number | null;
  agreement_logo?: string | null;
  agreement_signatory_name?: string | null;
  agreement_signatory_role?: string | null;

  // Frontend Aliases
  agreement_template_title?: string | null;
  agreement_default_validity_days?: string | number | null;
  agreement_operator_legal_name?: string | null;
  agreement_operator_signatory_name?: string | null;
  agreement_operator_signatory_role?: string | null;
  agreement_operator_address?: string | null;
  agreement_template_clauses?: string | null;
}

// Convert SettingItem[] array to key-value object map
export function toSettingsMap(settingsList: SettingItem[] | Record<string, string | null>): SystemSettingsMap {
  if (Array.isArray(settingsList)) {
    return settingsList.reduce((acc, item) => {
      acc[item.name as keyof SystemSettingsMap] = item.value as any;
      return acc;
    }, {} as SystemSettingsMap);
  }
  if (settingsList && typeof settingsList === 'object') {
    return { ...settingsList } as SystemSettingsMap;
  }
  return {} as SystemSettingsMap;
}
