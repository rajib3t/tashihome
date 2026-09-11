# Project Implementation Phases & Roadmap

This document outlines the delivery phases of the **TashiHome** platform, detailing completed architectural milestones, current operational focus, and future roadmap enhancements.

---

## Phase 1: Modern Angular Architecture & Himalayan UI Shell
**Status**: ✅ Completed

- [x] Initialized Angular 22 application with Zoneless change detection (`provideZonelessChangeDetection()`).
- [x] Implemented hybrid SSR and Client Hydration setup using `@angular/ssr` and Express 5 (`src/server.ts`).
- [x] Configured Tailwind CSS 4 with `@tailwindcss/postcss` and DaisyUI 5 theming (Light/Dark themes via `ThemeService`).
- [x] Integrated `lucide-angular` icons and responsive typography suited for Himalayan travel branding.
- [x] Created responsive layout shells:
  - Public Layout (`PublicLayout` with responsive Navbar, Footer, Mobile Drawer).
  - Admin Layout (`Admin` with dynamic collapsible sidebar, user/notification header).
  - Vendor Layout (`Vendor` customized for homestay hosts).
  - User Layout (`User` for consumer profiles and trip history).

---

## Phase 2: Resilient Authentication, Cross-Tab Sync & Multi-Role RBAC
**Status**: ✅ Completed

- [x] Built JWT Bearer authentication flow (`AuthService`) with automated token storage.
- [x] Implemented HttpOnly cookie refresh token rotation (`/api/v1/auth/refresh-token`).
- [x] Designed `authInterceptor` with RxJS `BehaviorSubject` concurrency queue to prevent duplicate refresh calls and serialize retries.
- [x] Implemented cross-tab session synchronization using the native `BroadcastChannel` API (`tashihome_auth_channel`) with `StorageEvent` fallback.
- [x] Established Role-Based Access Control (RBAC) guards:
  - `authGuard` & `guestGuard` for session validation and guest routing.
  - `roleGuard` supporting `admin`, `staff`, `vendor`, and `user` roles.
  - `adminOnlyGuard` for sensitive financial and staff administrative routes.
- [x] Created public account management flows:
  - User registration (`/register`).
  - Account activation via email verification token (`/activate-account/:token`).
  - Forgot password and reset password flows (`/forgot-password`, `/password-reset/:token`).

---

## Phase 3: Public Homestay Discovery, Filtering & Search
**Status**: ✅ Completed

- [x] High-performance landing page (`/home`) featuring popular destinations, featured homestays, guest experiences, and seasonal highlights.
- [x] Dynamic homestay catalog (`/stays`, `/homestays`) with hierarchical routing:
  - Filter by city (`/stays/:city_slug`).
  - Filter by localized micro-neighborhood (`/stays/:city_slug/:location_slug`).
- [x] Comprehensive search engine (`/search`) supporting guest counts, check-in/out dates, price bounds, and amenity filters.
- [x] Property detail page (`/stay/:slug`, `/homestay/:slug`):
  - Image carousel & lightbox.
  - Geo-location and neighborhood details.
  - Amenities and facility categorization.
  - Host details and verified stay badges.
  - Real-time guest reviews and ratings distribution.
- [x] Himalayan Experiences showcase (`/experiences`) highlighting trekking routes, village tours, and local culture.
- [x] Centralized legal terms and policies hub (`/legal`, `/terms`, `/privacy-policy`, `/refund-policy`, `/host-agreement`).

---

## Phase 4: Room Hierarchy, Pricing Engine & Tiered Rates
**Status**: ✅ Completed

- [x] Designed room type configuration allowing multi-room homestays with distinct capacities and bed configurations.
- [x] Implemented client-side pricing resolution engine (`src/app/utils/pricing.utils.ts`):
  - Exact guest occupancy matching against `pricing_tiers`.
  - Fallback logic to closest capacity tier or standard room rate.
  - Promotional discounted rate calculation (`sale_per_night` vs `price_per_night`).
  - Property-level fallback rate calculation.
- [x] Client-side pricing tier validation ensuring capacity constraints and valid non-negative amounts.

---

## Phase 5: Booking Workflow, Razorpay Checkout & Idempotency
**Status**: ✅ Completed

- [x] Real-time room availability checker with date blocking to prevent overlapping bookings.
- [x] Multi-step reservation checkout experience (`/checkout`, `/checkout/:slug`):
  - Guest contact info and primary guest identification.
  - Dynamic stay duration calculation with automated tax/GST computation (`TaxService`).
- [x] Razorpay Payment Gateway integration (`RazorpayService`):
  - Modal checkout launcher with order creation.
  - Signature verification callback.
  - Configurable `DISABLE_PAYMENT` mode for local sandbox testing.
- [x] End-to-end idempotency protection:
  - UUIDv4 idempotency keys generated via Web Crypto API.
  - Deterministic payment verification keys (`verify-${payment_id}`).
  - Detection and handling of backend `Idempotent-Replay` response headers.

---

## Phase 6: Guest Profile Portal & Post-Booking Management
**Status**: ✅ Completed

- [x] Dedicated Guest Dashboard (`/user`, `/profile`) with tabbed navigation:
  - `account`: Profile editing, contact details, bio, and avatar upload/delete.
  - `security`: Password update with current password verification.
  - `trips`: Active, past, and cancelled bookings with real-time status badges.
  - `saved`: Bookmarked favorite homestays.
  - `reviews`: Past reviews submitted by the user with host replies.
  - `testimonials`: Story submission for Himalayan experience features.
- [x] Booking detail modal with invoice download, remaining balance payment settlement, and cancellation request processing.

---

## Phase 7: Host & Vendor Portal (`/vendor`)
**Status**: ✅ Completed

- [x] Host onboarding application flow (`/become-a-host`).
- [x] Vendor Portal Dashboard (`/vendor`):
  - Host statistics: Monthly revenue, booking counts, active listings, and average rating.
- [x] Property Listing Management (`/vendor/property-management`):
  - Multi-step property creation wizard with draft saving.
  - Image gallery upload, reordering, and featured photo selection.
  - Room type setup, bedding, amenities, and tier pricing matrix.
- [x] Availability Calendar & Room Blocking (`/vendor/room-blocks`):
  - Manual blocking for maintenance or personal host use.
- [x] Host Reservation Management (`/vendor/booking-management`):
  - View guest details, check-in status, and special requests.
- [x] Host Reviews & Testimonials:
  - View guest reviews, ratings, and submit host replies.

---

## Phase 8: Administrative Operations, Financials & Moderation (`/admin`)
**Status**: ✅ Completed

- [x] Comprehensive Admin Dashboard (`/admin`) with key platform KPIs, metrics, and recent activity.
- [x] Geographical Catalog Management:
  - Country Management (`/admin/country-management`).
  - City Management (`/admin/city-management`).
  - Neighborhood/Location Management (`/admin/location-management`).
- [x] Facility & Amenity Management (`/admin/facility-management`, `/admin/amenity-management`).
- [x] Property & Listing Moderation (`/admin/property-management`):
  - Review, approve, reject, feature, or suspend homestay listings.
- [x] User & Vendor Management:
  - Customer profile administration (`/admin/customer-management`).
  - Host/Vendor vetting and onboarding approval (`/admin/host-management`).
- [x] Operational Moderation:
  - Global booking management (`/admin/booking-management`).
  - Global room blocks (`/admin/room-blocks`).
  - Review moderation & publishing (`/admin/review-management`).
  - Testimonial moderation (`/admin/testimonial-management`).
- [x] Financial & Security Controls (`adminOnlyGuard`):
  - Tax and GST rate management (`/admin/tax-management`).
  - Refund requests processing and approval (`/admin/refund-management`).
  - Host payout disbursement management (`/admin/finance/payouts`).
  - Staff user provisioning and RBAC permissions (`/admin/staff-management`).

---

## Phase 9: Real-Time WebSocket Infrastructure & Notifications
**Status**: ✅ Completed

- [x] Integrated `socket.io-client` with JWT-authenticated handshakes (`NotificationSocketService`).
- [x] Real-time notification feed for booking status updates, host application approvals, and reviews.
- [x] Interactive header notification dropdown with unread badge counter.
- [x] Synthesized non-blocking auditory chimes using the Web Audio API without external audio assets.
- [x] Auto-reconnection logic with exponential backoff and storage-event token synchronization.

---

## Phase 10: AI Concierge, Vector Semantic Engine & MCP Protocol
**Status**: ✅ Completed

- [x] Floating conversational assistant widget (`AIAssistant`) with toggleable feature flag (`ENABLE_CHATBOX`).
- [x] Server-Sent Events (SSE) streaming for real-time conversational token delivery (`/chat/stream`).
- [x] Model Context Protocol (MCP) tool integration:
  - Homestay semantic vector search.
  - Real-time room availability checks.
  - Policy query retrieval.
  - Direct conversational checkout execution.
- [x] Dynamic suggestion chips and contextual prompt recommendations.

---

## Phase 11: Testing, CI/CD & Production Optimization
**Status**: 🔄 In Progress

- [x] Vitest unit test suite configured with 74+ spec files covering core guards, interceptors, services, and components.
- [x] Automated environment generation script (`scripts/generate-environment.mjs`) hooked into `prestart` and `prebuild`.
- [x] AWS Amplify build specification (`amplify.yml`) with Bun dependency caching and CSR fallback handling.
- [ ] Increase end-to-end (E2E) integration test coverage for checkout and payment flows.
- [ ] Optimize SSR cache strategies for public catalog pages (`RenderMode.Prerender` / Incremental Static Regeneration).
- [ ] Image optimization pipeline using next-gen formats (AVIF/WebP) with responsive `srcset` generation.

---

## Phase 12: Future Roadmap & Enhancements
**Status**: 📋 Planned

- [ ] **Multi-Currency & Internationalization (i18n)**:
  - Currency conversion (INR, USD, EUR, BTN, NPR) for international travelers visiting Bhutan and Sikkim.
  - Multi-language localization (English, Hindi, Nepali, Tibetan).
- [ ] **Progressive Web App (PWA) Offline Capabilities**:
  - Offline booking voucher access for travelers in low-connectivity mountain regions.
  - Background sync for review drafts.
- [ ] **Dynamic & Seasonal Pricing Rules**:
  - Automated peak season (spring/autumn trekking season) pricing adjustments for hosts.
- [ ] **Integrated Host Messaging**:
  - Direct guest-to-host chat within the platform before and during stays.
- [ ] **Automated Host Bank Payouts**:
  - Direct bank transfer integration (Razorpay Route / Payouts API) for automated commission splits and scheduled payouts.

