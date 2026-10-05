import { describe, it, expect } from 'vitest';
import { getPhysicalAddress } from './address.utils';

describe('Address Utility (getPhysicalAddress)', () => {
  it('returns empty string for null or undefined', () => {
    expect(getPhysicalAddress(null)).toBe('');
    expect(getPhysicalAddress(undefined)).toBe('');
  });

  it('formats address using manual_address with address_line1, address_line2, city, state, postal_code, country', () => {
    const prop = {
      name: 'Mountain View Homestay',
      manual_address: {
        address_line1: 'Upper Sichey, House 14',
        address_line2: 'Near Enchey Monastery',
        city: 'Gangtok',
        state: 'Sikkim',
        postal_code: '737101',
        country: 'India',
      },
      city: { id: 'c1', name: 'Gangtok', slug: 'gangtok' },
      location: { id: 'l1', name: 'Enchey', slug: 'enchey' },
    };

    const result = getPhysicalAddress(prop);
    expect(result).toBe('Upper Sichey, House 14, Near Enchey Monastery, Gangtok, Sikkim, 737101, India');
  });

  it('formats address using address_details when manual_address is absent', () => {
    const prop = {
      name: 'River View Cottage',
      address_details: {
        address_line1: '12 Hill Cart Road',
        address_line2: '',
        city: 'Kurseong',
        state: 'West Bengal',
        postal_code: '734203',
        country: 'India',
      },
      city: { id: 'c2', name: 'Kurseong', slug: 'kurseong' },
      location: { id: 'l2', name: 'Dowhill', slug: 'dowhill' },
    };

    const result = getPhysicalAddress(prop);
    expect(result).toBe('12 Hill Cart Road, Dowhill, Kurseong, West Bengal, 734203, India');
  });

  it('formats address using raw address string when structured lines are absent', () => {
    const prop = {
      name: 'Pine Forest Retreat',
      address: 'Near Old Monastery, Lower Pelling',
      city: { id: 'c3', name: 'Pelling', slug: 'pelling' },
      location: { id: 'l3', name: 'Pelling West', slug: 'pelling-west' },
    };

    const result = getPhysicalAddress(prop);
    expect(result).toBe('Near Old Monastery, Lower Pelling, Pelling West');
  });

  it('does not duplicate city or location if already contained in the raw address', () => {
    const prop = {
      name: 'Valley View Stay',
      address: 'Upper Cart Road, Kurseong, Darjeeling - 734203',
      city: { id: 'c4', name: 'Darjeeling', slug: 'darjeeling' },
      location: { id: 'l4', name: 'Kurseong', slug: 'kurseong' },
    };

    const result = getPhysicalAddress(prop);
    expect(result).toBe('Upper Cart Road, Kurseong, Darjeeling - 734203');
  });

  it('falls back to location and city if no street address is provided', () => {
    const prop = {
      name: 'Peaceful Haven',
      city: { id: 'c5', name: 'Kalimpong', slug: 'kalimpong' },
      location: { id: 'l5', name: 'Deolo Hill', slug: 'deolo-hill' },
    };

    const result = getPhysicalAddress(prop);
    expect(result).toBe('Deolo Hill, Kalimpong');
  });

  it('falls back to city name only if location is absent', () => {
    const prop = {
      name: 'City Stay',
      city: { id: 'c6', name: 'Mirik', slug: 'mirik' },
    };

    const result = getPhysicalAddress(prop);
    expect(result).toBe('Mirik');
  });

  it('falls back to "Himalayan stay" if all location details are empty', () => {
    const prop = {
      name: 'Mystic Stay',
    };

    const result = getPhysicalAddress(prop);
    expect(result).toBe('Himalayan stay');
  });
});
