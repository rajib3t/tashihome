import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // ── Public auth pages ─────────────────────────────────────────────
  {
    path: 'login',
    renderMode: RenderMode.Client
  },
  {
    path: 'register',
    renderMode: RenderMode.Client
  },
  {
    path: 'forgot-password',
    renderMode: RenderMode.Client
  },
  {
    path: 'password-reset',
    renderMode: RenderMode.Client
  },
  {
    path: 'password-reset/:token',
    renderMode: RenderMode.Client
  },
  {
    path: 'activate-account/:token',
    renderMode: RenderMode.Client
  },
  {
    path: 'agreements/:token',
    renderMode: RenderMode.Client
  },
  {
    path: 'stay/:slug',
    renderMode: RenderMode.Client
  },
  {
    path: 'homestay/:slug',
    renderMode: RenderMode.Client
  },
  {
    path: 'checkout',
    renderMode: RenderMode.Client
  },
  {
    path: 'checkout/:slug',
    renderMode: RenderMode.Client
  },
  {
    path: 'stay/:slug/checkout',
    renderMode: RenderMode.Client
  },
  {
    path: 'homestay/:slug/checkout',
    renderMode: RenderMode.Client
  },

  // ── Dynamic public pages (live API data: properties, cities, stats) ──
  {
    path: '',
    renderMode: RenderMode.Client
  },
  {
    path: 'home',
    renderMode: RenderMode.Client
  },
  {
    path: 'our-story',
    renderMode: RenderMode.Client
  },
  {
    path: 'story',
    renderMode: RenderMode.Client
  },
  {
    path: 'brand-story',
    renderMode: RenderMode.Client
  },
  {
    path: 'stays',
    renderMode: RenderMode.Client
  },
  {
    path: 'stays/:city_slug',
    renderMode: RenderMode.Client
  },
  {
    path: 'stays/:city_slug/:location_slug',
    renderMode: RenderMode.Client
  },
  {
    path: 'homestays',
    renderMode: RenderMode.Client
  },
  {
    path: 'homestays/:city_slug',
    renderMode: RenderMode.Client
  },
  {
    path: 'homestays/:city_slug/:location_slug',
    renderMode: RenderMode.Client
  },
  {
    path: 'experiences',
    renderMode: RenderMode.Client
  },
  {
    path: 'experience',
    renderMode: RenderMode.Client
  },
  {
    path: 'search',
    renderMode: RenderMode.Client
  },
  {
    path: 'become-a-host',
    renderMode: RenderMode.Client
  },
  {
    path: 'become-host',
    renderMode: RenderMode.Client
  },
  {
    path: 'locations',
    renderMode: RenderMode.Client
  },
  {
    path: 'locations/:slug',
    renderMode: RenderMode.Client
  },
  {
    path: 'location',
    renderMode: RenderMode.Client
  },
  {
    path: 'location/:slug',
    renderMode: RenderMode.Client
  },
  {
    path: 'stays/location/:location_slug',
    renderMode: RenderMode.Client
  },
  {
    path: 'stay',
    renderMode: RenderMode.Client
  },

  // produces a no-auth shell, causing the header to show neither the
  // logged-in view nor the login button when opened in a new tab.
  {
    path: 'admin',
    renderMode: RenderMode.Client
  },
  {
    path: 'admin/**',
    renderMode: RenderMode.Client
  },
  {
    path: 'vendor',
    renderMode: RenderMode.Client
  },
  {
    path: 'vendor/**',
    renderMode: RenderMode.Client
  },
  {
    path: 'user',
    renderMode: RenderMode.Client
  },
  {
    path: 'user/**',
    renderMode: RenderMode.Client
  },
  {
    path: 'profile',
    renderMode: RenderMode.Client
  },
  {
    path: 'profile/**',
    renderMode: RenderMode.Client
  },
  {
    path: '404',
    renderMode: RenderMode.Client
  },
  {
    path: 'not-found',
    renderMode: RenderMode.Client
  },

  // ── Fallback ──────────────────────────────────────────────────────
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
