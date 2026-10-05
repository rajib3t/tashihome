import { PropertyData, PublicPropertyItem } from '../services/property/property.model';

/**
 * Returns the physical address for a property, prioritizing detailed street/physical address
 * (manual_address, address_details, address, address_line1, etc.) and including location, city, state, postal code.
 */
export function getPhysicalAddress(
  item: Partial<PropertyData> | Partial<PublicPropertyItem> | null | undefined
): string {
  if (!item) return '';

  const manualAddr =
    item.manual_address ||
    item.address_details ||
    (item as any)?.manualAddress ||
    (item as any)?.addressDetails;

  const line1 = (manualAddr?.address_line1 || (item as any)?.address_line1 || '')?.trim();
  const line2 = (manualAddr?.address_line2 || (item as any)?.address_line2 || '')?.trim();

  // 1. If structured physical street address lines are present
  if (line1 || line2) {
    const parts: string[] = [];
    if (line1) parts.push(line1);
    if (line2) parts.push(line2);

    const locName = (item.location?.name || (item as any)?.location || '')?.trim();
    if (locName && !parts.some((p) => p.toLowerCase().includes(locName.toLowerCase()))) {
      parts.push(locName);
    }

    const cityName = (manualAddr?.city || item.city?.name || (item as any)?.city || '')?.trim();
    if (cityName && !parts.some((p) => p.toLowerCase().includes(cityName.toLowerCase()))) {
      parts.push(cityName);
    }

    const state = (manualAddr?.state || (item as any)?.state || '')?.trim();
    if (state && !parts.some((p) => p.toLowerCase().includes(state.toLowerCase()))) {
      parts.push(state);
    }

    const postalCode = (manualAddr?.postal_code || (item as any)?.postal_code || (item as any)?.pin_code || '')?.trim();
    if (postalCode && !parts.some((p) => p.includes(postalCode))) {
      parts.push(postalCode);
    }

    const country = (manualAddr?.country || (item as any)?.country || '')?.trim();
    if (country && !parts.some((p) => p.toLowerCase().includes(country.toLowerCase()))) {
      parts.push(country);
    }

    if (parts.length > 0) {
      return parts.join(', ');
    }
  }

  // 2. Direct physical address string
  const rawAddress = (item.address || (item as any)?.address || '')?.trim();
  if (rawAddress) {
    const parts: string[] = [rawAddress];
    const locName = (item.location?.name || (item as any)?.location || '')?.trim();
    if (locName && !rawAddress.toLowerCase().includes(locName.toLowerCase())) {
      parts.push(locName);
    }

    const cityName = (item.city?.name || (item as any)?.city || '')?.trim();
    if (cityName && !rawAddress.toLowerCase().includes(cityName.toLowerCase())) {
      parts.push(cityName);
    }

    return parts.join(', ');
  }

  // 3. Fallback to location and city
  const fallbackParts: string[] = [];
  const fallbackLoc = (item.location?.name || (item as any)?.location || '')?.trim();
  const fallbackCity = (item.city?.name || (item as any)?.city || '')?.trim();

  if (fallbackLoc) fallbackParts.push(fallbackLoc);
  if (fallbackCity && !fallbackParts.some((p) => p.toLowerCase().includes(fallbackCity.toLowerCase()))) {
    fallbackParts.push(fallbackCity);
  }

  if (fallbackParts.length > 0) {
    return fallbackParts.join(', ');
  }

  return 'Himalayan stay';
}
