# Project Structure & Architectural Map

This document provides a detailed breakdown of the directory organization, architectural patterns, routing topology, domain services, and component hierarchy of the **TashiHome** application.

---

## 1. High-Level Directory Layout

```
tashihome/
├── docs/                             # Architecture and API integration guides
│   └── api/
│       ├── ai-assistant-mcp-integration-guide.md
│       └── reviews-testimonials-api-guide.md
├── public/                           # Static assets served at root
│   ├── favicon.ico
│   ├── images/                       # Branding logos, hero assets, badges
│   └── fonts/                        # Local brand typography
├── scripts/                          # Build and environment automation
│   └── generate-environment.mjs      # Generates environment.ts & environment.prod.ts from .env
├── src/
│   ├── app/                          # Main Angular application root
│   │   ├── guards/                   # Functional route guards (auth, guest, roles)
│   │   ├── interceptors/             # HTTP interceptors (token injection, refresh queue, CSRF)
│   │   ├── pages/                    # Routed view components grouped by access tier
│   │   ├── pipes/                    # Presentation pipes (date formatting, safe HTML)
│   │   ├── services/                 # 26 Domain services and data models
│   │   ├── shared/                   # Reusable UI components and portal layouts
│   │   ├── utils/                    # Shared calculation, validation, and crypto helpers
│   │   ├── app-title-strategy.ts     # Dynamic document title provider
│   │   ├── app.config.ts             # Client application configuration (Zoneless, Hydration)
│   │   ├── app.config.server.ts      # Server-side rendering (SSR) configuration
│   │   ├── app.routes.ts             # Primary client route definitions (530+ lines)
│   │   ├── app.routes.server.ts      # SSR route rendering modes (Client vs Prerender)
│   │   ├── app.html                  # Root router-outlet host
│   │   └── app.ts                    # Root component class
│   ├── environments/                 # Auto-generated runtime environment configurations
│   ├── styles.css                    # Tailwind CSS v4, DaisyUI v5, and global custom classes
│   ├── index.html                    # Application HTML entry document
│   ├── main.ts                       # Browser bootstrap entry
│   ├── main.server.ts                # Server bootstrap entry
│   └── server.ts                     # Express 5 server for Server-Side Rendering
├── angular.json                      # Angular CLI project configuration
├── bun.lock                          # Bun package lockfile
├── package.json                      # NPM dependencies and lifecycle scripts
├── proxy.conf.js                     # Local dev proxy for API and WebSocket traffic
├── phases.md                         # Milestones and feature roadmap
├── security.md                       # Security architecture and threat mitigations
└── README.md                         # Project documentation and quick-start guide
```

---

## 2. Angular Core Architecture (`src/app/`)

### Application Bootstrap & Configuration (`app.config.ts`)
The application is configured using modern, modular Angular 22 provider factories:
- **`provideZonelessChangeDetection()`**: Completely eliminates `zone.js` runtime overhead; change detection is driven by reactive Angular **Signals** and fine-grained change notification.
- **`provideClientHydration(withNoHttpTransferCache())`**: Reconciles server-rendered HTML with the client DOM without re-rendering flicker.
- **`provideBrowserGlobalErrorListeners()`**: Captures unhandled runtime errors globally.
- **`provideHttpClient(withInterceptors([authInterceptor]), withInterceptorsFromDi())`**: Configures the unified HTTP client pipeline.
- **`provideAppInitializer(...)`**: Asynchronously bootstraps core settings (`SettingsService.getPublicSettings()`) and session verification (`AuthService.initializeAuth()`) before root view mounting.
- **`provideRouter(routes)`**: Registers the primary route tree with `AppTitleStrategy`.

---

## 3. Routing & Portals (`src/app/pages/`)

The application is split into four distinct experience tiers:

```
                                  ┌───────────────────────────────┐
                                  │       App Root (app.ts)       │
                                  └───────────────┬───────────────┘
                                                  │
                 ┌────────────────────────────────┼───────────────────────────────┐
                 │                                │                               │
                 ▼                                ▼                               ▼
      ┌──────────────────────┐        ┌───────────────────────┐       ┌───────────────────────┐
      │   Standalone Auth    │        │     Public Portal     │       │ Authenticated Portals │
      │   (Guest Guarded)    │        │    (Public Layout)    │       │    (Auth Guarded)     │
      └──────────┬───────────┘        └───────────┬───────────┘       └───────────┬───────────┘
                 │                                │                               │
        • /login                         • / (Home)                      ┌────────┼────────┐
        • /register                      • /stays & /homestays           │        │        │
        • /forgot-password               • /stay/:slug                   ▼        ▼        ▼
        • /password-reset                • /experiences               /admin   /vendor   /user
        • /activate-account              • /checkout                  Portal   Portal    Portal
                                         • /become-a-host
                                         • /legal
```

### A. Standalone Auth Pages (`pages/public/`)
Guarded by `guestGuard` to redirect already-authenticated users to their role dashboards:
- `/login`: User authentication with remember-me support.
- `/register`: Consumer registration.
- `/forgot-password`: Password reset request.
- `/password-reset/:token`: Password token redemption.
- `/activate-account/:token`: Account activation from verification email.

### B. Public Portal (`shared/layouts/public/public.ts`)
- `/`: Home landing page with destination explorer, stay finder, and testimonials.
- `/stays`, `/homestays`: Catalog listing with city and neighborhood slug routing (`/stays/:city_slug/:location_slug`).
- `/stay/:slug`, `/homestay/:slug`: Detailed stay view with photo galleries, room selection, and reviews.
- `/checkout`, `/checkout/:slug`: Reservation booking and Razorpay payment checkout.
- `/search`: Multi-filter search results page.
- `/experiences`: Himalayan travel stories and activities showcase.
- `/our-story`: Brand ethos, mission, and regional community impact.
- `/become-a-host`: Onboarding application for prospective homestay owners.
- `/legal`, `/terms`, `/privacy-policy`, `/refund-policy`, `/host-agreement`: Multi-tab policy center.

### C. Admin Control Plane (`/admin/**`)
Protected by `authGuard` and `adminGuard`. Specific sensitive endpoints enforce `adminOnlyGuard`:
- **Dashboard & Configuration**:
  - `/admin`: Dashboard with high-level revenue and reservation metrics.
  - `/admin/profile`: Admin account settings.
  - `/admin/setting`: Platform settings (branding, contact details, platform toggles).
- **Geographical & Amenity Hierarchy**:
  - `/admin/country-management`: Supported countries and currency mappings.
  - `/admin/city-management`: Tourist destinations and regions.
  - `/admin/location-management`: Local neighborhoods and villages.
  - `/admin/facility-management`: Core property amenities (Wi-Fi, Kitchen, Parking).
  - `/admin/amenity-management`: Room-specific perks (Mountain View, Balcony, Fireplace).
  - `/admin/room-type-management`: Standardized room classifications.
- **Inventory & Reservations**:
  - `/admin/property-management`: Homestay listings, verification, status toggle.
  - `/admin/property-management/create`: Multi-step homestay authoring wizard.
  - `/admin/property-management/:id/edit`: Listing modification.
  - `/admin/booking-management`: Platform-wide booking oversight.
  - `/admin/room-blocks`: Global calendar availability management.
- **User, Host & Content Moderation**:
  - `/admin/customer-management`: Registered guest accounts.
  - `/admin/vendor-management`: Registered host profiles.
  - `/admin/host-management`: Host onboarding applications and verification.
  - `/admin/review-management`: Guest review moderation.
  - `/admin/testimonial-management`: Guest testimonial publishing.
- **Financial & Administrative Controls (`adminOnlyGuard`)**:
  - `/admin/tax-management`: Dynamic GST and occupancy tax rates.
  - `/admin/staff-management`: Staff role assignment and user permissions.
  - `/admin/refund-management`: Guest refund requests and approvals.
  - `/admin/finance/payouts`: Host payout disbursements.

### D. Vendor / Host Portal (`/vendor/**`)
Protected by `authGuard` and `vendorGuard`:
- `/vendor`: Host metrics (occupancy rates, active reservations, monthly income).
- `/vendor/profile`: Host profile and contact details.
- `/vendor/property-management`: Host's own homestay listings.
- `/vendor/property-management/create`: Add new property listing.
- `/vendor/property-management/:id/edit`: Update existing listing.
- `/vendor/booking-management`: Reservations for the host's properties.
- `/vendor/room-blocks`: Availability calendar and manual date blocking.
- `/vendor/review-management`: Guest reviews and host response submission.
- `/vendor/testimonial-management`: Host story submissions.

### E. Guest Portal (`/user/**` & `/profile/**`)
Protected by `authGuard` and `userGuard` (or `profileGuard`):
- `/user` (`/profile`): Multi-tab guest account portal:
  - `account`: Personal profile, contact info, bio, and avatar.
  - `security`: Password changes.
  - `trips`: Past, active, and upcoming bookings with cancellation and balance payment modals.
  - `saved`: Bookmarked favorite homestays.
  - `reviews`: Submitted reviews and received host replies.
  - `testimonials`: Story submission for platform showcase.

---

## 4. Domain Services (`src/app/services/`)

The application contains 26 decoupled, typed domain services:

| Domain Service | File | Purpose |
| :--- | :--- | :--- |
| **`ApiService`** | `api/api-service.ts` | Central HTTP client with CSRF injection, FormData handling, idempotency, and error normalization |
| **`AuthService`** | `auth/auth-service.ts` | JWT tokens, login/logout state, cross-tab `BroadcastChannel` synchronization, and session initialization |
| **`AssistantService`**| `assistant/assistant-service.ts` | AI Concierge communication, SSE streaming (`/chat/stream`), vector search, and MCP tools |
| **`BookingService`** | `booking/booking-service.ts` | Availability check, reservation creation, guest trip queries, and cancellation processing |
| **`RazorpayService`**| `booking/razorpay-service.ts` | Razorpay SDK loader, modal checkout launch, and signature verification callback |
| **`PropertyService`** | `property/property-service.ts` | Homestay CRUD, image galleries, room type linkages, and catalog filters |
| **`RoomTypeService`** | `room-type/room-type-service.ts`| Room type classifications and attribute schemas |
| **`RoomBlockService`**| `room-block/room-block.service.ts` | Calendar date blocking for maintenance or host reservation holds |
| **`CityService`** | `city/city-service.ts` | Destination cities, slugs, and associated homestays |
| **`CountryService`** | `country/country-service.ts` | Supported countries and internationalization data |
| **`LocationService`** | `location/location-service.ts` | Micro-locations, villages, and geographic coordinates |
| **`FacilityService`** | `facility/facility-service.ts` | Core property facilities (Wi-Fi, parking, heating) |
| **`AmenityService`** | `amenity/amenity-service.ts` | Room amenities (mountain views, private balconies) |
| **`TaxService`** | `tax/tax-service.ts` | GST / VAT rate resolution and dynamic tax calculation |
| **`ReviewService`** | `review/review-service.ts` | Review submission, approval, and host response handling |
| **`TestimonialService`**| `testimonial/testimonial-service.ts` | Guest experience stories and editorial moderation |
| **`PayoutService`** | `payout/payout-service.ts` | Host commission calculations and payout disbursements |
| **`RefundService`** | `refund/refund-service.ts` | Refund requests, approval workflow, and transaction receipts |
| **`HostService`** | `host/host-service.ts` | Host application submissions, vetting, and onboarding |
| **`UserService`** | `user/user-service.ts` | Guest profiles, user avatar uploads, and customer management |
| **`StaffService`** | `staff/staff-service.ts` | Admin staff account provisioning and role assignments |
| **`SettingsService`** | `settings/settings-service.ts` | Public and administrative platform configuration |
| **`DashboardService`**| `dashboard/dashboard-service.ts` | Aggregated analytics and reporting data |
| **`NotificationService`**| `notification/notification.service.ts` | Notification state management, unread badges, and Web Audio chimes |
| **`NotificationSocketService`**| `notification/notification-socket.service.ts`| Socket.IO client lifecycle and JWT auth synchronization |
| **`NotificationApiService`**| `notification/notification-api.service.ts` | REST endpoints for notification pagination and read receipts |
| **`SidebarService`** | `sidebar/sidebar-service.ts` | Admin and vendor responsive sidebar expansion state |
| **`ThemeService`** | `theme/theme-service.ts` | Theme switching (Light / Dark) persisted in localStorage |
| **`UiService`** | `ui/ui-service.ts` | Global alerts, toasts, and modal states |

---

## 5. Shared UI & Layouts (`src/app/shared/`)

```
src/app/shared/
├── components/
│   ├── ai-assistant/         # Floating AI Concierge with streaming chat & MCP chips
│   ├── coming-soon/          # Placeholder view for upcoming portal features
│   ├── common/
│   │   ├── logo/             # Brand SVG logo in light/dark variants
│   │   ├── page-breadcrumb/  # Dynamic hierarchical route breadcrumbs
│   │   ├── theme-toggle/     # Light/dark mode toggling button
│   │   └── upload-image/     # Image uploader with file validation & progress
│   ├── header/
│   │   ├── notification-dropdown/ # Real-time notification panel with audio alert
│   │   └── user-dropdown/    # User avatar dropdown with quick navigation & logout
│   ├── properties/
│   │   └── single-property/  # Reusable homestay presentation card
│   ├── ui/
│   │   ├── card/             # Container card with header/body/footer slots
│   │   ├── date-input/       # Standardized date-picker input
│   │   ├── dropdown/         # Accessible overlay dropdown component
│   │   ├── modal/            # Accessible modal dialog with backdrop & escape handling
│   │   └── pagination/       # Reusable paginator with page-size selection
│   └── users/
│       ├── admin/            # Admin user presentation helpers
│       └── avatar/           # Dynamic user avatar with fallback initials
└── layouts/
    ├── public/               # Public layout (Header, Nav, Footer, Drawer)
    ├── authenticate/         # Base layout for authenticated views
    │   ├── admin/            # Admin portal layout with collapsible sidebar
    │   ├── vendor/           # Vendor host portal layout
    │   └── user/             # Guest profile portal layout
```

---

## 6. Utilities & Helpers (`src/app/utils/`)

- **`pricing.utils.ts`**:
  - `getRoomNightlyRate(room, guestsPerRoom, fallbackPrice, fallbackSalePrice)`: Resolves effective nightly room rates matching guest occupancy against configured pricing tiers.
  - `validatePricingTiers(tiers, maxCapacity)`: Validates occupancy coverage, positive rates, and ensuring sale prices are lower than standard prices.
- **`idempotency.ts`**:
  - `generateIdempotencyKey()`: Generates standard RFC4122 UUIDv4 keys using Web Crypto API.
  - `generatePaymentVerificationKey(paymentId)`: Deterministic payment verification idempotency keys.
  - `isValidUuid(str)`: RegEx format verification for UUIDv4 strings.

---

## 7. Data Flow & Reactive State Architecture

The application adopts a **Signal-First, Reactive Uni-Directional Data Flow**:

```
 ┌──────────────────────┐        User Action        ┌──────────────────────┐
 │  Angular Component   │──────────────────────────▶│    Domain Service    │
 │ (Signal State & DOM) │◀──────────────────────────│  (Signals & Signals) │
 └──────────────────────┘       Signals Update      └──────────┬───────────┘
                                                               │
                                                       HTTP / WebSocket
                                                               │
                                                               ▼
 ┌──────────────────────┐       Normalized DTO      ┌──────────────────────┐
 │   Backend FastAPI    │──────────────────────────▶│      ApiService      │
 │  & Socket.IO Server  │                           │   (AuthInterceptor)  │
 └──────────────────────┘                           └──────────────────────┘
```

1. **Component Trigger**: User interacts with UI (e.g. searching homestays, updating room blocks, submitting checkout).
2. **Service Delegation**: Component invokes the corresponding Domain Service method.
3. **HTTP / Interceptor Pipeline**:
   - `ApiService` sets idempotency and CSRF headers.
   - `authInterceptor` validates token expiration and injects `Authorization: Bearer` and `X-User-ID`.
4. **Reactive State Emission**:
   - Asynchronous responses update Angular **Signals** (`signal.set()`, `signal.update()`).
   - Components derive reactive view state via `computed()`.
5. **Real-Time Convergence**:
   - Incoming `socket.io-client` push notifications immediately update signals in `NotificationService`.
   - `BroadcastChannel` immediately synchronizes multi-tab auth state across windows.

