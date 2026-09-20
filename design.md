# Tashi Homes — Design System & UI Standards (`design.md`)

This document defines the official visual design language, color tokens, typography scales, spacing rules, and hero section architecture for the **Tashi Homes** platform. All new components and page templates must adhere to these specifications to preserve aesthetic consistency and Himalayan brand identity.

---

## 1. Brand Palette & Color Tokens

Tashi Homes uses a bespoke Himalayan nature palette inspired by misty pine forests, glacial rivers, hearthside warmth, and hand-woven prayer flags.

### 1.1 Brand Colors

| Token Name | Hex Code | OKLCH / CSS Var | Purpose & Role |
| :--- | :--- | :--- | :--- |
| **Pine (Deep)** | `#0C4550` | `--color-pine` | Primary brand background, deep midnight evergreen |
| **Pine 2 (Medium)** | `#0F5461` | `--color-pine2` | Elevated dark surfaces, secondary hero backdrops |
| **Moss (Glacial)** | `#479FB5` | `--color-moss` / `--secondary` | Glacial blue-teal; ambient glow orbs, secondary accents, badges |
| **Moss (Dark)** | `#347E92` | `--color-mossD`, `--color-moss-d` | Hover states and deep contrast borders for moss elements |
| **Ochre (Hearth)** | `#FAA52D` | `--color-ochre` / `--accent` | Warm hearthside amber; primary CTA buttons, pulsing dots, underlines |
| **Ochre (Dark)** | `#E08E1B` | `--color-ochreD`, `--color-ochre-d` | Active / hover states for ochre buttons and links |
| **Mist** | `#8FC7D4` | `--color-mist` | High-altitude sky blue; hero eyebrows and soft secondary text |
| **Cloud (Pure)** | `#F3FAFB` | `--color-cloud` / `--background` | Main light background, crisp mountain mist white |
| **Cloud 2 (Misty)**| `#E3F0F2` | `--color-cloud2` | Secondary light surface, subtle borders, card backgrounds |
| **Ink** | `#1B2A2C` | `--color-ink` / `--foreground` | Deep charcoal ink; primary high-contrast reading text |

### 1.2 Functional Theme Tokens (Tailwind v4 / DaisyUI)

```css
:root {
  --background: oklch(0.98 0.01 190);      /* #F3FAFB Cloud */
  --foreground: oklch(0.25 0.02 200);      /* #1B2A2C Ink */
  --card: oklch(1 0 0);                    /* Pure white cards */
  --primary: oklch(0.4838 0.08 213.71);    /* Teal #126A7A */
  --secondary: oklch(0.6577 0.0895 216.78);/* Blue-Teal #479FB5 */
  --accent: oklch(0.7881 0.1584 69.51);    /* Hearth Orange #FAA52D */
  --muted: oklch(0.92 0.02 190);
  --muted-foreground: oklch(0.45 0.03 200);
  --border: oklch(0.9 0.02 190);
  --radius: 0.625rem;                      /* 10px base radius */
}

.dark {
  --background: oklch(0.22 0.02 200);
  --foreground: oklch(0.95 0.01 190);
  --card: oklch(0.25 0.02 200);
  --primary: oklch(0.4838 0.08 213.71);
  --secondary: oklch(0.6577 0.0895 216.78);
  --accent: oklch(0.7881 0.1584 69.51);
}
```

---

## 2. Typography System

The typography is built around two contrasting typefaces:
1. **`Lora` (Serif)**: Editorial, warm, authentic, evoking literary journals and mountain stories. Used for headings, editorial quotes, and numerals.
2. **`Manrope` (Sans-Serif)**: Modern, highly legible, geometric yet warm. Used for UI controls, body text, buttons, and badges.

### 2.1 Font Family Mapping

| Utility Class | Font Family | Usage |
| :--- | :--- | :--- |
| `.font-display` / `.font-lora` | `'Lora', serif` | H1–H4 headings, testimonial quotes, price numbers |
| `.font-manrope` / `.font-sans` | `'Manrope', 'Inter', sans-serif` | Body paragraphs, buttons, form inputs, metadata |
| `.font-accent` | `'Manrope', 'Inter', sans-serif` | Highlighted words inside headings, editorial captions |
| `code` | `source-code-pro, Menlo, monospace` | Technical tokens, debug information |

### 2.2 Fluid Type & Scale Standards

| Level | Size Specification | Line Height | Letter Spacing | Font Family |
| :--- | :--- | :--- | :--- | :--- |
| **Hero Title** | `clamp(2.5rem, 5.5vw, 5.5rem)` | `1.02` | `0` | `Lora` (Serif) |
| **Section Title (H2)** | `clamp(2rem, 3.5vw, 3.25rem)` | `1.12` | `-0.01em` | `Lora` (Serif) |
| **Card Title (H3)** | `1.25rem` – `1.5rem` (`text-xl`–`text-2xl`) | `1.25` | `0` | `Lora` (Serif) |
| **Hero Subtitle** | `clamp(1rem, 1.4vw, 1.25rem)` | `1.65` | `normal` | `Manrope` (Light 300) |
| **Body Large** | `1.125rem` (`text-lg`) | `1.65` | `normal` | `Manrope` (Regular 400) |
| **Body Default** | `0.9375rem` – `1rem` (`text-base`) | `1.6` | `normal` | `Manrope` (Regular 400) |
| **Body Small** | `0.875rem` (`text-sm`) | `1.5` | `normal` | `Manrope` (Regular 400) |
| **Metadata / Caption**| `0.75rem` (`text-xs`) | `1.4` | `0.02em` | `Manrope` (Medium 500) |
| **Hero Eyebrow** | `0.6875rem` (`11px`) | `1.4` | **`0.18em`** | `Manrope` (Semibold 600, Upper) |
| **Standard Eyebrow** | `0.72rem` (`11.5px`) | `1.4` | **`0.22em`** | `Manrope` (Semibold 600, Upper) |

> [!IMPORTANT]
> **Avoid Letter-Spacing Overrides on Eyebrows:** Do NOT add Tailwind's `tracking-wider` (which is `0.05em`) to an element with `.eyebrow`. The `.eyebrow` class already defines authoritative editorial letter-spacing (`0.18em` – `0.22em`). Adding `tracking-wider` reduces the tracking by more than 70%.

---

## 3. Hero Section Standard Pattern

Every public hero section must follow the standard layered architecture:

```html
<!-- ============ HERO SECTION ============ -->
<section
  class="hero-section relative bg-pine text-cloud overflow-hidden"
  style="background: url('/images/hero-himalaya.webp') center/cover no-repeat;"
>
  <!-- 1. Deep atmospheric gradient overlay -->
  <div class="absolute inset-0 bg-gradient-to-b from-black/80 via-pine/75 to-pine/95"></div>

  <!-- 2. Interactive mountain mist & stardust canvas -->
  <canvas
    id="pageHeroCanvas"
    class="absolute inset-0 w-full h-full pointer-events-none motion-reduce:hidden"
    aria-hidden="true"
  ></canvas>

  <!-- 3. Ambient glowing backdrop orbs -->
  <div class="pointer-events-none absolute -top-24 right-0 w-[42rem] h-[42rem] bg-moss/20 rounded-full blur-[130px] animate-mist-a" aria-hidden="true"></div>
  <div class="pointer-events-none absolute bottom-0 left-0 w-[34rem] h-[34rem] bg-ochre/15 rounded-full blur-[130px] animate-mist-b" aria-hidden="true"></div>

  <!-- 4. Content Container -->
  <div class="relative max-w-7xl mx-auto px-6 lg:px-10 z-10">
    <div class="max-w-4xl">
      
      <!-- Eyebrow Badge Pill -->
      <div class="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-cloud/10 border border-cloud/20 backdrop-blur-md mb-6 reveal">
        <span class="w-2 h-2 rounded-full bg-ochre animate-pulse"></span>
        <p class="eyebrow text-mist m-0">Platform Category Context</p>
      </div>

      <!-- Main Headline with Golden Animated Underline Accent -->
      <h1 class="hero-title reveal">
        Where <em class="hero-accent font-accent not-italic text-ochre">home</em> begins in the hills.
      </h1>

      <!-- Subtitle -->
      <p class="hero-subtitle max-w-2xl text-cloud/85 font-light reveal">
        Hand-picked, verified stays and family cottages nestled in the Eastern Himalayas.
      </p>

      <!-- Optional CTAs or Filter Cards -->
      ...
    </div>
  </div>

  <!-- 5. Optional Mountain Silhouette Bottom Seam -->
  <div class="absolute bottom-0 inset-x-0 pointer-events-none opacity-80">
    <svg viewBox="0 0 1440 120" class="w-full h-auto" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M0 60L180 30L360 80L540 20L720 70L900 15L1080 65L1260 35L1440 75V120H0V60Z" fill="#F3FAFB" />
    </svg>
  </div>
</section>
```

### 3.1 Key Hero Rules

1. **Section Padding**: Always use class `hero-section`. Never use hardcoded paddings like `pt-36 pb-20`.
   - `.hero-section` sets `padding-block: clamp(7.5rem, 14vw, 11rem) clamp(5rem, 9vw, 8rem);` for seamless fluid scaling from mobile to ultra-wide displays.
2. **Title Styling**: Always use class `hero-title`. It applies `Lora`, fluid clamp sizing (`2.5rem` to `5.5rem`), and ultra-tight `1.02` line-height.
3. **Accent Word**: Any keyword that needs emphasis must use:
   `<em class="hero-accent font-accent not-italic text-ochre">word</em>`
   This automatically binds the signature CSS animated growing golden underline.
4. **Eyebrow Pill**: Standard structure is an `inline-flex` container with `bg-cloud/10 border border-cloud/20 backdrop-blur-md rounded-full`, containing a pulsing amber dot (`w-2 h-2 rounded-full bg-ochre animate-pulse`) followed by `<p class="eyebrow text-mist m-0">`.
5. **Atmospheric Canvas**: Every primary hero includes drifting mountain mist and alpine stardust sparkles on a `<canvas>` initialized in `ngAfterViewInit` outside Angular Zone.
6. **Reveal Motion**: Hero elements must include the `reveal` class, which smoothly shifts from `translateY(18px)` with opacity `0` to resting state when initialized.

---

## 4. Components & Interactive Patterns

### 4.1 Buttons & CTAs

- **Primary Button (Ochre Amber)**:
  ```html
  <a class="btn-anim inline-flex items-center gap-2 bg-ochre hover:bg-ochreD text-cloud text-sm md:text-base font-semibold px-8 py-3.5 rounded-full transition-all shadow-xl shadow-ochre/25">
    <span>Book Homestay</span>
    <svg ...></svg>
  </a>
  ```
  *Class `.btn-anim` adds the subtle light-sweep shimmer effect on hover.*

- **Secondary / Glass Button**:
  ```html
  <div class="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 px-5 py-3 rounded-full text-xs md:text-sm text-cloud/90">
    <span class="w-2 h-2 rounded-full bg-moss"></span>
    <span>Zero listing fee</span>
  </div>
  ```

### 4.2 Property & Listing Cards

- **Card Container**: `.listing-card` or `.card-tilt` with `transition: transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1)`.
- **Card Image Illustration**: Wrap images in `.card-illus`. On card hover, `.card-illus img` scales up gracefully to `scale(1.06)`.
- **Host Verified Stamp**:
  ```html
  <span class="stamp stamp-pulse inline-flex items-center gap-1.5 text-cloud text-[10px] font-semibold px-3 py-1">
    HOST VERIFIED
  </span>
  ```

### 4.3 Glassmorphism Surfaces

- Floating search and filter bars use:
  `bg-white/95 dark:bg-pine/90 backdrop-blur-xl border border-white/30 dark:border-cloud/10 shadow-2xl rounded-3xl`

---

## 5. Accessibility & Motion Guidelines

1. **Reduced Motion**:
   All CSS keyframe animations (`.animate-mist-a`, `.animate-mist-b`, `.stamp-pulse`, `.hero-accent::after`, `.reveal`) automatically disable when `prefers-reduced-motion: reduce` is detected.
2. **Canvas Loops**:
   Canvas animations check `window.matchMedia('(prefers-reduced-motion: reduce)').matches` before firing requestAnimationFrame loops.
3. **Contrast Ratios**:
   - Primary text on dark pine heroes must use `text-cloud` (`#F3FAFB`) or `text-cloud/85` (minimum 7:1 contrast).
   - Eyebrows on dark pine heroes must use `text-mist` (`#8FC7D4`).
   - Text on light surfaces must use `text-ink` (`#1B2A2C`) or `text-ink/75`.
4. **Keyboard Focus**:
   All clickable anchors, buttons, and inputs must maintain a 2px amber focus ring:
   ```css
   a:focus-visible, button:focus-visible, input:focus-visible {
     outline: 2px solid #FAA52D;
     outline-offset: 3px;
   }
   ```

---

## 6. Public Page Hero Matrix & Reference Checklist

Every public route conforms to the following standardized hero configuration:

| Page | Route | Eyebrow Badge | Heading Accent | Canvas Mist ID | Ambient Orbs |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Home** | `/` | `India's first platform...` | `<em class="hero-accent">homestay</em>` | `#mistCanvas` | `animate-mist-a/b` |
| **Stays** | `/stays` | `Verified Himalayan Stays` | `<em class="hero-accent">homestays / [City]</em>` | `#staysHeroCanvas` | `motion-safe:animate-mist-a/b` |
| **Search** | `/search` | `Live Homestay Search...` | `<em class="hero-accent">the clouds</em>` | `#searchHeroCanvas` | `animate-mist-a/b` |
| **Become Host** | `/become-a-host` | `Tashihomes Host Program` | `<em class="hero-accent">hearth</em>` | `#becomeHostMistCanvas` | `animate-mist-a/b` |
| **Founding Story**| `/our-story` | `Tashihomes — Founding Story` | `<em class="hero-accent">home</em>` | `#storyMistCanvas` | `animate-mist-a/b` |
| **Experiences** | `/experiences` | `Mountain Stories & Living...` | `<em class="hero-accent">long after</em>` | `#experiencesCanvas` | `animate-mist-a/b` |
| **Locations** | `/locations` | `Himalayan Hamlets & Villages` | `<em class="hero-accent">&amp; Hamlets / [Loc]</em>` | `#locationsHeroCanvas`| `motion-safe:animate-mist-a/b` |
| **Legal** | `/legal`, `/terms` | `Tashi Homes • Legal...` | `<em class="hero-accent">Platform Terms</em>` | Static orbs | `motion-safe:animate-mist-a/b` |
