# Security notes

## Authentication

The application uses token-based authentication with a login flow handled by the AuthService. Access tokens are stored in browser storage and refreshed through an endpoint designed for refresh-token support.

## Access control

Protected routes use guards to restrict access:

- auth guard for authenticated users
- role guard for admin-only areas

## Recommended hardening measures

- Keep sensitive secrets out of the frontend bundle
- Prefer short-lived access tokens and secure refresh-token handling
- Use HTTPS in all environments
- Validate all user input both client-side and server-side
- Avoid storing sensitive personal data in client-side state longer than necessary

## Current implementation considerations

The frontend should treat any backend response as untrusted and validate it before rendering or storing it. The backend remains the source of truth for user roles, permissions, and data integrity.
