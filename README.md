# TashiHome App 🏔️

**TashiHome** is a high-performance, modern homestay booking and hospitality platform built for the Himalayan travel ecosystem (Sikkim, Darjeeling, Kalimpong, Bhutan, and surrounding regions).

Powered by **Angular 22** with Zoneless Change Detection and Server-Side Rendering (SSR), the platform offers a consumer-facing discovery and reservation experience, a dedicated Guest profile portal, a Host/Vendor portal, and an Administrative control plane with AI Concierge capabilities.

---

## Key Features

### 1. Consumer Public Experience
- **Homestay Discovery & Dynamic Search**: Filter stays by destination, location, pricing, capacity, amenities, and room availability.
- **Hierarchical Tiered Room Pricing Engine**: Real-time rate calculation based on occupancy, standard vs. promotional rates, and room-level configuration.
- **Seamless Reservation & Checkout Flow**: Guest details, stay duration, special requests, dynamic tax calculation, and payment gateway integration.
- **Payment Processing (Razorpay)**: Online reservation payments with built-in idempotency keys (`Idempotency-Key` / `X-Idempotency-Key`) and configurable `DISABLE_PAYMENT` mode for staging.
- **Himalayan Experiences & Guest Stories**: Public reviews, testimonials, and brand story pages.
- **Centralized Legal Policies**: Tabbed policy viewer covering Guest Terms, Host Partner Agreement, Privacy Policy, and Cancellation & Refund Policies.

### 2. AI Concierge & Vector Engine (MCP)
- **Conversational Booking Assistant**: Floating AI concierge widget with multi-tool calling via the Model Context Protocol (MCP).
- **Vector Semantic Search**: Natural language "vibe-based" search matching guest preferences with indexed homestays.
- **SSE Real-time Streaming**: Instant conversational responses streamed over Server-Sent Events.
- **Direct AI Checkout**: Streamlined booking directly within the chat dialogue with automatic guest account provisioning.

### 3. Multi-Portal Role-Based Architecture
- **Admin Portal (`/admin`)**:
  - Complete control center: Dashboard metrics, revenue tracking, and application configuration.
  - Property & Room Type Management: Full multi-step homestay listings, room tiers, photo galleries, facilities, and amenities.
  - Geographical Hierarchy: Manage countries, cities, and local micro-destinations/neighborhoods.
  - Operations & Moderation: Booking management, room block calendar, review/testimonial moderation, and host applications.
  - Finance & Security (`adminOnlyGuard`): Tax/GST rates, refund processing, host payout management, and staff account management.
- **Vendor / Host Portal (`/vendor`)**:
  - Host dashboard with occupancy, revenue, and active reservations.
  - Property listing creation, media uploads, and room management.
  - Availability calendar & manual room blocks (prevent double bookings).
  - Guest reviews, ratings, and testimonial submission.
- **Guest / User Portal (`/user` & `/profile`)**:
  - Trips dashboard: Upcoming, past, and cancelled reservations with interactive detail modals.
  - Balance payment settlement and refund status tracking.
  - Saved homestays bookmarking.
  - Review and platform testimonial submission.
  - Account profile details and security (password updates).

### 4. Real-Time Infrastructure & Resilience
- **Socket.IO Real-Time Notifications**: Live updates for bookings, host applications, and status transitions with Web Audio API chime tones.
- **Cross-Tab Session Synchronization**: Uses native `BroadcastChannel` (`tashihome_auth_channel`) with storage event fallback to keep login/logout state synchronized across all browser tabs.
- **Resilient Auth Interceptor**: Transparent token refresh on 401/expiry with an RxJS queue to prevent duplicate refresh requests, plus automated CSRF token attachment.

---

## Tech Stack

| Domain | Technology / Library | Description |
| :--- | :--- | :--- |
| **Framework** | Angular 22 (`@angular/core`) | Modern Angular with Zoneless Change Detection (`provideZonelessChangeDetection`), Signals, and Standalone Components |
| **Rendering** | `@angular/ssr`, Express 5 | Hybrid Server-Side Rendering (SSR) with Client Hydration and static prerendering fallback |
| **Language** | TypeScript 5.9+ / 6.0 | Strict type safety across models, DTOs, and API responses |
| **Styling** | Tailwind CSS 4 (`@tailwindcss/postcss`) + DaisyUI 5 | High-efficiency utility-first styling with theme toggling (Light/Dark) |
| **Icons & Animation** | `lucide-angular`, `tw-animate-css` | Vector icons and CSS animation utilities |
| **State & Reactivity** | Angular Signals & RxJS 7.8 | Signal-first component state with RxJS for async event streams |
| **Real-time** | `socket.io-client` 4.8 | Low-latency bi-directional WebSocket notification bridge |
| **Payments** | Razorpay Checkout SDK | Online payment gateway integration with idempotent verification |
| **Testing** | Vitest 4.1 (`@angular/build:unit-test`, `jsdom`) | Rapid unit and integration testing suite (74+ test suites) |
| **Package Manager** | Bun | Ultra-fast package management and build execution |

---

## Project Directory Overview

```
tashihome/
├── docs/                   # API documentation and MCP integration guides
├── public/                 # Static assets, fonts, icons, images
├── scripts/                # Environment synchronizer (generate-environment.mjs)
├── src/
│   ├── app/
│   │   ├── guards/         # Auth, guest, and role-based route guards (RBAC)
│   │   ├── interceptors/   # Auth token, refresh queue, CSRF, and error interceptor
│   │   ├── pages/          # Public, Admin, Vendor, and User portal pages
│   │   ├── pipes/          # Custom formatting pipes (date, safe HTML)
│   │   ├── services/       # 26 modular domain services (API, Auth, Booking, Property, etc.)
│   │   ├── shared/         # Reusable layouts, UI components (cards, modals, dropdowns, AI chat)
│   │   ├── utils/          # Idempotency generators, pricing calculators, validators
│   │   ├── app.config.ts   # Core providers (Zoneless, SSR Hydration, Interceptors, Initializer)
│   │   └── app.routes.ts   # Declarative route configuration across all portals
│   ├── environments/       # Environment files generated from .env
│   ├── index.html          # Application HTML shell
│   ├── main.ts             # Browser bootstrap entry point
│   ├── main.server.ts      # SSR server bootstrap entry point
│   ├── server.ts           # Express SSR server
│   └── styles.css          # Global Tailwind CSS and theme definitions
├── angular.json            # Angular CLI application builder configuration
├── package.json            # Dependencies and npm/bun scripts
├── proxy.conf.js           # Development API and WebSocket proxy configuration
├── phases.md               # Development phases and roadmap status
├── security.md             # Security architecture, auth flows, and hardening guidelines
└── structure.md            # In-depth architectural layout and file structure
```

---

## Getting Started

### Prerequisites
- [Bun](https://bun.sh/) (version 1.1+ recommended) or Node.js (v20+ / v24)
- Backend API server running (or proxy configured to remote API)

### 1. Installation
Clone the repository and install dependencies with Bun:

```bash
bun install
```

### 2. Environment Configuration
Create your local `.env` file from the example:

```bash
cp .env.example .env
```

Key environment variables:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `APPLICATION_NAME` | `Tashi Home` | Brand title displayed in headers and document title strategy |
| `API_URL` | `http://localhost:8020` | Base URL of the backend API service |
| `ASSET_URL` | `http://127.0.0.1:8020/api/v1/assets/` | Base URL for uploaded property images and user avatars |
| `GOOGLE_MAPS_API_KEY` | *(optional)* | API key for location and property maps integration |
| `DISABLE_PAYMENT` | `false` | When `true`, bypasses real payment capture (useful for local development) |
| `ENABLE_CHATBOX` | `true` | When `false`, unmounts the floating AI Concierge widget |
| `SOCKET_URL` | *(optional)* | URL for Socket.IO real-time server (defaults to API domain) |
| `SOCKET_PATH` | `/socket.io` | Custom path for Socket.IO handshake endpoint |
| `DEV_API_PROXY_TARGET`| `http://127.0.0.1:8000` | Target URL used by `proxy.conf.js` during local dev |

### 3. Synchronize Environment Files
Generate the typed TypeScript environment files (`src/environments/environment.ts` and `environment.prod.ts`):

```bash
bun run sync:env
```
*(Note: `prestart` and `prebuild` hooks automatically trigger this script).*

### 4. Start the Development Server
Launch the Angular development server with local proxy:

```bash
bun run start
```
Open [http://localhost:4200/](http://localhost:4200/) in your browser. All `/api` and `/socket.io` calls will proxy to your backend server according to `proxy.conf.js`.

---

## Useful Commands

```bash
# Start dev server with auto environment sync
bun run start

# Build production bundle with SSR and client assets
bun run build

# Watch mode for development builds
bun run watch

# Run unit tests via Vitest
bun run test

# Run SSR server locally after building
bun run serve:ssr:tashhome-app

# Sync .env variables into environment.ts
bun run sync:env
```

---

## Deployment

The application is configured for deployment on platforms such as **AWS Amplify**, **Vercel**, or **Docker/Node containers**.

An `amplify.yml` build definition is included in the root directory:
- Builds client assets into `dist/tashhome-app/browser`
- Handles fallback copying for `index.csr.html` to `index.html` for single-page routing
- Caches `node_modules` and Bun installation for rapid CI/CD runs

---

## Project Documentation

For deeper architectural, lifecycle, and security insights:
- [Project Structure & Architecture](structure.md)
- [Security Model & Hardening](security.md)
- [Development Phases & Roadmap](phases.md)
- [AI Concierge & MCP Integration Guide](docs/api/ai-assistant-mcp-integration-guide.md)
- [Reviews & Testimonials API Guide](docs/api/reviews-testimonials-api-guide.md)
