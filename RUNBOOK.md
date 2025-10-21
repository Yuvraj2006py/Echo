# Echo Production Runbook\n\n## 1. Service Overview\n- **Backend**: FastAPI app served by Uvicorn (Docker image echo-backend).\n- **Data**: Supabase Postgres + Storage. RLS enforced; admin role determined by JWT ole claim.\n- **Auth**: Supabase JWT verified server-side (ackend/services/auth.py). Tokens should be issued as HttpOnly cookies (pending frontend change).\n\n## 2. Start / Stop Procedures\n### Local / Ad-hoc\n`ash\ndocker build -f backend/Dockerfile -t echo-backend:latest .\ndocker run --rm -p 8000:8000 --env-file backend/.env echo-backend:latest\n`\nStop with Ctrl+C or docker stop <container>.

### Render / PaaS
- Configure environment variables listed below.
- Health endpoint: GET /healthz (liveness), GET /readyz (readiness + Supabase check).
- Deploy pipeline builds Docker image and runs migrations before switching traffic.

## 3. Required Environment Variables
Defined and validated in ackend/core/settings.py.
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY (server-side only)
- SUPABASE_JWT_SECRET
- SENTRY_DSN (optional, enables Sentry integration when set)
- ALLOWED_ORIGINS
- TRUSTED_HOSTS
- CSRF_COOKIE_NAME / CSRF_HEADER_NAME (keep defaults unless multiple apps coexist)
- Optional: SUPABASE_JWT_AUDIENCE, REQUEST_BODY_LIMIT_BYTES, RATE_LIMIT_*, CONTENT_SECURITY_POLICY

## 4. Database Migrations
`ash
supabase db push  # or psql -f backend/db/migrations/003_security_hardening.sql
`
Run migrations before promoting a release. Confirm RLS policies via select * from pg_policies where schemaname='public';.

## 5. Deployment Workflow
1. CI runs (.github/workflows/ci.yml) on PR and main: lint, type check, pytest, bandit, pip-audit, Semgrep, Trivy.
2. On main merge, build and push Docker image, apply migrations, run smoke tests:
   - curl -sf /readyz
   - pytest smoke suite (to be extended with API/E2E tests).
3. Promote to production only if readiness and smoke tests succeed.

## 6. Rollback Procedure
1. Redeploy previous Docker image tag.
2. If migration introduced breaking schema, run compensating down migration (ensure Supabase backups enabled before deploy).
3. Verify /healthz and key API endpoints with smoke tests.

## 7. Key & Secret Rotation
- Rotate SUPABASE_SERVICE_ROLE_KEY and SUPABASE_JWT_SECRET via Supabase dashboard.
- Update Render/secret manager and restart service to refresh ackend/core/settings cache.
- For SendGrid, rotate SENDGRID_API_KEY and redeploy.

## 8. Monitoring & Alerting
- Logs are structured JSON with request IDs and duration metrics; forward container stdout to log aggregation (Datadog, ELK) and index `request_id`.
- Health probes: poll `/healthz` for liveness and `/readyz` for readiness (Supabase connectivity) at 30s intervals. Render health checks should target `/readyz` with a 5s timeout.
- Error monitoring: Set `SENTRY_DSN` and `ENVIRONMENT` in Render. The backend auto-initialises Sentry with FastAPI integration and trace sampling at 1.0.
- Alert rules:
  1. **Sentry issue alert** – Project → Alerts → Create "Error rate > 2%" rule with filter `event.type:error` and environment `production`. Notify on-call Slack/email.
  2. **Performance alert** – Create metric alert on `transaction.duration` with threshold 1s (95th percentile) scoped to key endpoints (`/entries`, `/profile`). Hook to same notification channel.
  3. **Render health alert** – Enable deploy health notifications so any failed `/readyz` check or crash triggers PagerDuty/Slack.
- For additional tracing, the Sentry SDK can forward to OTLP by configuring `SENTRY_TRACES_SAMPLE_RATE` and `SENTRY_TRACE_PROFILING`.

## 9. Incident Response
1. **High error rate (5xx / 429)**: Check logs filtered by equest_id. Verify SlowAPI limits (RATE_LIMIT_*) and adjust cautiously.
2. **Supabase outage**: /readyz returns 503. Fail open? Service returns 5xx. Engage Supabase status; consider queueing writes.
3. **Credential leak**: Revoke keys (Supabase + SendGrid), rotate secrets, invalidate sessions by updating JWT secret.
4. **Suspected abuse**: Inspect logs for offending IP (from request log client). Increase rate limit strictness or block via WAF.

## 10. Backup & Restore
- Supabase automatically snapshots DB; confirm retention policy.
- For manual restore: create new branch DB from snapshot, confirm tables / RLS, then swap connection strings after validation.

## 11. Contact Points
- Engineering on-call (TBD)
- Security on-call (TBD)
- Supabase support: https://supabase.com/contact
- SendGrid support: https://support.sendgrid.com

