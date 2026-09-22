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
});

