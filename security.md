# Security Architecture & Hardening Guidelines

This document outlines the security architecture, authentication mechanisms, authorization controls, data protection, and operational hardening standards implemented across the **TashiHome** frontend platform.

---

## 1. Authentication Architecture

The application implements a defense-in-depth, token-based authentication system combining **short-lived JSON Web Tokens (JWT)** with **HttpOnly cookie-based refresh tokens**.

```
┌──────────────┐                  ┌──────────────────┐                  ┌──────────────────┐
│  Angular App │  (1) /auth/login │  FastAPI Backend │  (2) Token Pair  │ Browser Storage  │
│  (AuthService│─────────────────▶│                  │─────────────────▶│ & HttpOnly Cookie│
│  & Signals)  │                  │                  │                  │                  │
└──────┬───────┘                  └──────────────────┘                  └──────────────────┘
       │
       │ (3) Every Protected Request: Injects Bearer token + X-User-ID
       ▼
┌──────────────────┐  (4) If Token Expired (401)  ┌───────────────────────┐
│ AuthInterceptor  │─────────────────────────────▶│ /auth/refresh-token   │
│ (Request Queue)  │                              │ (Reads HttpOnly Cookie│
└──────────────────┘                              │  Returns New JWT)     │
                                                  └───────────────────────┘
```

### Token Storage & Lifecycle
- **Access Token**: Stored in client `localStorage` (for persistent multi-tab sessions). Contains short-lived claims (user ID, roles, expiration).
- **Refresh Token**: Handled via secure, `HttpOnly`, `SameSite=Lax` cookies issued by the backend API. The frontend never accesses or manipulates raw refresh tokens via JavaScript, mitigating token theft via XSS.
- **Token Decoding & Verification**: The `@auth0/angular-jwt` `JwtHelperService` checks token expiration client-side before dispatching protected requests.

### Cross-Tab Session Synchronization
- Authentication state changes (login, logout, user profile updates) are broadcast across all active browser tabs using the native **`BroadcastChannel` API** on the dedicated `tashihome_auth_channel`.
- **Fallback Mechanism**: Browsers without `BroadcastChannel` support automatically synchronize via `window.addEventListener('storage')` listening for `access_token` and `auth_user` key changes.
- **Immediate State Alignment**: Logging out in one tab immediately purges tokens and redirects all other open tabs to `/login`. Logging in immediately authorizes adjacent tabs without requiring manual page reloads.

### Clean Session Termination
- Calling `AuthService.removeToken()` or logging out clears tokens and cached profiles from both `localStorage` and `sessionStorage` (`removeTokenFromBothStores()`), resets the reactive `authUser` signal to `null`, and broadcasts a `LOGOUT` event across tabs.

---

## 2. HTTP Request Interception & Resilient Token Refresh

The `authInterceptor` (`src/app/interceptors/auth/auth-interceptor.ts`) acts as a central security gatekeeper for all outbound HTTP traffic:

### 1. Automated Header Injection
- Attaches `Authorization: Bearer <access_token>` to protected endpoints.
- Decodes the JWT payload to inject `X-User-ID: <sub claim>`, providing immediate user context to downstream gateway logs.
- Automatically handles `Content-Type: application/json` while preserving browser-computed boundaries for `FormData` file uploads.

### 2. Request Queuing & Refresh Lock (`isRefreshing`)
To eliminate the "thundering herd" problem and race conditions when multiple parallel HTTP requests encounter an expired token:
- A shared state flag (`isRefreshing`) and an RxJS `BehaviorSubject<string | null>` (`refreshTokenSubject`) lock concurrent requests.
- The initial failed request triggers a single call to `AuthService.refreshToken()`.
- Concurrent requests are queued until the new access token is received, then retried with the updated authorization header.
- If the refresh token has expired or is invalid, the queue is drained with an error, the local session is cleared, and the user is redirected to `/login`.

### 3. Public Endpoint Bypass
Authentication headers are bypassed for public and guest routes to eliminate overhead and prevent recursive refresh loops:
- `auth/login`, `auth/register`, `auth/refresh`, `auth/forgot-password`, `auth/reset-password`, `auth/activate-account`
- `settings/fetch`, `bookings/check-availability`, and all endpoints matching `/public/`.

### 4. Normalized Error Processing
All API error responses (network failures, HTTP 400, 401, 403, 404, 409, 413, 422, 429, 500) are mapped into standardized `ApiResponse` structures. Field-level validation errors (HTTP 422/409) are parsed into key-value validation maps for reactive form binding.

---

## 3. Cross-Site Request Forgery (CSRF / XSRF) Mitigation

State-changing requests (`POST`, `PUT`, `PATCH`, `DELETE`) are guarded against CSRF attacks:
- **Double-Submit Cookie Pattern**: The `ApiService` automatically extracts CSRF tokens from cookie storage (`csrf_token`, `CSRF-TOKEN`, `XSRF-TOKEN`, or `csrfToken`).
- **Header Injection**: Tokens are transmitted on outbound requests via both `X-CSRF-Token` and `X-XSRF-TOKEN` headers.
- **Credentialed Requests**: All requests specify `withCredentials: true` to ensure authenticated cookie propagation over HTTPS.

---

## 4. Idempotency & Replay Attack Protection

To prevent double-booking, duplicate payments, or repeated review submissions caused by network hiccups or rapid button clicks:

- **Idempotency Key Generation**: Native Web Crypto API (`crypto.randomUUID()`) generates RFC4122 UUIDv4 tokens (`src/app/utils/idempotency.ts`).
- **Deterministic Keys for Payments**: Payment verifications generate unique deterministic keys based on the gateway payment ID (`verify-${razorpay_payment_id}`).
- **Header Transmission**: Keys are attached via `Idempotency-Key` and `X-Idempotency-Key` headers on mutation requests.
- **Replay Detection**: The frontend inspects incoming `Idempotent-Replay` response headers and logs idempotent cache replays.

---

## 5. Role-Based Access Control (RBAC) & Route Guarding

Route access is enforced through functional Angular router guards (`src/app/guards/auth/`):

```
                                  ┌──────────────────────────┐
                                  │   Incoming Navigation    │
                                  └─────────────┬────────────┘
                                                │
                                       [Platform Check]
                                   (Bypasses SSR evaluation)
                                                │
                                                ▼
                                    ┌───────────────────────┐
                                    │    Is Authenticated?  │
                                    └───────┬───────┬───────┘
                                       No   │       │   Yes
                        ┌───────────────────┘       └───────────────────┐
                        ▼                                               ▼
              ┌──────────────────┐                             ┌──────────────────┐
              │ Redirect /login  │                             │ Check User Role  │
              └──────────────────┘                             └────────┬─────────┘
                                                                        │
                    ┌─────────────────────────┬─────────────────────────┼─────────────────────────┐
                    ▼                         ▼                         ▼                         ▼
            ┌───────────────┐         ┌───────────────┐         ┌───────────────┐         ┌───────────────┐
            │ admin / staff │         │    vendor     │         │     user      │         │ unauthorized  │
            └───────┬───────┘         └───────┬───────┘         └───────┬───────┘         └───────┬───────┘
                    │                         │                         │                         │
                    ▼                         ▼                         ▼                         ▼
             Allow /admin/*            Allow /vendor/*           Allow /user/*             Redirect to
          (Special: admin-only for   (Host management only)   (Trips & profile only)     Own Role Portal
           staff/payouts/refunds)
```

### Route Guard Matrix

| Guard | Permitted Roles | Target Routes | Unauthorized Behavior |
| :--- | :--- | :--- | :--- |
| `authGuard` | Authenticated users | `/admin/**`, `/vendor/**`, `/user/**` | Redirects to `/login` with target return state |
| `guestGuard` | Unauthenticated guests | `/login`, `/register`, `/forgot-password`, `/password-reset`, `/activate-account` | Redirects authenticated users to their respective role dashboard |
| `adminGuard` | `admin`, `staff` | `/admin/**` | Redirects to appropriate portal based on actual role |
| `adminOnlyGuard` | `admin` (Super Admin) | `/admin/staff-management`, `/admin/refund-management`, `/admin/finance/payouts` | Restricts staff from financial and administrative escalations |
| `vendorGuard` | `vendor` (Homestay Host) | `/vendor/**` | Redirects to role dashboard |
| `userGuard` | `user` (Guest / Traveler)| `/user/**`, `/profile/**` | Redirects to role dashboard |
| `profileGuard`| `user`, `vendor` | Shared profile views | Admin/staff routed to `/admin` |

---

## 6. Entity Masking & ID Security

- **Zero Database Integer ID Exposure**: The frontend strictly operates on opaque **UUID strings** (`public_id`) or URL slugs (`city_slug`, `location_slug`, `slug`). Internal database sequence numbers (auto-incrementing integer primary keys) are never consumed, rendered, or passed in route parameters.
- **Client Secrets Protection**: No backend private API secrets, payment gateway secret keys, or database credentials exist within the client-side code. Only public configuration keys (`GOOGLE_MAPS_API_KEY`, Razorpay Key ID) are exposed.
- **SSR Safety**: Route guards and browser-specific APIs (`localStorage`, `window`, `document.cookie`, Web Audio API) include `isPlatformBrowser(platformId)` guards to avoid execution during Server-Side Rendering (SSR).

---

## 7. Client-Side Sanitization & XSS Defense

- **Context-Aware Template Binding**: Angular's default data-binding (`{{ value }}` and `[property]`) automatically encodes untrusted values before rendering into the DOM.
- **Custom HTML Sanitization**: The `SafeHtmlPipe` (`src/app/pipes/safe-html-pipe/`) uses Angular's `DomSanitizer` with strict context sanitization for rendered rich-text policy descriptions and marketing content.
- **File Upload Security**: File upload components (`UploadImage`) enforce MIME-type filtering (JPEG, PNG, WebP) and client-side payload size verification prior to `FormData` submission, with server-side 413 error handling.

---

## 8. Real-Time WebSocket (Socket.IO) Security

- **Authenticated Handshakes**: `NotificationSocketService` connects via JWT authentication passed in both the `auth: { token }` payload and query params.
- **Connection Isolation**: Sockets automatically disconnect when the user logs out or switches accounts, discarding event listeners to avoid memory and data leaks.
- **Transport Security**: WebSocket traffic uses encrypted WSS (`wss://`) in staging and production environments.

---

## 9. AI Concierge & Model Context Protocol (MCP) Security

- **Scoped Tool Execution**: The AI assistant executes actions via backend MCP endpoints (`/api/v1/public/mcp/rpc`) that enforce server-side authentication and role restrictions.
- **Secure Guest Checkouts**: Direct AI checkouts automatically generate guest accounts using server-side validation and password hashing without exposing credentials to the chat stream.

---

## 10. Production Hardening Checklist

- [x] **Enforce HTTPS / HSTS**: All production traffic must terminate over TLS 1.3 with strict `Strict-Transport-Security` headers.
- [x] **Secure Cookie Flags**: Ensure backend cookies specify `HttpOnly; Secure; SameSite=Lax`.
- [x] **Content Security Policy (CSP)**: Configure web server reverse proxy (Nginx / Cloudflare / Amplify) to restrict script and style sources to trusted domains.
- [x] **Rate Limiting Handling**: Client intercepts HTTP 429 Too Many Requests and displays non-disruptive retry messages.
- [x] **Disable Payment Mode Flag**: Verify `DISABLE_PAYMENT=false` in production environments to enable live Razorpay payment processing.
- [x] **Regular Dependency Audits**: Maintain automated vulnerability scans on Bun lockfile dependencies (`bun pm audit`).

