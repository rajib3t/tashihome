# TashHome App

TashHome App is an Angular 22 web application for a homestay business with a public-facing experience and an authenticated admin area. The current implementation includes public pages, login, role-based admin routing, country management, settings, and shared UI components.

## Overview

- Public site for visitors and authentication entry points
- Admin dashboard protected by authentication and role-based guards
- API-driven services for auth, settings, countries, and users
- SSR-ready Angular setup with server-side rendering support

## Tech stack

- Angular 22
- TypeScript
- RxJS
- Angular Router
- Tailwind CSS + DaisyUI
- Vitest for unit tests

## Getting started

1. Install dependencies
   ```bash
   bun install
   ```
2. Generate environment files if needed
   ```bash
   bun run sync:env
   ```
3. Start the development server
   ```bash
   bun run start
   ```
4. Open the app at http://localhost:4200/

## Useful commands

```bash
bun run build
bun run test
bun run sync:env
```

## Project documentation

- [structure.md](structure.md)
- [phases.md](phases.md)
- [security.md](security.md)
