# Echo

Echo is a cross-platform emotional journaling experience that pairs quick capture on mobile with deep analytics on the web. All intelligence is powered by free-tier, open-source tooling (FastAPI + Hugging Face + Supabase) to keep the stack affordable and deployable on free hosting.

See `/shared/PROMPT.md` for the full product spec, acceptance tests, and guiding prompt.

## Monorepo layout

```
/backend   # FastAPI service (Render deployment)
/web       # Next.js 14 web dashboard (Vercel deployment)
/mobile    # Expo managed app (Echo Pocket)
/shared    # Cross-platform types + prompt
```

## Quick start

1. Copy `.env.example` to `.env` (or each package's preferred env format) and fill in Supabase, SendGrid, and Google OAuth credentials.
2. Bring up the backend:
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate  # Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn main:app --reload
   ```
3. Start the web dashboard:
   ```bash
   cd web
   npm install
   npm run dev
   ```
4. Launch the Expo app:
   ```bash
   cd mobile
   npm install
   npm run start
   ```

> **Brand assets:** The landing page and navbar expect the logo and mascot images to live at `web/public/images/echo-logo.png` and `web/public/images/echo-mascot.png`. Drop your PNG/SVG files into that directory to keep the identity visuals in sync.

## Database schema

Supabase SQL lives in `backend/db/schema.sql`. It covers:
- `entries`, `summaries`, `coping_kits`
- `triggers`, `digest_prefs`, `calendar_tokens`

Use `backend/db/seed.sql` with `psql` for quick demo data:

```sql
\set user_id '<existing-auth-user-uuid>'
\i backend/db/seed.sql
```

## Deploying on free tiers

1. **Supabase** – Create the project, run the schema SQL, enable Row Level Security as needed, and capture anon + service keys.
2. **Render** – Deploy the FastAPI service with `uvicorn main:app --host 0.0.0.0 --port 10000`, add Hugging Face token (optional) and Supabase credentials as environment variables, and enable background worker if Celery is used later.
3. **Vercel** – Import `web`, set `NEXT_PUBLIC_*` env vars plus `NEXT_PUBLIC_API_BASE`.
4. **Expo** – Use Expo Go for instant previews. Set `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, and `EXPO_PUBLIC_API_BASE` in `app.config` or via `eas.json`.
5. **SendGrid** – Configure a verified sender, add `SENDGRID_API_KEY` and optional `SENDGRID_FROM_EMAIL`.

## Analytics & automation

- Journals now record `entry_length`, `time_of_day`, `weekday`, `sentiment_score`, and optional embeddings.
- Aggregated snapshots land in `daily_metrics` and `weekly_metrics`. Hit the new API endpoints:
  - `GET /analytics/daily?start=YYYY-MM-DD&end=YYYY-MM-DD`
  - `GET /analytics/weekly?start=YYYY-MM-DD&end=YYYY-MM-DD`
  - `POST /analytics/recompute?scope=daily|weekly` (rebuilds the latest window)
  - `GET /summary/weekly/latest` (AI narration generated during the Airflow run)
- Weekly summaries can use either OpenAI (`OPENAI_API_KEY`) or a local Ollama instance (`OLLAMA_URL`, `MODEL_NAME`). If both are present, OpenAI is preferred.
- Weekly summaries can use either OpenAI (`OPENAI_API_KEY`) or a local Ollama instance (`OLLAMA_URL`, `MODEL_NAME`). If both are present, OpenAI is preferred.

### Airflow weekly automation

The DAG `echo_weekly_summary_dag` computes last week’s metrics every Sunday at 23:00 Toronto time, prepares an LLM payload, generates the structured + markdown summary, and stores it in `weekly_summary`.

To run locally:

1. Copy your Supabase service key and OpenAI key into an environment file:
   ```
   cd infra/airflow
   cp .env.example .env   # create this file if it doesn't exist
   # inside .env set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY
   ```
2. Start Airflow:
   ```bash
   docker compose -f docker-compose.airflow.yml up --build
   ```
3. Visit `http://localhost:8080` (default creds `airflow` / `airflow`) and trigger `echo_weekly_summary_dag`.

The container mounts the repo at `/opt/echo`, so the DAG reuses the same `backend.services` code paths as the API.

## Testing the flow

- Capture entries from both the web (`/entries/new`) and mobile (`/journal`). Offline mobile submissions queue locally and sync once online.
- Verify instant one-liner responses, coping kit reminders, and trigger stats.
- Generate a weekly summary via `/summary?period=week` (web or backend) and send on-demand digest via `/digest/send-now`.
- Connect Google Calendar tokens through the backend (API or future UI) to surface event correlation insights.

### Additional validation

- Backend unit tests: `cd backend && python -m pytest`
- Frontend analytics: `cd web && npm ci && npm run dev` then open `http://localhost:3000/dashboard` to review the week-over-week, correlation, sentiment map, and AI summary panels.

## Scripts & tooling

- `backend/tasks/weekly_summary.py` & `weekly_email.py`: optional Celery jobs for scheduled automation.
- `shared/types.ts`: canonical data contracts reused by web and mobile.
- `web` uses `react-markdown` to safely render the AI-generated weekly summary.

## Licensing

MIT – see `LICENSE`.
