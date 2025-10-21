# SECURITY_FIX_REPORT

## What was changed
- Reworked the Next.js authentication bridge to trade Supabase browser sessions for secure `HttpOnly` cookies, enforce SameSite=Strict, and add a CSRF service that double-submits tokens for all mutating requests.
- Hardened the FastAPI backend with structured JSON logs, custom security headers middleware, Sentry integration, and dedicated `/healthz` and `/readyz` probes backed by Supabase connectivity checks. Added coverage for rate limiting and CSRF validation plus the new platform endpoints.
- Formalised Supabase storage governance by shipping a CLI-friendly migration for the `journal-assets` bucket and introducing a storage helper that scopes objects to the owner. Tests cover allowed owner access and forbidden cross-user access.

## Why it matters
- HttpOnly cookies plus CSRF tokens close the CWE-922 gap (leaked tokens) and CWE-352 risk (cross-site request forgery) while maintaining Supabase session parity across SSR and SPA entry points.
- Observability upgrades reduce mean time to detect: Sentry captures trace + error data, JSON logs expose request IDs/durations, and the health probes allow Render (and external monitors) to detect Supabase outages quickly.
- Explicit migrations and ownership-aware storage helpers ensure private journaling assets cannot be enumerated by other tenants, satisfying the RLS guidance from the security audit.

## How to validate in deployment
1. **Frontend / Auth**
   - Run `npm test` inside `web/` (Vitest) and `npm run lint` for sanity.
   - In staging, exhaustively test login/logout: verify `echo_session`, `echo_refresh`, and `csrf_token` cookies are `HttpOnly`, `Secure` (in prod), and `SameSite=Strict`. Attempt a POST without `X-CSRF-Token` and confirm a 403.
2. **Backend / Observability**
   - Run `backend/.venv/Scripts/python.exe -m pytest backend/tests`.
   - Deploy with `SENTRY_DSN` populated; confirm an intentional error (e.g., hitting `/profile` without auth) shows up in Sentry and triggers the “error rate > 2%” rule.
   - Configure Render health checks to poll `/readyz` (5s timeout) and `/healthz` (optional liveness). Verify JSON logs include `request.completed` entries with `request_id` and `duration_ms`.
3. **Supabase Storage**
   - Apply migrations with `supabase db push` (or include the new migration in your pipeline) to ensure the `journal-assets` bucket and `journal_assets_owner_access` policy exist.
   - Using `JournalAssetStorage` helpers or via Supabase SQL, upload an object as a user and confirm another user receives a 403 when downloading the same key.
   - Keep `RATE_LIMIT_*` values in sync with Render secrets; rotate if Supabase CLI detected drift via `supabase db diff`.
