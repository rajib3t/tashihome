# Project structure

## Application layout

The application is organized as a modular Angular project under the src/app directory.

### Core folders

- app/: main application shell, routes, guards, services, pages, and shared UI
- environments/: environment-specific configuration for local and production builds
- public/: static assets served by the application
- scripts/: helper scripts such as environment generation

### Main architectural areas

- Pages
  - Public views such as home and login
  - Authenticated admin views such as dashboard, settings, and country management
- Services
  - API service for HTTP communication
  - Auth service for token handling and authentication state
  - Domain services for countries, settings, sidebar, theme, and users
- Guards
  - Authentication guard for protected routes
  - Role-based guard for admin-only access
- Shared UI
  - Layouts, headers, sidebars, cards, modals, pagination, and reusable components

## Routing overview

Routing is defined in src/app/app.routes.ts.

- Public routes: home and login
- Authenticated routes: admin area under /admin
- Admin-only features: dashboard, settings, and country management

## Data flow

1. UI components request data from feature services.
2. Services call the central API service.
3. The API service returns typed responses.
4. Components render the response and update state.

## Notes

The repository currently focuses on the frontend experience and relies on a backend API for persistence and business logic.
