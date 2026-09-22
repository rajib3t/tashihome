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

