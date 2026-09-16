# System Settings API & Frontend Integration Guide

This guide documents the System Settings architecture in Tashi Homes, including **Tab URL Synchronization**, **Open Graph (OG) Image Upload**, **Social & SEO Meta Tags**, and **API Integration** with the backend service.

---

## 1. Overview & Architecture

The System Settings module allows platform administrators to configure global branding, operational policies, homestay booking financials, social media links, and SEO metadata.

### Navigation & Tab URL Synchronization

The settings page route is `/admin/setting` (with `/admin/settings` redirecting to `/admin/setting`).
All tab sections are synchronized with the browser address bar query parameter `?tab=<section>`:

| Tab Section | URL Query Parameter | Description |
| :--- | :--- | :--- |
| **🏢 General & Brand** | `/admin/setting?tab=general` | App name, currencies, date/time format, logos & favicon |
| **📞 Contact & Support** | `/admin/setting?tab=contact` | Customer support email, phone, address, WhatsApp |
| **🏡 Homestay & Booking** | `/admin/setting?tab=financials` | Commission rates, check-in/out times, min/max stay limits |
| **🌐 Social & SEO** | `/admin/setting?tab=seo` | Social profiles, meta title/description/keywords, OG Image |
| **⏳ Coming Soon** | `/admin/setting?tab=coming-soon` | Maintenance / splash screen countdown mode |
| **🧾 Taxes & GST** | `/admin/settings/taxes` | Tax & GST rate rules dashboard |

#### Deep Linking & Back/Forward Support
- Navigating to `/admin/setting` without a query param automatically defaults to `?tab=general` with `replaceUrl: true`.
- Clicking any tab button updates the URL query string using Angular Router `queryParams: { tab }, queryParamsHandling: 'merge'`.
- Deep links (e.g. sharing or bookmarking `/admin/setting?tab=seo`) directly activate the corresponding section.
- Browser **Back** and **Forward** buttons smoothly switch between visited tabs without losing unsaved form inputs.

---

## 2. Open Graph (OG) Image Upload

### Asset Specifications
- **Field Name**: `og_image` (with backward-compatible alias `meta_image`)
- **Accepted Formats**: `image/png`, `image/jpeg`, `image/webp`
- **Max File Size**: 3 MB
- **Recommended Dimensions**: `1200 × 630 px` (Standard 1.91:1 ratio for Facebook, Twitter Cards, WhatsApp, LinkedIn)
- **Backend Optimization**: Automatic conversion to WebP format, EXIF metadata sanitization, and S3 / CloudFront display URL resolution.

### UI Component
The frontend utilizes the reusable `<app-upload-image>` component:
```html
<app-upload-image
  [id]="'og_image'"
  [name]="'og_image'"
  [preview]="ogImagePreview()"
  [maxSizeMb]="3"
  buttonText="Upload OG Image"
  emptyText="No OG Image Selected"
  (previewChange)="ogImagePreview.set($event)"
  (valueChange)="onOgImageChange($event)">
</app-upload-image>
```

When an image is selected:
1. `ogImagePreview` reactive signal is updated with the local data URL for instant visual feedback.
2. `onOgImageChange(file)` updates both `og_image` and `meta_image` form controls.
3. On submission, the binary file is appended to `FormData` under `og_image` and `meta_image`.

---

## 3. Backend Endpoints

### 3.1 Save / Update Settings (Admin)
- **Endpoint**: `POST /api/v1/admin/settings`
- **Auth**: `Authorization: Bearer <ADMIN_TOKEN>`
- **Content-Type**: `multipart/form-data`
- **Parameters**:
  - String fields: `app_name`, `default_currency`, `currency_symbol`, `contact_email`, `contact_phone`, `meta_title`, `meta_description`, `meta_keywords`, etc.
  - File fields:
    - `app_logo` (Max 2MB)
    - `white_logo` (Max 2MB)
    - `app_favicon` (Max 1MB)
    - `og_image` / `meta_image` (Max 3MB)
    - `coming_background_image` (Max 4MB)
    - `coming_soon_video` (Max 10MB)

### 3.2 Fetch Admin Settings
- **Endpoint**: `GET /api/v1/admin/settings/fetch`
- **Auth**: `Authorization: Bearer <ADMIN_TOKEN>`
- **Response**: Array of `{ name: string, value: string | null }` setting entries with CDN-resolved asset URLs.

### 3.3 Fetch Public Settings
- **Endpoint**: `GET /api/v1/public/settings`
- **Auth**: None (Public)
- **Used by**: App initialization bootstrap, SEO meta tags sync, header brand logos, and footer social links.

---

## 4. Frontend Meta Tags Synchronization

The `SettingsService` automatically mirrors `og_image` across HTML head meta tags on application startup and update:

```html
<meta property="og:title" content="Tashi Homes - Premium Homestays & Stays">
<meta property="og:description" content="Discover handpicked homestays and heritage retreats across Northeast India.">
<meta property="og:image" content="https://cdn.tashihomes.in/settings/og_image_abc.webp">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://cdn.tashihomes.in/settings/og_image_abc.webp">
```

