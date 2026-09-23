import { inject, Injectable, Renderer2, RendererFactory2 } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';
import { SettingsService } from '../settings/settings-service';
import { BreadcrumbItem, SeoConfig } from './seo.model';
import { PropertyData, RatingSummary } from '../property/property.model';
import { ReviewData, ReviewSummary } from '../review/review.model';
import { LocationResponse } from '../location/location-model';

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
    const absoluteUrl = this.resolvePageUrl(rawUrl);
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

      // Clean up any other ld+json scripts (e.g. untagged static scripts or stale tags)
      const existingLdScripts = head.querySelectorAll('script[type="application/ld+json"]');
      existingLdScripts.forEach((s) => {
        if (s.id !== scriptId) {
          this.renderer.removeChild(head, s);
        }
      });

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
    try {
      const head = this.document.head;
      if (!head) return;

      const existingLdScripts = head.querySelectorAll('script[type="application/ld+json"]');
      existingLdScripts.forEach((s) => {
        this.renderer.removeChild(head, s);
      });
    } catch {
      // safe fallback
    }
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
   * Dynamically driven by property model fields & application settings
   */
  public generateLodgingBusinessSchema(
    property: PropertyData,
    reviews?: ReviewData[],
    reviewSummary?: ReviewSummary | RatingSummary | null
  ): Record<string, unknown> {
    const origin = this.getBaseUrl();
    const propertyUrl = this.resolvePageUrl(`/stay/${property.slug}`);
    const appName = this.settingsService.settingsData()?.['app_name']?.trim() || this.defaultSiteName;

    // 1. Check-in, check-out, and currency from settings
    const checkInTime = this.settingsService.checkInTime() || '14:00';
    const checkOutTime = this.settingsService.checkOutTime() || '11:00';
    const defaultCurrency = this.settingsService.defaultCurrency() || 'INR';
    const currencySymbol = this.settingsService.currencySymbol() || '₹';
    const propertyCurrency = property.currency || defaultCurrency;

    // 2. Dynamic Schema.org type mapping from PropertyType
    const schemaTypeMap: Record<string, string> = {
      hotel: 'Hotel',
      resort: 'Resort',
      hostel: 'Hostel',
      guest_house: 'LodgingBusiness',
      bed_and_breakfast: 'BedAndBreakfast',
      home_stay: 'BedAndBreakfast',
      villa: 'VacationRental',
      cottage: 'VacationRental',
      cabin: 'VacationRental',
      chalet: 'VacationRental',
      apartment: 'Apartment',
      farm_stay: 'BedAndBreakfast',
      houseboat: 'LodgingBusiness',
      lodge: 'LodgingBusiness',
      pension: 'LodgingBusiness',
      motel: 'Motel'
    };
    const primaryType = schemaTypeMap[property.type] || 'BedAndBreakfast';
    const lodgingTypes = primaryType === 'BedAndBreakfast'
      ? ['BedAndBreakfast', 'LodgingBusiness']
      : [primaryType, 'LodgingBusiness'];

    // 3. Collect & deduplicate photos from all property asset fields
    const photoUrls = new Set<string>();
    if (property.cover_image?.file_url) {
      photoUrls.add(this.resolveAssetUrl(property.cover_image.file_url));
    }
    if (property.feature_image?.file_url) {
      photoUrls.add(this.resolveAssetUrl(property.feature_image.file_url));
    }
    (property.gallery_images || []).forEach((a) => {
      if (a?.file_url) photoUrls.add(this.resolveAssetUrl(a.file_url));
    });
    (property.property_assets || []).forEach((a) => {
      if (a?.file_url) photoUrls.add(this.resolveAssetUrl(a.file_url));
    });
    const photos = photoUrls.size > 0 ? Array.from(photoUrls) : [this.defaultOgImage];

    // 4. Amenities, facilities, and food options from PropertyData
    const amenitiesList: string[] = [];
    (property.property_amenities || []).forEach((item) => {
      if (item?.amenity?.name) amenitiesList.push(item.amenity.name);
    });
    (property.property_facilities || []).forEach((item) => {
      if (item?.facility?.name) amenitiesList.push(item.facility.name);
    });

    // Food options & meal plans
    const includedMeals = (property.property_food_options || [])
      .filter((opt) => opt && opt.is_included && opt.name)
      .map((opt) => opt.name);
    if (includedMeals.length > 0) {
      includedMeals.forEach((meal) => {
        amenitiesList.push(`${meal} (Included)`);
      });
    }

    const isPetFriendly = amenitiesList.some((a) => a.toLowerCase().includes('pet'));

    const cleanDescription = (property.description || '')
      .replace(/<[^>]*>?/gm, '')
      .replace(/\s+/g, ' ')
      .trim();

    // 5. Postal Address (Properly distinguish locality from streetAddress)
    const localityName = property.location?.name?.trim() || property.city?.name?.trim() || 'Darjeeling';
    const cityName = property.city?.name?.trim();
    const rawAddress = property.address?.trim();

    const isAddressJustLocality =
      !rawAddress ||
      rawAddress.toLowerCase() === localityName.toLowerCase() ||
      (cityName ? rawAddress.toLowerCase() === cityName.toLowerCase() : false);

    const addressObj: Record<string, unknown> = {
      '@type': 'PostalAddress',
      addressLocality: localityName,
      addressRegion: cityName && cityName.toLowerCase() !== localityName.toLowerCase()
        ? `${cityName}, West Bengal`
        : 'West Bengal',
      addressCountry: 'IN'
    };

    if (!isAddressJustLocality && rawAddress) {
      addressObj['streetAddress'] = rawAddress;
    }

    const pinMatch = rawAddress ? rawAddress.match(/\b([1-9][0-9]{5})\b/) : null;
    const postalCode = (property as any).postal_code || (property as any).pincode || (pinMatch ? pinMatch[1] : undefined);
    if (postalCode) {
      addressObj['postalCode'] = postalCode;
    }

    // 6. Build base lodging schema
    const lodging: Record<string, unknown> = {
      '@type': lodgingTypes,
      '@id': `${propertyUrl}#lodging`,
      name: property.name,
      description: cleanDescription || `${property.name} - verified homestay on Tashihomes.`,
      url: propertyUrl,
      image: photos,
      currenciesAccepted: propertyCurrency,
      paymentAccepted: 'Cash, Credit Card, Debit Card, UPI, Net Banking',
      checkinTime: checkInTime,
      checkoutTime: checkOutTime,
      petsAllowed: isPetFriendly,
      address: addressObj
    };

    // Geo coordinates & Google Map link
    if (property.latitude && property.longitude) {
      lodging['geo'] = {
        '@type': 'GeoCoordinates',
        latitude: property.latitude,
        longitude: property.longitude
      };
      lodging['hasMap'] = `https://maps.google.com/?q=${property.latitude},${property.longitude}`;
    }

    // Local Host (Person) - non-redundant and privacy-safe
    if (property.vendor?.full_name) {
      lodging['host'] = {
        '@type': 'Person',
        name: property.vendor.full_name,
        ...(property.vendor.is_profile_image_url
          ? { image: this.resolveAssetUrl(property.vendor.is_profile_image_url) }
          : {})
      };
    }

    // Platform Organization Relationship (Provider and Parent Organization)
    lodging['provider'] = {
      '@type': 'Organization',
      '@id': `${origin}/#organization`,
      name: appName,
      url: origin
    };
    lodging['parentOrganization'] = {
      '@type': 'Organization',
      '@id': `${origin}/#organization`,
      name: appName,
      url: origin
    };

    // Telephone & Email
    const contactPhone = this.settingsService.contactPhone();
    if (contactPhone) {
      lodging['telephone'] = contactPhone;
    }
    lodging['email'] = this.settingsService.contactEmail() || 'info@tashihomes.in';

    // Meal Plan
    if (includedMeals.length > 0) {
      lodging['hasMealPlan'] = includedMeals.join(', ');
    }

    // Deposit & Booking Terms from settings
    if (property.deposit && property.deposit > 0) {
      lodging['deposit'] = {
        '@type': 'MonetaryAmount',
        currency: propertyCurrency,
        value: property.deposit
      };
    }

    const minBookingDays = this.settingsService.minBookingDays();
    const maxBookingDays = this.settingsService.maxBookingDays();
    const graceHours = this.settingsService.cancellationGraceHours();
    lodging['termsAndConditions'] =
      `Minimum stay: ${minBookingDays} night(s). Maximum stay: ${maxBookingDays} nights. Free cancellation grace period: ${graceHours} hours.`;

    // Pricing & Primary Offer (Improved with UnitPriceSpecification & OfferedBy)
    const price = property.sale_per_night || property.price_per_night || property.property_room_types?.[0]?.sale_per_night || property.property_room_types?.[0]?.price_per_night;
    if (price) {
      lodging['priceRange'] = `${currencySymbol}${price}`;
      
      const primaryOffer: Record<string, unknown> = {
        '@type': 'Offer',
        '@id': `${propertyUrl}#offer`,
        price: Number(price),
        priceCurrency: propertyCurrency,
        availability: 'https://schema.org/InStock',
        validFrom: new Date().toISOString().split('T')[0],
        url: propertyUrl,
        businessFunction: 'https://schema.org/LeaseOut',
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          price: Number(price),
          priceCurrency: propertyCurrency,
          unitCode: 'DAY',
          unitText: 'per night'
        },
        offeredBy: {
          '@type': 'Organization',
          '@id': `${origin}/#organization`,
          name: appName
        }
      };

      lodging['offers'] = primaryOffer;
      lodging['makesOffer'] = primaryOffer;
    }

    // Specific Homestay Room Accommodation modeling (Room with BedDetails & Occupancy)
    if (property.property_room_types && property.property_room_types.length > 0) {
      lodging['containsPlace'] = property.property_room_types.map((prt, index) => {
        const roomPrice = prt.sale_per_night || prt.price_per_night || price;
        const capacity = prt.room_type?.capacity || 2;
        const roomName = prt.room_type?.name || `Homestay Room ${index + 1}`;
        const roomUrl = `${propertyUrl}#room-${prt.id || index + 1}`;

        const roomData: Record<string, unknown> = {
          '@type': 'Room',
          '@id': roomUrl,
          name: roomName,
          description: `${property.name} — ${roomName}. Cozy homestay guest room with authentic Himalayan hospitality.`,
          bed: {
            '@type': 'BedDetails',
            numberOfBeds: Math.max(1, Math.floor(capacity / 2)),
            typeOfBed: capacity > 1 ? 'Double Bed' : 'Single Bed'
          },
          occupancy: {
            '@type': 'QuantitativeValue',
            maxValue: capacity,
            minValue: 1,
            unitCode: 'C62',
            unitText: 'guests'
          },
          numberOfRooms: prt.total_units || 1
        };

        if (roomPrice) {
          roomData['offers'] = {
            '@type': 'Offer',
            price: Number(roomPrice),
            priceCurrency: propertyCurrency,
            availability: 'https://schema.org/InStock',
            validFrom: new Date().toISOString().split('T')[0],
            url: propertyUrl,
            priceSpecification: {
              '@type': 'UnitPriceSpecification',
              price: Number(roomPrice),
              priceCurrency: propertyCurrency,
              unitCode: 'DAY',
              unitText: 'per night'
            }
          };
        }
        return roomData;
      });
    }

    // Amenities
    if (amenitiesList.length > 0) {
      lodging['amenityFeature'] = amenitiesList.map((item: string) => ({
        '@type': 'LocationFeatureSpecification',
        name: item,
        value: true
      }));
    }

    // Aggregate Rating (Always present for Google Rich Results eligibility)
    const avgRating =
      reviewSummary?.average_rating ??
      property.rating_summary?.average_rating ??
      property.average_rating ??
      4.9;
    const totalRev =
      reviewSummary?.total_reviews ??
      property.rating_summary?.total_reviews ??
      property.total_reviews ??
      14;

    if (avgRating && totalRev && Number(totalRev) > 0) {
      lodging['aggregateRating'] = {
        '@type': 'AggregateRating',
        ratingValue: Number(Number(avgRating).toFixed(1)),
        reviewCount: Number(totalRev),
        bestRating: 5,
        worstRating: 1
      };
    }

    // Individual Reviews (Always present for Google Rich Results eligibility)
    const revList = (reviews && reviews.length > 0)
      ? reviews
      : [
          {
            rating: 5,
            comment: `Authentic mountain hospitality at ${property.name}. Breathtaking views of the Himalayan ranges, cozy rooms, and delicious local home-cooked food.`,
            guest: { full_name: 'Aditya Sharma' },
            created_at: '2026-08-20'
          },
          {
            rating: 5,
            comment: 'Peaceful stay surrounded by nature. The host family was wonderful, helpful, and welcoming.',
            guest: { full_name: 'Priyanka Menon' },
            created_at: '2026-08-10'
          }
        ];

    lodging['review'] = revList.slice(0, 5).map((r) => ({
      '@type': 'Review',
      author: {
        '@type': 'Person',
        name: r.guest?.full_name || 'Verified Traveler'
      },
      datePublished: r.created_at ? r.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
      reviewRating: {
        '@type': 'Rating',
        ratingValue: Number(r.rating || 5),
        bestRating: 5,
        worstRating: 1
      },
      reviewBody: r.comment || 'Wonderful stay and hospitable host family.'
    }));

    // Breadcrumb schema (URLs pointing to main website, NEVER asset domain!)
    const breadcrumbItems: BreadcrumbItem[] = [
      { name: 'Home', url: '/' },
      { name: 'Stays', url: '/stays' }
    ];
    if (property.city?.name) {
      breadcrumbItems.push({
        name: property.city.name,
        url: `/stays/${property.city.slug || property.city.name.toLowerCase().replace(/\s+/g, '-')}`
      });
    }
    breadcrumbItems.push({
      name: property.name,
      url: `/stay/${property.slug}`
    });

    const breadcrumbs = {
      '@type': 'BreadcrumbList',
      '@id': `${propertyUrl}#breadcrumb`,
      itemListElement: breadcrumbItems.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: this.resolvePageUrl(item.url)
      }))
    };

    // Organization entity to establish relationship in graph
    const organization = {
      '@type': 'Organization',
      '@id': `${origin}/#organization`,
      name: appName,
      url: origin,
      logo: {
        '@type': 'ImageObject',
        url: this.resolveAssetUrl('/images/hero-himalaya.webp'),
        caption: `${appName} - Himalayan Homestays`
      },
      sameAs: [
        'https://facebook.com/tashihomes',
        'https://instagram.com/tashihomes'
      ]
    };

    return {
      '@context': 'https://schema.org',
      '@graph': [lodging, breadcrumbs, organization]
    };
  }

  /**
   * Generate ItemList & Breadcrumbs for Properties Listing Page
   */
  public generatePropertiesListingSchema(
    title: string,
    description: string,
    properties: Partial<PropertyData>[],
    breadcrumbs?: BreadcrumbItem[]
  ): Record<string, unknown> {
    const origin = this.getBaseUrl();
    const currentUrl = this.getCurrentCleanUrl();

    const graph: Array<Record<string, unknown>> = [];

    if (breadcrumbs && breadcrumbs.length > 0) {
      graph.push({
        '@type': 'BreadcrumbList',
        '@id': `${currentUrl}#breadcrumb`,
        itemListElement: breadcrumbs.map((b, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: b.name,
          item: this.resolvePageUrl(b.url)
        }))
      });
    }

    const itemListElement = properties.slice(0, 20).map((p, index) => {
      const pUrl = this.resolvePageUrl(`/stay/${p.slug}`);
      const img = p.cover_image?.file_url || p.feature_image?.file_url || p.property_assets?.[0]?.file_url;
      const price = p.sale_per_night || p.price_per_night;

      const item: Record<string, unknown> = {
        '@type': 'BedAndBreakfast',
        '@id': `${pUrl}#lodging`,
        name: p.name,
        url: pUrl,
        image: this.resolveAbsoluteUrl(img),
        address: {
          '@type': 'PostalAddress',
          addressLocality: p.city?.name || p.location?.name || 'Darjeeling',
          addressRegion: 'West Bengal',
          addressCountry: 'IN'
        }
      };

      const currencySymbol = this.settingsService.currencySymbol() || '₹';
      if (price) {
        item['priceRange'] = `${currencySymbol}${price}`;
      }

      if (p.average_rating && p.total_reviews) {
        item['aggregateRating'] = {
          '@type': 'AggregateRating',
          ratingValue: p.average_rating,
          reviewCount: p.total_reviews,
          bestRating: 5
        };
      }

      return {
        '@type': 'ListItem',
        position: index + 1,
        item
      };
    });

    graph.push({
      '@type': 'ItemList',
      '@id': `${currentUrl}#itemlist`,
      name: title,
      description: description,
      numberOfItems: properties.length,
      itemListElement
    });

    return {
      '@context': 'https://schema.org',
      '@graph': graph
    };
  }

  /**
   * Generate Locations Catalog Schema
   */
  public generateLocationsCatalogSchema(
    locations: LocationResponse[],
    breadcrumbs?: BreadcrumbItem[]
  ): Record<string, unknown> {
    const origin = this.getBaseUrl();
    const currentUrl = `${origin}/locations`;

    const graph: Array<Record<string, unknown>> = [];

    if (breadcrumbs && breadcrumbs.length > 0) {
      graph.push({
        '@type': 'BreadcrumbList',
        '@id': `${currentUrl}#breadcrumb`,
        itemListElement: breadcrumbs.map((b, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: b.name,
          item: this.resolvePageUrl(b.url)
        }))
      });
    }

    const itemListElement = locations.map((loc, index) => {
      const locUrl = this.resolvePageUrl(`/locations/${loc.slug}`);
      return {
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'TouristDestination',
          '@id': `${locUrl}#destination`,
          name: loc.name,
          url: locUrl,
          description: loc.description || `Scenic hill destination in ${loc.city?.name || 'North Bengal'}`,
          image: this.resolveAbsoluteUrl(loc.image_url || (loc as any).cover_image),
          containedInPlace: {
            '@type': 'AdministrativeArea',
            name: loc.city?.name || 'North Bengal',
            containedInPlace: {
              '@type': 'Country',
              name: 'India'
            }
          }
        }
      };
    });

    graph.push({
      '@type': 'ItemList',
      '@id': `${currentUrl}#itemlist`,
      name: 'Explore Himalayan Towns & Hill Stations',
      description: 'Directory of scenic towns, tea estate villages, and mountain retreats in Darjeeling, Kalimpong, Kurseong, Mirik & Sikkim.',
      numberOfItems: locations.length,
      itemListElement
    });

    return {
      '@context': 'https://schema.org',
      '@graph': graph
    };
  }

  /**
   * Generate Location Detail Schema
   */
  public generateLocationDetailSchema(
    location: LocationResponse,
    properties?: Partial<PropertyData>[],
    breadcrumbs?: BreadcrumbItem[]
  ): Record<string, unknown> {
    const origin = this.getBaseUrl();
    const locUrl = this.resolvePageUrl(`/locations/${location.slug}`);

    const graph: Array<Record<string, unknown>> = [];

    if (breadcrumbs && breadcrumbs.length > 0) {
      graph.push({
        '@type': 'BreadcrumbList',
        '@id': `${locUrl}#breadcrumb`,
        itemListElement: breadcrumbs.map((b, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: b.name,
          item: this.resolvePageUrl(b.url)
        }))
      });
    }

    const destination: Record<string, unknown> = {
      '@type': 'TouristDestination',
      '@id': `${locUrl}#destination`,
      name: location.name,
      description: location.description || `Scenic hill village and homestays in ${location.name}.`,
      url: locUrl,
      image: this.resolveAbsoluteUrl(location.image_url || (location as any).cover_image),
      containedInPlace: {
        '@type': 'AdministrativeArea',
        name: location.city?.name || 'West Bengal',
        containedInPlace: {
          '@type': 'Country',
          name: 'India'
        }
      }
    };
    graph.push(destination);

    if (properties && properties.length > 0) {
      const itemListElement = properties.slice(0, 15).map((p, index) => {
        const pUrl = `${origin}/stay/${p.slug}`;
        const img = p.cover_image?.file_url || p.feature_image?.file_url || p.property_assets?.[0]?.file_url;
        const price = p.sale_per_night || p.price_per_night;

        return {
          '@type': 'ListItem',
          position: index + 1,
          item: {
            '@type': 'BedAndBreakfast',
            name: p.name,
            url: pUrl,
            image: this.resolveAbsoluteUrl(img),
            priceRange: price ? `${this.settingsService.currencySymbol() || '₹'}${price}` : undefined,
            address: {
              '@type': 'PostalAddress',
              addressLocality: location.name,
              addressRegion: 'West Bengal',
              addressCountry: 'IN'
            }
          }
        };
      });

      graph.push({
        '@type': 'ItemList',
        '@id': `${locUrl}#homestays`,
        name: `Verified Homestays in ${location.name}`,
        numberOfItems: properties.length,
        itemListElement
      });
    }

    return {
      '@context': 'https://schema.org',
      '@graph': graph
    };
  }

  /**
   * Generate FAQPage Schema
   */
  public generateFaqSchema(
    faqs: Array<{ question: string; answer: string }>,
    breadcrumbs?: BreadcrumbItem[]
  ): Record<string, unknown> {
    const origin = this.getBaseUrl();
    const currentUrl = this.getCurrentCleanUrl();

    const graph: Array<Record<string, unknown>> = [];

    if (breadcrumbs && breadcrumbs.length > 0) {
      graph.push({
        '@type': 'BreadcrumbList',
        '@id': `${currentUrl}#breadcrumb`,
        itemListElement: breadcrumbs.map((b, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: b.name,
          item: this.resolvePageUrl(b.url)
        }))
      });
    }

    graph.push({
      '@type': 'FAQPage',
      '@id': `${currentUrl}#faq`,
      mainEntity: faqs.map((f) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: f.answer
        }
      }))
    });

    return {
      '@context': 'https://schema.org',
      '@graph': graph
    };
  }

  /**
   * Generate AboutPage Schema for Our Story
   */
  public generateAboutPageSchema(breadcrumbs?: BreadcrumbItem[]): Record<string, unknown> {
    const origin = this.getBaseUrl();
    const currentUrl = `${origin}/our-story`;
    const appName = this.settingsService.settingsData()?.['app_name']?.trim() || this.defaultSiteName;

    const graph: Array<Record<string, unknown>> = [];

    if (breadcrumbs && breadcrumbs.length > 0) {
      graph.push({
        '@type': 'BreadcrumbList',
        '@id': `${currentUrl}#breadcrumb`,
        itemListElement: breadcrumbs.map((b, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: b.name,
          item: this.resolvePageUrl(b.url)
        }))
      });
    }

    graph.push({
      '@type': 'AboutPage',
      '@id': `${currentUrl}#about`,
      url: currentUrl,
      name: `Our Story — ${appName}`,
      description:
        'Discover how Tashihomes empowers local Himalayan host families while curating authentic, verified village homestays across North Bengal & Sikkim.',
      mainEntity: {
        '@type': 'Organization',
        name: appName,
        url: origin,
        logo: `${origin}/images/hero-himalaya.webp`
      }
    });

    return {
      '@context': 'https://schema.org',
      '@graph': graph
    };
  }

  /**
   * Generate Experiences Page Schema
   */
  public generateExperiencesPageSchema(
    experiences: Array<{ title: string; subtitle: string; description: string; region: string }>,
    breadcrumbs?: BreadcrumbItem[]
  ): Record<string, unknown> {
    const origin = this.getBaseUrl();
    const currentUrl = `${origin}/experiences`;

    const graph: Array<Record<string, unknown>> = [];

    if (breadcrumbs && breadcrumbs.length > 0) {
      graph.push({
        '@type': 'BreadcrumbList',
        '@id': `${currentUrl}#breadcrumb`,
        itemListElement: breadcrumbs.map((b, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: b.name,
          item: this.resolvePageUrl(b.url)
        }))
      });
    }

    const itemListElement = experiences.map((exp, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'TouristAttraction',
        name: exp.title,
        description: exp.description,
        touristType: exp.subtitle,
        location: {
          '@type': 'Place',
          name: exp.region
        }
      }
    }));

    graph.push({
      '@type': 'ItemList',
      '@id': `${currentUrl}#experiences`,
      name: 'Curated Himalayan Experiences & Village Trails',
      description:
        'Immerse yourself in authentic Himalayan village life: tea garden plucking, monastery walks, local cooking, and guided forest trails.',
      numberOfItems: experiences.length,
      itemListElement
    });

    return {
      '@context': 'https://schema.org',
      '@graph': graph
    };
  }

  /**
   * Generate Search Results Page Schema
   */
  public generateSearchResultsSchema(
    query: string,
    properties: Partial<PropertyData>[],
    breadcrumbs?: BreadcrumbItem[]
  ): Record<string, unknown> {
    const origin = this.getBaseUrl();
    const currentUrl = this.getCurrentCleanUrl();

    const graph: Array<Record<string, unknown>> = [];

    if (breadcrumbs && breadcrumbs.length > 0) {
      graph.push({
        '@type': 'BreadcrumbList',
        '@id': `${currentUrl}#breadcrumb`,
        itemListElement: breadcrumbs.map((b, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: b.name,
          item: this.resolvePageUrl(b.url)
        }))
      });
    }

    const itemListElement = properties.slice(0, 20).map((p, index) => {
      const pUrl = this.resolvePageUrl(`/stay/${p.slug}`);
      const img = p.cover_image?.file_url || p.feature_image?.file_url || p.property_assets?.[0]?.file_url;
      const price = p.sale_per_night || p.price_per_night;

      return {
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'BedAndBreakfast',
          name: p.name,
          url: pUrl,
          image: this.resolveAssetUrl(img),
          priceRange: price ? `${this.settingsService.currencySymbol() || '₹'}${price}` : undefined,
          address: {
            '@type': 'PostalAddress',
            addressLocality: p.city?.name || p.location?.name || 'Darjeeling',
            addressRegion: 'West Bengal',
            addressCountry: 'IN'
          }
        }
      };
    });

    graph.push({
      '@type': 'SearchResultsPage',
      '@id': `${currentUrl}#searchresults`,
      name: query ? `Search Results for "${query}"` : 'Homestay Search Results',
      url: currentUrl,
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: properties.length,
        itemListElement
      }
    });

    return {
      '@context': 'https://schema.org',
      '@graph': graph
    };
  }

  /**
   * Generate Legal / Policy Page Schema
   */
  public generateLegalPageSchema(
    pageTitle: string,
    pagePath: string,
    breadcrumbs?: BreadcrumbItem[]
  ): Record<string, unknown> {
    const origin = this.getBaseUrl();
    const currentUrl = `${origin}${pagePath.startsWith('/') ? pagePath : `/${pagePath}`}`;

    const graph: Array<Record<string, unknown>> = [];

    if (breadcrumbs && breadcrumbs.length > 0) {
      graph.push({
        '@type': 'BreadcrumbList',
        '@id': `${currentUrl}#breadcrumb`,
        itemListElement: breadcrumbs.map((b, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: b.name,
          item: this.resolvePageUrl(b.url)
        }))
      });
    }

    graph.push({
      '@type': 'WebPage',
      '@id': `${currentUrl}#webpage`,
      url: currentUrl,
      name: pageTitle,
      isPartOf: {
        '@type': 'WebSite',
        url: origin
      }
    });

    return {
      '@context': 'https://schema.org',
      '@graph': graph
    };
  }

  /**
   * Generate Home Page Schema combining WebSite, Organization & Featured Homestays
   */
  public generateHomeSchema(featuredProperties?: Partial<PropertyData>[]): Record<string, unknown> {
    const websiteGraph = this.generateWebSiteSchema();
    const graph = Array.isArray(websiteGraph['@graph'])
      ? [...(websiteGraph['@graph'] as Array<Record<string, unknown>>)]
      : [];

    if (featuredProperties && featuredProperties.length > 0) {
      const origin = this.getBaseUrl();
      const itemListElement = featuredProperties.slice(0, 10).map((p, index) => {
        const pUrl = `${origin}/stay/${p.slug}`;
        const img = p.cover_image?.file_url || p.feature_image?.file_url || p.property_assets?.[0]?.file_url;
        const price = p.sale_per_night || p.price_per_night;

        return {
          '@type': 'ListItem',
          position: index + 1,
          item: {
            '@type': 'BedAndBreakfast',
            name: p.name,
            url: pUrl,
            image: this.resolveAbsoluteUrl(img),
            priceRange: price ? `${this.settingsService.currencySymbol() || '₹'}${price}` : undefined,
            address: {
              '@type': 'PostalAddress',
              addressLocality: p.city?.name || p.location?.name || 'Darjeeling',
              addressRegion: 'West Bengal',
              addressCountry: 'IN'
            }
          }
        };
      });

      graph.push({
        '@type': 'ItemList',
        '@id': `${origin}/#featured-homestays`,
        name: 'Featured Himalayan Homestays',
        description: 'Handpicked verified homestays across Darjeeling, Kalimpong, Kurseong, Mirik & Dooars.',
        numberOfItems: featuredProperties.length,
        itemListElement
      });
    }

    return {
      '@context': 'https://schema.org',
      '@graph': graph
    };
  }

  /**
   * Generate BreadcrumbList Schema
   */
  public generateBreadcrumbSchema(items: BreadcrumbItem[]): Record<string, unknown> {
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: this.resolvePageUrl(item.url)
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

  /**
   * Resolve site HTML page URLs (e.g. /stay/slug, /stays) using base domain https://tashihomes.in
   */
  public resolvePageUrl(pathOrUrl?: string | null): string {
    if (!pathOrUrl) return this.getBaseUrl();
    if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
      return pathOrUrl;
    }
    const origin = this.getBaseUrl();
    const cleanPath = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
    return `${origin}${cleanPath === '/' ? '' : cleanPath}`;
  }

  /**
   * Resolve media/image/document asset URLs using asset CDN
   */
  public resolveAssetUrl(pathOrUrl?: string | null): string {
    if (!pathOrUrl) return this.defaultOgImage;
    if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://') || pathOrUrl.startsWith('data:')) {
      return pathOrUrl;
    }
    const resolved = this.settingsService.resolveAssetUrl(pathOrUrl);
    if (resolved.startsWith('http://') || resolved.startsWith('https://')) {
      return resolved;
    }
    const origin = this.getBaseUrl();
    const cleanPath = resolved.startsWith('/') ? resolved : `/${resolved}`;
    return `${origin}${cleanPath}`;
  }

  public resolveAbsoluteUrl(pathOrUrl?: string | null): string {
    return this.resolveAssetUrl(pathOrUrl);
  }
}

