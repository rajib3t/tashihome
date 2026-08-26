import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
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
    path: 'reset-password',
    renderMode: RenderMode.Client
  },
  {
    path: 'reset-password/:token',
    renderMode: RenderMode.Client
  },
  {
    path: 'active-account',
    renderMode: RenderMode.Client
  },
  {
    path: 'active-account/:token',
    renderMode: RenderMode.Client
  },
  {
    path: 'activate-account',
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
    path: 'password-reset/:token',
    renderMode: RenderMode.Client
  },
  {
    path: 'activate-account/:token',
    renderMode: RenderMode.Client
  },
  {
    path: 'admin/property-management/:id/edit',
    renderMode: RenderMode.Client
  },
  {
    path: 'admin/vendor-management/:id/edit',
    renderMode: RenderMode.Client
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];

