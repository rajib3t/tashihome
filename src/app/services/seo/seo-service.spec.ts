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
});

