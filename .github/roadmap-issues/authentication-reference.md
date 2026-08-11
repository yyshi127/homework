## Background

The current application binds the API to `127.0.0.1` and uses a single-family data model, but it does not include built-in authentication. The documentation warns against exposing it directly to the public Internet.

## Goal

Provide a reviewed reference configuration for protecting a self-hosted instance with an authentication-aware reverse proxy while preserving local-only development.

## Acceptance criteria

- Document the trust boundary and expected request flow.
- Include one complete, vendor-neutral reverse-proxy example that fails closed.
- Cover TLS, session lifetime, logout, and protection of every `/api/` route.
- Explain how server-sent state events remain authenticated.
- Add a verification checklist for anonymous and authenticated requests.
- Do not add real credentials, production addresses, or family data.

This issue does not introduce multi-family tenancy. Tenant isolation requires a separate design.
