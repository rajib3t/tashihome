import { inject, Injectable, Renderer2, RendererFactory2 } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';
import { SettingsService } from '../settings/settings-service';
import { BreadcrumbItem, SeoConfig } from './seo.model';
import { PropertyData } from '../property/property.model';

@Injectable({
  providedIn: 'root'
})
export class SeoService {
  private readonly titleService = inject(Title);
  private readonly metaService = inject(Meta);
  private readonly document = inject(DOCUMENT);
  private readonly settingsService = inject(SettingsService);
  private readonly rendererFactory = inject(RendererFactory2);
  private readonly renderer: Renderer2 = this.rendererFactory.createRenderer(null, null);

  private readonly defaultBaseUrl = 'https://tashihomes.in';
  private readonly defaultSiteName = 'Tashihomes';
  private readonly defaultDescription =
    'Book verified homestays across Darjeeling, Kalimpong, Kurseong, Mirik & the Dooars. Authentic Himalayan hospitality, local hosts, and scenic stays.';
  private readonly defaultKeywords =
    'homestays, darjeeling homestay, kalimpong stays, kurseong resorts, mirik homestay, north bengal tourism, himalayan village stays, verified hosts';
  private readonly defaultOgImage = 'https://tashihomes.in/images/og-image.jpg';

  /**
   * Main method to update page SEO tags in one call
   */
  public updateSeo(config: SeoConfig): void {
    const settings = this.settingsService.settingsData();
    const appName = settings?.['app_name']?.trim() || environment.applicationName || this.defaultSiteName;

    // 1. Title
    if (config.title) {
      const fullTitle = config.title.includes(appName) ? config.title : `${config.title} | ${appName}`;
      this.titleService.setTitle(fullTitle);
      this.metaService.updateTag({ property: 'og:title', content: fullTitle });
      this.metaService.updateTag({ name: 'twitter:title', content: fullTitle });
    }

    // 2. Description
    const description = config.description || settings?.['meta_description'] || this.defaultDescription;
    this.metaService.updateTag({ name: 'description', content: description });
    this.metaService.updateTag({ property: 'og:description', content: description });
    this.metaService.updateTag({ name: 'twitter:description', content: description });

    // 3. Keywords
    const keywords = config.keywords || settings?.['meta_keywords'] || this.defaultKeywords;
    this.metaService.updateTag({ name: 'keywords', content: keywords });

    // 4. Robots
    const robots = config.robots || 'index, follow';
    this.metaService.updateTag({ name: 'robots', content: robots });

    // 5. OpenGraph & Twitter Basics
    const siteName = appName;
    this.metaService.updateTag({ property: 'og:site_name', content: siteName });
    this.metaService.updateTag({ property: 'og:type', content: config.type || 'website' });
    this.metaService.updateTag({ name: 'twitter:card', content: 'summary_large_image' });

    // 6. Image
    const rawImage = config.image || settings?.['og_image'] || settings?.['meta_image'] || this.defaultOgImage;
    const absoluteImage = this.resolveAbsoluteUrl(rawImage);
    this.metaService.updateTag({ property: 'og:image', content: absoluteImage });
    this.metaService.updateTag({ property: 'og:image:secure_url', content: absoluteImage });
    this.metaService.updateTag({ name: 'twitter:image', content: absoluteImage });

    // 7. Canonical URL & og:url
    const rawUrl = config.canonical || config.url || this.getCurrentCleanUrl();
    const absoluteUrl = this.resolveAbsoluteUrl(rawUrl);
    this.metaService.updateTag({ property: 'og:url', content: absoluteUrl });
    this.metaService.updateTag({ name: 'twitter:url', content: absoluteUrl });
    this.setCanonicalUrl(absoluteUrl);

    // 8. Structured Data
    if (config.structuredData !== undefined) {
      this.setStructuredData(config.structuredData);
    }
  }

  /**
   * Set 'noindex, nofollow' for 404, auth, checkout, or sensitive admin pages
   */
  public setNoIndex(pageTitle?: string): void {
    if (pageTitle) {
      const appName = this.settingsService.settingsData()?.['app_name']?.trim() || this.defaultSiteName;
      this.titleService.setTitle(`${pageTitle} | ${appName}`);
    }
    this.metaService.updateTag({ name: 'robots', content: 'noindex, nofollow' });
    this.metaService.removeTag('property="og:title"');
    this.metaService.removeTag('property="og:description"');
    this.metaService.removeTag('property="og:image"');
    this.removeStructuredData();
  }

  /**
   * Set canonical <link rel="canonical" href="...">
   */
  public setCanonicalUrl(url: string): void {
    try {
      const head = this.document.head;
      if (!head) return;

      let canonicalLink = head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      if (!canonicalLink) {
        canonicalLink = this.renderer.createElement('link');
        this.renderer.setAttribute(canonicalLink, 'rel', 'canonical');
        this.renderer.appendChild(head, canonicalLink);
      }
      this.renderer.setAttribute(canonicalLink, 'href', url);
    } catch {
      // safe fallback for SSR
    }
  }

  /**
   * Inject or update JSON-LD Structured Data in <head>
   */
  public setStructuredData(schema: Record<string, unknown> | Array<Record<string, unknown>> | null): void {
    try {
      const head = this.document.head;
      if (!head) return;

      const scriptId = 'tashi-structured-data';
      let scriptTag = head.querySelector<HTMLScriptElement>(`#${scriptId}`);

      if (!schema) {
        if (scriptTag) {
          this.renderer.removeChild(head, scriptTag);
        }
        return;
      }

      if (!scriptTag) {
        scriptTag = this.renderer.createElement('script');
        this.renderer.setAttribute(scriptTag, 'type', 'application/ld+json');
        this.renderer.setAttribute(scriptTag, 'id', scriptId);
        this.renderer.appendChild(head, scriptTag);
      }

      const jsonString = JSON.stringify(schema, null, 2);
      this.renderer.setProperty(scriptTag, 'textContent', jsonString);
    } catch {
      // safe fallback
    }
  }

  /**
   * Remove structured data when leaving page
   */
  public removeStructuredData(): void {
    this.setStructuredData(null);
  }

  /**
   * Generate WebSite Schema with SearchAction
   */
  public generateWebSiteSchema(): Record<string, unknown> {
    const origin = this.getBaseUrl();
    const appName = this.settingsService.settingsData()?.['app_name']?.trim() || this.defaultSiteName;

    return {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebSite',
          '@id': `${origin}/#website`,
          url: origin,
          name: appName,
          description: this.defaultDescription,
          potentialAction: {
            '@type': 'SearchAction',
            target: {
              '@type': 'EntryPoint',
              urlTemplate: `${origin}/search?query={search_term_string}`
            },
            'query-input': 'required name=search_term_string'
          }
        },
        {
          '@type': 'Organization',
          '@id': `${origin}/#organization`,
          name: appName,
          url: origin,
          logo: `${origin}/images/hero-himalaya.webp`,
          sameAs: [
            'https://facebook.com/tashihomes',
            'https://instagram.com/tashihomes'
          ]
        }
      ]
    };
  }

  /**
   * Generate LodgingBusiness / BedAndBreakfast Schema for a property detail page
   */
  public generateLodgingBusinessSchema(property: PropertyData): Record<string, unknown> {
    const origin = this.getBaseUrl();
    const propertyUrl = `${origin}/stay/${property.slug}`;

    const photos: string[] = [];
    if (property.cover_image?.file_url) {
      photos.push(this.resolveAbsoluteUrl(property.cover_image.file_url));
    }
    if (property.feature_image?.file_url) {
      photos.push(this.resolveAbsoluteUrl(property.feature_image.file_url));
    }
    if (property.property_assets && Array.isArray(property.property_assets)) {
      property.property_assets.forEach((a) => {
        if (a?.file_url) {
          photos.push(this.resolveAbsoluteUrl(a.file_url));
        }
      });
    }

    const amenitiesList: string[] = (property.property_amenities || [])
      .map((item) => item?.amenity?.name)
      .filter((n): n is string => Boolean(n));

    const schema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'BedAndBreakfast',
      '@id': propertyUrl,
      name: property.name,
      description: property.description || `${property.name} - verified homestay on Tashihomes.`,
      url: propertyUrl,
      image: photos.length > 0 ? photos : [this.defaultOgImage],
      address: {
        '@type': 'PostalAddress',
        streetAddress: property.address || property.location?.name || '',
        addressLocality: property.city?.name || property.location?.name || 'Darjeeling',
        addressRegion: 'West Bengal',
        addressCountry: 'IN'
      }
    };

    if (property.latitude && property.longitude) {
      schema['geo'] = {
        '@type': 'GeoCoordinates',
        latitude: property.latitude,
        longitude: property.longitude
      };
    }

    const price = property.sale_per_night || property.price_per_night || property.property_room_types?.[0]?.price_per_night;
    if (price) {
      schema['priceRange'] = `₹${price}`;
      schema['makesOffer'] = {
        '@type': 'Offer',
        price: price,
        priceCurrency: property.currency || 'INR',
        availability: 'https://schema.org/InStock',
        validFrom: new Date().toISOString().split('T')[0]
      };
    }

    if (amenitiesList.length > 0) {
      schema['amenityFeature'] = amenitiesList.map((item: string) => ({
        '@type': 'LocationFeatureSpecification',
        name: item,
        value: true
      }));
    }

    if (property.average_rating && property.total_reviews) {
      schema['aggregateRating'] = {
        '@type': 'AggregateRating',
        ratingValue: property.average_rating,
        reviewCount: property.total_reviews,
        bestRating: 5,
        worstRating: 1
      };
    }

    return schema;
  }

  /**
   * Generate BreadcrumbList Schema
   */
  public generateBreadcrumbSchema(items: BreadcrumbItem[]): Record<string, unknown> {
    const origin = this.getBaseUrl();
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: this.resolveAbsoluteUrl(item.url)
      }))
    };
  }

  public getBaseUrl(): string {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return window.location.origin;
    }
    const settings = this.settingsService.settingsData();
    return settings?.['site_url'] || this.defaultBaseUrl;
  }

  public getCurrentCleanUrl(): string {
    const origin = this.getBaseUrl();
    const pathname = this.document?.location?.pathname || '/';
    const cleanPath = pathname.split('?')[0].split('#')[0];
    return `${origin}${cleanPath === '/' ? '' : cleanPath}`;
  }

  public resolveAbsoluteUrl(pathOrUrl?: string | null): string {
    if (!pathOrUrl) return this.defaultOgImage;
    if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
      return pathOrUrl;
    }
    const resolved = this.settingsService.resolveAssetUrl(pathOrUrl);
    if (resolved.startsWith('http://') || resolved.startsWith('https://')) {
      return resolved;
    }
    const base = this.getBaseUrl();
    const cleanPath = resolved.startsWith('/') ? resolved : `/${resolved}`;
    return `${base}${cleanPath}`;
  }
}

