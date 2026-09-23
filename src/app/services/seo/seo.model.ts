export interface SeoConfig {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'place' | 'profile';
  robots?: string; // e.g. 'index, follow' or 'noindex, nofollow'
  canonical?: string;
  structuredData?: Record<string, unknown> | Array<Record<string, unknown>> | null;
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export const INDIAN_STATES_AND_UTS = new Set([
  'andhra pradesh', 'arunachal pradesh', 'assam', 'bihar', 'chhattisgarh',
  'goa', 'gujarat', 'haryana', 'himachal pradesh', 'jharkhand',
  'karnataka', 'kerala', 'madhya pradesh', 'maharashtra', 'manipur',
  'meghalaya', 'mizoram', 'nagaland', 'odisha', 'punjab',
  'rajasthan', 'sikkim', 'tamil nadu', 'telangana', 'tripura',
  'uttar pradesh', 'uttarakhand', 'west bengal',
  'andaman and nicobar islands', 'chandigarh', 'dadra and nagar haveli and daman and diu',
  'delhi', 'jammu and kashmir', 'ladakh', 'lakshadweep', 'puducherry'
]);

/**
 * Parse a contact address string and settings into a setting-driven Schema.org PostalAddress object
 */
export function parsePostalAddress(
  rawAddress?: string | null,
  settings?: Record<string, string | null> | null
): Record<string, unknown> | null {
  const raw = (rawAddress || '').trim();
  if (!raw && !settings?.['contact_city'] && !settings?.['contact_state'] && !settings?.['contact_address']) {
    return null;
  }

  // 1. Direct explicit settings have highest priority
  const explicitCountry = settings?.['contact_country'] || settings?.['country'] || settings?.['address_country'];
  const explicitRegion = settings?.['contact_state'] || settings?.['state'] || settings?.['contact_region'] || settings?.['address_region'];
  const explicitLocality = settings?.['contact_city'] || settings?.['city'] || settings?.['contact_locality'] || settings?.['address_locality'] || settings?.['locality'];
  const explicitPostalCode = settings?.['contact_pincode'] || settings?.['contact_postal_code'] || settings?.['pincode'] || settings?.['postal_code'];
  const explicitStreet = settings?.['contact_street'] || settings?.['street_address'];

  // 2. PIN extraction (6-digit Indian PIN)
  let postalCode = explicitPostalCode?.trim();
  if (!postalCode && raw) {
    const pinMatch = raw.match(/\b([1-9][0-9]{5})\b/);
    if (pinMatch) {
      postalCode = pinMatch[1];
    }
  }

  // 3. Country extraction and ISO normalization
  let addressCountry = 'IN';
  if (explicitCountry && explicitCountry.trim()) {
    const c = explicitCountry.trim().toUpperCase();
    addressCountry = c === 'INDIA' ? 'IN' : (c.length === 2 ? c : explicitCountry.trim());
  } else if (/\bindia\b/i.test(raw)) {
    addressCountry = 'IN';
  }

  // 4. Clean and parse address segments
  // Strip trailing country name/code (e.g. ", India", "India", ", IN")
  let working = raw.replace(/(?:,\s*)?\b(?:India|IN)\b\s*$/i, '').trim();

  // Split by comma
  const rawSegments = working.split(',').map((s) => s.trim()).filter((s) => s.length > 0);

  // Remove PIN code and stray hyphens from each segment
  const segments = rawSegments.map((s) => {
    return s.replace(/[-–—]?\s*\b[1-9][0-9]{5}\b/g, '').trim();
  }).filter((s) => s.length > 0);

  let addressRegion = explicitRegion?.trim();
  let addressLocality = explicitLocality?.trim();
  let streetAddress = explicitStreet?.trim();

  if (segments.length >= 3) {
    if (!addressRegion) {
      addressRegion = segments[segments.length - 1];
    }
    if (!addressLocality) {
      addressLocality = segments[segments.length - 2];
    }
    if (!streetAddress) {
      streetAddress = segments.slice(0, segments.length - 2).join(', ');
    }
  } else if (segments.length === 2) {
    const seg1Lower = segments[1].toLowerCase();
    if (INDIAN_STATES_AND_UTS.has(seg1Lower)) {
      if (!addressRegion) addressRegion = segments[1];
      if (addressLocality && addressLocality.toLowerCase() !== segments[0].toLowerCase()) {
        if (!streetAddress) streetAddress = segments[0];
      } else if (!addressLocality) {
        addressLocality = segments[0];
      }
    } else {
      if (!addressLocality) addressLocality = segments[1];
      if (!streetAddress) streetAddress = segments[0];
    }
  } else if (segments.length === 1) {
    const seg0Lower = segments[0].toLowerCase();
    if (INDIAN_STATES_AND_UTS.has(seg0Lower)) {
      if (!addressRegion) addressRegion = segments[0];
    } else if (addressLocality && addressLocality.toLowerCase() !== seg0Lower) {
      if (!streetAddress) streetAddress = segments[0];
    } else {
      if (!addressLocality) addressLocality = segments[0];
    }
  }

  // Fallback for streetAddress when city/state are already known from settings
  if (
    !streetAddress &&
    working &&
    (!addressLocality || working.toLowerCase() !== addressLocality.toLowerCase()) &&
    (!addressRegion || working.toLowerCase() !== addressRegion.toLowerCase())
  ) {
    streetAddress = working;
  }

  // Fallback: If no commas existed but a known state is embedded
  if (segments.length <= 1 && working) {
    for (const state of INDIAN_STATES_AND_UTS) {
      const regex = new RegExp(`\\b${state}\\b`, 'i');
      if (regex.test(working)) {
        if (!addressRegion) {
          addressRegion = state.replace(/\b\w/g, (c) => c.toUpperCase());
        }
        const beforeState = working.replace(regex, '').replace(/[-–—]?\s*\b[1-9][0-9]{5}\b/g, '').trim();
        if (beforeState && !addressLocality) {
          addressLocality = beforeState;
        }
        break;
      }
    }
  }

  const postalAddress: Record<string, unknown> = {
    '@type': 'PostalAddress'
  };

  if (streetAddress) {
    postalAddress['streetAddress'] = streetAddress;
  }
  if (addressLocality) {
    postalAddress['addressLocality'] = addressLocality;
  }
  if (addressRegion) {
    postalAddress['addressRegion'] = addressRegion;
  }
  if (postalCode) {
    postalAddress['postalCode'] = postalCode;
  }
  postalAddress['addressCountry'] = addressCountry;

  return postalAddress;
}

