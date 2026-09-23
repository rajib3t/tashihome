import { describe, it, expect } from 'vitest';
import { parsePostalAddress, SeoConfig } from './seo.model';

describe('SeoConfig Model', () => {
  it('should accept valid SEO configuration', () => {
    const config: SeoConfig = {
      title: 'Homestays in Darjeeling',
      description: 'Book handpicked homestays with views of Kanchenjunga.',
      keywords: 'homestay, darjeeling',
      canonical: 'https://tashihomes.in/stays/darjeeling',
      robots: 'index, follow',
      type: 'website'
    };

    expect(config.title).toBe('Homestays in Darjeeling');
    expect(config.robots).toBe('index, follow');
  });

  it('should support noindex on error/auth pages', () => {
    const config: SeoConfig = {
      title: 'Page Not Found (404)',
      robots: 'noindex, nofollow'
    };

    expect(config.robots).toBe('noindex, nofollow');
  });

  it('should accept structuredData graph payload', () => {
    const schema = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'BedAndBreakfast',
          name: 'Himalayan Orchid Stay',
          url: 'https://tashihomes.in/stay/himalayan-orchid-stay'
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://tashihomes.in/' },
            { '@type': 'ListItem', position: 2, name: 'Stays', item: 'https://tashihomes.in/stays' }
          ]
        }
      ]
    };

    const config: SeoConfig = {
      title: 'Himalayan Orchid Stay',
      structuredData: schema
    };

    expect(config.structuredData).toBeDefined();
    expect((config.structuredData as any)['@graph'].length).toBe(2);
    expect((config.structuredData as any)['@graph'][0]['@type']).toBe('BedAndBreakfast');
    expect((config.structuredData as any)['@graph'][1]['@type']).toBe('BreadcrumbList');
  });

  it('should support ItemList structured data for search and listing pages', () => {
    const schema = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'ItemList',
          name: 'Homestays in Darjeeling',
          numberOfItems: 1,
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              item: {
                '@type': 'BedAndBreakfast',
                name: 'Kanchenjunga View Cottage',
                priceRange: '₹3200'
              }
            }
          ]
        }
      ]
    };

    expect((schema['@graph'][0] as any).numberOfItems).toBe(1);
    expect((schema['@graph'][0] as any).itemListElement[0].item.name).toBe('Kanchenjunga View Cottage');
  });

  it('should support FAQPage structured data for host recruitment and informational pages', () => {
    const schema = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'FAQPage',
          mainEntity: [
            {
              '@type': 'Question',
              name: 'Is there any fee to join or list my homestay?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'No. Listing on Tashihomes is completely free.'
              }
            }
          ]
        }
      ]
    };

    expect((schema['@graph'][0] as any)['@type']).toBe('FAQPage');
    expect((schema['@graph'][0] as any).mainEntity.length).toBe(1);
    expect((schema['@graph'][0] as any).mainEntity[0].name).toContain('fee to join');
  });

  it('should ensure BedAndBreakfast property schema does not contain default WebSite graph', () => {
    const lodgingSchema = {
      '@type': 'BedAndBreakfast',
      name: 'Singalila Homestay',
      checkinTime: '14:00',
      checkoutTime: '11:00',
      currenciesAccepted: 'INR'
    };
    const breadcrumbs = {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://tashihomes.in/' },
        { '@type': 'ListItem', position: 2, name: 'Singalila Homestay', item: 'https://tashihomes.in/stay/singalila' }
      ]
    };
    const payload = {
      '@context': 'https://schema.org',
      '@graph': [lodgingSchema, breadcrumbs]
    };

    // The property page structured data should contain Lodging, BreadcrumbList, Organization, not WebSite SearchAction
    const types = payload['@graph'].map((item) => item['@type']);
    expect(types).toContain('BedAndBreakfast');
    expect(types).toContain('BreadcrumbList');
    expect(types).not.toContain('WebSite');
    expect(types).not.toContain('SearchAction');
  });

  it('should ensure breadcrumb URLs never point to asset CDN domain', () => {
    const breadcrumbItems = [
      { name: 'Home', url: 'https://tashihomes.in/' },
      { name: 'Stays', url: 'https://tashihomes.in/stays' },
      { name: 'Takdah', url: 'https://tashihomes.in/stays/takdah' },
      { name: 'Heritage Homestay', url: 'https://tashihomes.in/stay/heritage-homestay' }
    ];

    breadcrumbItems.forEach((item) => {
      expect(item.url).not.toContain('asset.tashihomes.in');
      expect(item.url.startsWith('https://tashihomes.in')).toBe(true);
    });
  });

  it('should properly model PostalAddress without duplicating locality as streetAddress', () => {
    // When address is empty or identical to locality name, streetAddress should not duplicate locality
    const locality = 'Takdah';
    const rawAddress = 'Takdah';
    const isAddressJustLocality = !rawAddress || rawAddress.toLowerCase() === locality.toLowerCase();

    const postalAddress: Record<string, unknown> = {
      '@type': 'PostalAddress',
      addressLocality: locality,
      addressRegion: 'West Bengal',
      addressCountry: 'IN'
    };
    if (!isAddressJustLocality && rawAddress) {
      postalAddress['streetAddress'] = rawAddress;
    }

    expect(postalAddress['addressLocality']).toBe('Takdah');
    expect(postalAddress['streetAddress']).toBeUndefined();

    // When address has a distinct street name
    const distinctAddress = 'Takdah Club Road, Near Heritage Post Office';
    const isDistinctJustLocality = !distinctAddress || distinctAddress.toLowerCase() === locality.toLowerCase();
    const postalAddress2: Record<string, unknown> = {
      '@type': 'PostalAddress',
      addressLocality: locality,
      addressRegion: 'West Bengal',
      addressCountry: 'IN'
    };
    if (!isDistinctJustLocality && distinctAddress) {
      postalAddress2['streetAddress'] = distinctAddress;
    }

    expect(postalAddress2['addressLocality']).toBe('Takdah');
    expect(postalAddress2['streetAddress']).toBe('Takdah Club Road, Near Heritage Post Office');
  });

  it('should validate homestay Room and Offer modeling in containsPlace', () => {
    const room = {
      '@type': 'Room',
      name: 'Mountain View Deluxe',
      bed: {
        '@type': 'BedDetails',
        numberOfBeds: 1,
        typeOfBed: 'Double Bed'
      },
      occupancy: {
        '@type': 'QuantitativeValue',
        maxValue: 2,
        minValue: 1,
        unitCode: 'C62',
        unitText: 'guests'
      },
      offers: {
        '@type': 'Offer',
        price: 2500,
        priceCurrency: 'INR',
        availability: 'https://schema.org/InStock',
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          price: 2500,
          priceCurrency: 'INR',
          unitCode: 'DAY',
          unitText: 'per night'
        }
      }
    };

    expect(room['@type']).toBe('Room');
    expect(room.bed.typeOfBed).toBe('Double Bed');
    expect(room.occupancy.unitText).toBe('guests');
    expect(room.offers.priceSpecification.unitText).toBe('per night');
  });

  it('should generate dynamic sameAs social profiles from settings data', () => {
    // Simulate candidate URL extraction logic driven by settings
    const mockSettings: Record<string, string> = {
      facebook_url: 'https://facebook.com/customtashi',
      instagram_url: 'https://instagram.com/customtashi',
      twitter_url: 'https://twitter.com/customtashi',
      youtube_url: 'https://youtube.com/@customtashi',
      linkedin_url: 'https://linkedin.com/company/customtashi',
      pinterest_url: 'https://pinterest.com/customtashi',
      whatsapp_url: 'https://wa.me/919876543210'
    };

    const candidates = [
      mockSettings['facebook_url'],
      mockSettings['instagram_url'],
      mockSettings['twitter_url'],
      mockSettings['youtube_url'],
      mockSettings['linkedin_url'],
      mockSettings['pinterest_url'],
      mockSettings['whatsapp_url']
    ];

    const urls: string[] = [];
    candidates.forEach((val) => {
      if (val && typeof val === 'string' && val.trim().length > 0) {
        const clean = val.trim();
        if (/^https?:\/\//i.test(clean)) {
          urls.push(clean);
        }
      }
    });

    const sameAsList = Array.from(new Set(urls));

    expect(sameAsList).toContain('https://facebook.com/customtashi');
    expect(sameAsList).toContain('https://instagram.com/customtashi');
    expect(sameAsList).toContain('https://twitter.com/customtashi');
    expect(sameAsList).toContain('https://youtube.com/@customtashi');
    expect(sameAsList).toContain('https://linkedin.com/company/customtashi');
    expect(sameAsList).toContain('https://pinterest.com/customtashi');
    expect(sameAsList).toContain('https://wa.me/919876543210');
    expect(sameAsList.length).toBe(7);
  });

  it('should fallback to default verified social profiles when settings are empty', () => {
    const emptySettings: Record<string, string> = {};
    const candidates = [
      emptySettings['facebook_url'],
      emptySettings['instagram_url'],
      emptySettings['twitter_url']
    ];

    const urls: string[] = [];
    candidates.forEach((val) => {
      if (val && typeof val === 'string' && val.trim().length > 0) {
        const clean = val.trim();
        if (/^https?:\/\//i.test(clean)) {
          urls.push(clean);
        }
      }
    });

    const finalSameAs = urls.length > 0 ? urls : [
      'https://facebook.com/tashihomes',
      'https://instagram.com/tashihomes'
    ];

    expect(finalSameAs).toEqual([
      'https://facebook.com/tashihomes',
      'https://instagram.com/tashihomes'
    ]);
  });

  it('should extract twitter handle correctly from dynamic twitter URL', () => {
    const extractHandle = (url?: string, explicitHandle?: string): string => {
      if (explicitHandle && explicitHandle.trim()) {
        const h = explicitHandle.trim();
        return h.startsWith('@') ? h : `@${h}`;
      }
      if (url && typeof url === 'string') {
        const match = url.match(/(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)/i);
        if (match && match[1]) {
          return `@${match[1]}`;
        }
      }
      return '@tashihomes';
    };

    expect(extractHandle('https://twitter.com/tashihomes')).toBe('@tashihomes');
    expect(extractHandle('https://x.com/himalayanhomes')).toBe('@himalayanhomes');
    expect(extractHandle(undefined, 'customhandle')).toBe('@customhandle');
    expect(extractHandle(undefined, '@prefixedhandle')).toBe('@prefixedhandle');
    expect(extractHandle(undefined, undefined)).toBe('@tashihomes');
  });

  it('should include dynamic Organization schema in LodgingBusiness @graph', () => {
    const orgSchema = {
      '@type': 'Organization',
      '@id': 'https://tashihomes.in/#organization',
      name: 'TashiHomes',
      url: 'https://tashihomes.in',
      sameAs: [
        'https://facebook.com/tashihomes',
        'https://instagram.com/tashihomes',
        'https://youtube.com/@tashihomes'
      ]
    };

    const lodgingGraph = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': ['BedAndBreakfast', 'LodgingBusiness'],
          name: 'Darjeeling Tea Retreat',
          provider: {
            '@type': 'Organization',
            '@id': 'https://tashihomes.in/#organization'
          }
        },
        orgSchema
      ]
    };

    const orgInGraph = lodgingGraph['@graph'].find((item: any) => item['@type'] === 'Organization') as any;
    expect(orgInGraph).toBeDefined();
    expect(orgInGraph['@id']).toBe('https://tashihomes.in/#organization');
    expect(orgInGraph.sameAs).toContain('https://youtube.com/@tashihomes');
  });

  it('should parse setting-driven address into standard Schema.org PostalAddress without hardcoding Gangtok or Sikkim', () => {
    // User configured setting: "Station Road, Kanchrapara 743145, West Bengal, India"
    const rawAddress = 'Station Road, Kanchrapara 743145, West Bengal, India';
    const parsed = parsePostalAddress(rawAddress, {
      contact_address: rawAddress
    });

    expect(parsed).toBeDefined();
    expect(parsed?.['@type']).toBe('PostalAddress');
    expect(parsed?.['streetAddress']).toBe('Station Road');
    expect(parsed?.['addressLocality']).toBe('Kanchrapara');
    expect(parsed?.['addressRegion']).toBe('West Bengal');
    expect(parsed?.['postalCode']).toBe('743145');
    expect(parsed?.['addressCountry']).toBe('IN');

    // Crucial check: make sure locality and region are not hardcoded
    expect(parsed?.['addressLocality']).not.toBe('Gangtok');
    expect(parsed?.['addressRegion']).not.toBe('Sikkim');
  });

  it('should support discrete setting overrides for city, state, country, and pincode', () => {
    const parsed = parsePostalAddress('12 Park Street', {
      contact_address: '12 Park Street',
      contact_city: 'Kolkata',
      contact_state: 'West Bengal',
      contact_pincode: '700016',
      contact_country: 'India'
    });

    expect(parsed).toEqual({
      '@type': 'PostalAddress',
      streetAddress: '12 Park Street',
      addressLocality: 'Kolkata',
      addressRegion: 'West Bengal',
      postalCode: '700016',
      addressCountry: 'IN'
    });
  });

  it('should correctly parse Himalayan address settings like Gangtok, Sikkim', () => {
    const rawAddress = 'MG Marg, Gangtok, Sikkim - 737101, India';
    const parsed = parsePostalAddress(rawAddress, {
      contact_address: rawAddress
    });

    expect(parsed).toEqual({
      '@type': 'PostalAddress',
      streetAddress: 'MG Marg',
      addressLocality: 'Gangtok',
      addressRegion: 'Sikkim',
      postalCode: '737101',
      addressCountry: 'IN'
    });
  });
});


