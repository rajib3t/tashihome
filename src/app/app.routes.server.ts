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
    path: 'stay/:slug',
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

  // ── Authenticated routes — must be Client-side only ───────────────
  // These pages gate on localStorage tokens; SSR/Prerender always
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

  // ── Fallback ──────────────────────────────────────────────────────
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
