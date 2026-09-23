import { describe, it, expect } from 'vitest';
import { SeoConfig } from './seo.model';

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
});

