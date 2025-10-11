# Context from my IDE setup:

## My request for Codex:
You are a senior full-stack engineer. Build **Echo**, a cross-platform MVP (mobile + web) for emotional journaling with free AI emotion analysis, weekly LLM summaries, and advanced usability features.

CRITICAL:
- Stay 100% FREE-TIER. No paid APIs (no OpenAI/Anthropic).
- If you ever lose context, READ /shared/PROMPT.md (embed this prompt verbatim there) and continue.
- Use the exact stack, features, schema, endpoints, and deployment steps below.

========================================
PRODUCT VISION — One mind, two interfaces
========================================
- 📱 **Echo Pocket (Mobile / Expo RN)**: capture moments fast (voice/text), instant one-liner feedback, mini-trend, notifications.
- 💻 **Echo Studio (Web / Next.js)**: rich analytics (timeline heatmap), weekly LLM summary, triggers library, coping kit management, email digest controls.

SAME FEATURES on both (journaling, emotion analysis, summaries, insights), but optimized per device (mobile = quick; web = deep).

========================================
FREE-TIER TECH STACK (MANDATORY)
========================================
Frontend Web:
- Next.js 14 (App Router) + TypeScript + TailwindCSS + shadcn/ui + Recharts + Framer Motion
Frontend Mobile:
- React Native (Expo managed) + TypeScript + Expo Notifications + react-native-svg + victory-native (or react-native-svg-charts)
Backend:
- FastAPI (Python) + Uvicorn + Pydantic
Background (optional):
- Celery + Redis (Render free tier). If too heavy, expose on-demand summary endpoint instead.
AI (free, open source):
- Hugging Face transformers pipelines:
  - Emotion: "j-hartmann/emotion-english-distilroberta-base"
  - Summarization: "facebook/bart-large-cnn" or "t5-base"
  - Cache model objects at process start to avoid reloading.
- If Render memory/cold starts are rough, allow Hugging Face Inference API with FREE token only.
Data/Auth/Storage:
- Supabase (free tier): Postgres + Auth + Storage (optional audio)
Deploy:
- Web → Vercel (free)
- Backend → Render (free)
- Mobile → Expo (Expo Go / free EAS)
- DB/Auth → Supabase (free)

========================================
MONOREPO STRUCTURE
========================================
/echo/
 ├─ /backend/
 │   ├─ main.py
 │   ├─ routes/
 │   │   ├─ entries.py        # CRUD entries
 │   │   ├─ analyze.py        # emotion analysis
 │   │   ├─ summary.py        # weekly LLM summary
 │   │   ├─ insights.py       # aggregates (trend, dist, keywords)
 │   │   └─ calendar.py       # Context Bridge (read-only correlation)
 │   ├─ services/
 │   │   ├─ emotion_analysis.py
 │   │   ├─ summarizer.py
 │   │   ├─ insights.py
 │   │   ├─ coping.py         # one-liners, coping prompts
 │   │   ├─ triggers.py       # trigger detection & stats
 │   │   └─ auth.py           # Supabase JWT verify
 │   ├─ db/
 │   │   ├─ supabase.py
 │   │   └─ queries.py
 │   ├─ tasks/
 │   │   ├─ weekly_summary.py # Celery job (optional)
 │   │   └─ weekly_email.py   # email digest via free SendGrid
 │   ├─ requirements.txt
 │   └─ README.md
 ├─ /web/                     # Next.js web app
 │   ├─ app/
 │   │   ├─ page.tsx                # landing
 │   │   ├─ login/page.tsx
 │   │   ├─ dashboard/page.tsx      # charts, summary, heatmap
 │   │   ├─ entries/new/page.tsx    # journaling page
 │   │   ├─ entries/[id]/page.tsx
 │   │   └─ settings/page.tsx       # digest toggle, calendar connect
 │   ├─ components/                 # EmotionTrendChart, EmotionDist, EmotionCloud, Heatmap, WeeklySummaryCard, TriggersPanel, CopingKitCard
 │   ├─ lib/                        # supabase client, api helpers
 │   ├─ styles/
 │   ├─ package.json
 │   └─ README.md
 ├─ /mobile/                  # Expo RN app
 │   ├─ app/
 │   │   ├─ index.tsx        # Home: quick mood + last feedback + mini-trend
 │   │   ├─ journal.tsx      # text/voice entry, emotion tags, one-liner
 │   │   ├─ insights.tsx     # mini trend & distribution
 │   │   └─ settings.tsx     # notifications, digest toggle
 │   ├─ src/
 │   │   ├─ api.ts           # backend calls
 │   │   ├─ supabase.ts
 │   │   └─ notifications.ts
 │   ├─ package.json
 │   └─ README.md
 ├─ /shared/
 │   ├─ types.ts
 │   └─ PROMPT.md            # EMBED THIS ENTIRE PROMPT VERBATIM
 ├─ .env.example
 ├─ README.md
 └─ LICENSE (MIT)

Add a PROMPT constant in backend/main.py, web/app/page.tsx, mobile/app/index.tsx with a short summary + note: “Read /shared/PROMPT.md if lost.”

========================================
DATA MODEL (Supabase)
========================================
Tables (SQL):
- entries
  - id uuid PK
  - user_id uuid FK -> auth.users
  - text text
  - emotion_json jsonb         # [{label, score}], plus derived top label on read
  - created_at timestamptz default now()
  - source text                # "mobile" | "web"
  - tags text[]                # user-selected emotion chips
- summaries
  - id uuid PK
  - user_id uuid
  - week_start date
  - summary_text text
  - created_at timestamptz default now()
- coping_kits
  - id uuid PK
  - user_id uuid
  - actions text[]             # up to 3 pinned actions
- triggers
  - id uuid PK
  - user_id uuid
  - name text                  # normalized label, e.g. "Work pressure"
  - words text[]               # ["deadline","presentation","review"]
  - created_at timestamptz default now()
- digest_prefs
  - user_id uuid PK
  - weekly_email_enabled boolean default true
- calendar_tokens (for Context Bridge; store minimal)
  - user_id uuid PK
  - provider text              # "google"
  - access_token text          # encrypted at rest OR use Supabase Vault
  - refresh_token text         # encrypted
  - created_at timestamptz default now()

Indexes: entries(user_id, created_at desc), summaries(user_id, week_start desc), triggers(user_id).

========================================
FEATURES YOU MUST IMPLEMENT
========================================
(1) Instant One-Liner Feedback (mobile & web):
- After POST /entries or POST /analyze, return a short supportive sentence.
- Implement template-based logic in services/coping.py using top emotion + triggers:
  Example: “You mentioned *work* again. Try a 5-min reset before meetings.”

(2) Emotion-Tag Shortcuts:
- Show 5–7 chips under input: ["Calm","Anxious","Proud","Drained","Grateful","Frustrated","Focused"].
- Save to entries.tags. Use tags to refine one-liners and insights.

(3) Timeline Heatmap (web):
- Calendar-like heatmap (GitHub style) colored by dominant emotion per day.
- Source: GET /insights/summary?days=180 provides aggregated per-day dominant emotion.

(4) Personal Coping Kit:
- Users select up to 3 micro-actions (e.g., "2-min breathe", "Quick walk", "Text a friend").
- Store in coping_kits.actions. Show top action after negative entries (mobile toast/card).

(5) Triggers Library:
- Auto-detect recurring words in entries (services/triggers.py).
- Users can rename bundles into plain-English triggers (e.g., “Work pressure”).
- Show a TriggersPanel with stats: “When ‘Work pressure’ appears, anxiety ↑ 32%”.
- Use simple TF/IDF or word freq + stopword removal; keep it free and local.

(6) Weekly Email Digest (free):
- Use free SendGrid tier (or Supabase email if available).
- Weekly job (Celery or on-demand) sends: sparkline, 2 bullets, coping suggestion, link to dashboard.
- Add digest_prefs.weekly_email_enabled toggle in Settings (web & mobile).

(+) Context Bridge (Calendar Read-only):
- OAuth connect Google Calendar (free OAuth). Store tokens securely (or let backend fetch via user-provided token at runtime).
- /calendar/events?from=...&to=... returns user’s events (titles/time only).
- Insights service correlates entries near events (±24h) to surface: “Stress rises day before presentations.”
- Strictly read-only. No write operations.

========================================
BACKEND API — EXACT CONTRACTS
========================================
Auth: Supabase JWT in Authorization: Bearer <token>. Verify in services/auth.py.

POST /entries
  body: { text: string, source?: "mobile"|"web", tags?: string[] }
  flow: insert entry → run emotion_analysis(text) → update emotion_json → compute one_liner (services/coping.py, consider tags and triggers) → return {entry, one_liner}

GET /entries?limit=100&offset=0
  returns user’s entries sorted by created_at desc

GET /entries/:id
  returns one entry

POST /analyze
  body: { text: string }
  returns: { emotions: [{label, score}], top: {label, score}, one_liner: string }

GET /insights/summary?days=7
  returns:
  {
    top_emotions: [{label, pct}],
    trend: [{date, joy, sadness, anger, fear, neutral, ...}],
    keywords: [{word, count}],
    heatmap: [{date, dominant_label}]
  }

GET /summary?period=week
  → Summarize last 7 days (bart-large-cnn or t5-base) → store in summaries
  returns { summary_text, week_start }

POST /coping/kit
  body: { actions: string[] } (max 3)
  returns saved kit

GET /coping/kit
  returns { actions: string[] }

GET /triggers
  returns [{ id, name, words, stats: {count, correlation:{emotion:pct_delta}} }]

POST /triggers
  body: { name: string, words: string[] }
  create or update trigger bundle

GET /calendar/events?from=YYYY-MM-DD&to=YYYY-MM-DD
  returns [{ id, title, start, end }]

POST /digest/send-now
  sends digest email now; returns { ok: true }

========================================
FRONTEND — WEB (Next.js)
========================================
Pages:
- /            → Landing: “Understand your emotions like data.”
- /login       → Supabase Auth
- /dashboard   → WeeklySummaryCard, EmotionTrendChart, EmotionDist (pie/bar), Heatmap (dominant emotion by day), TriggersPanel, CopingKitCard
- /entries/new → text input + tag chips + (optional) voice (browser SR). On submit, show one-liner inline.
- /entries/[id] → details
- /settings    → email digest toggle, (optional) connect calendar, manage coping kit

UI:
- Tailwind + shadcn/ui; responsive; use Framer Motion for subtle fades.
- Recharts for trend & distribution; a simple heatmap component for calendar.

========================================
FRONTEND — MOBILE (Expo)
========================================
Screens:
- Home: last 3 entries, last summary snippet, “How are you feeling?” prompt.
- Journal: text input, tag chips, mic record; on submit → show one-liner card.
- Insights: mini trend + mini dist; link to full web dashboard.
- Settings: daily notification toggle, weekly digest toggle.

Notifications:
- Expo Notifications free; schedule daily 8pm local.

Offline:
- If offline, store entry in AsyncStorage and sync later.

========================================
ENV VARS (.env.example)
========================================
# Web
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_BASE=https://<render-backend-url>

# Mobile
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_API_BASE=https://<render-backend-url>

# Backend
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SENDGRID_API_KEY=             # free tier for weekly digest
HUGGINGFACE_API_TOKEN=        # optional if using hosted inference
REDIS_URL=                    # optional for Celery
GOOGLE_OAUTH_CLIENT_ID=       # for Context Bridge
GOOGLE_OAUTH_CLIENT_SECRET=

========================================
DEPLOYMENT (FREE)
========================================
1) Supabase: create project; run SQL for tables; set anon & service keys.
2) Backend (Render): Python web service; startup: `uvicorn main:app --host 0.0.0.0 --port 10000`. Cache models on startup.
3) Web (Vercel): import /web; set env; connect to backend.
4) Mobile (Expo): `npx expo start`; share QR via Expo Go; optional free EAS build.
5) Email (SendGrid): free tier; verified sender; wire weekly job or on-demand route.

========================================
EMBED PROMPT IN REPO
========================================
- Save this entire text to /shared/PROMPT.md.
- Add PROMPT constants in:
  - /backend/main.py
  - /web/app/page.tsx
  - /mobile/app/index.tsx
  Each should say: “Echo: cross-platform emotional journaling w/ one-liners, tags, heatmap, coping kit, triggers, weekly digest, calendar context. Free-tier stack. See /shared/PROMPT.md.”

========================================
QUALITY BAR — ACCEPTANCE CHECKS
========================================
- Create 3 entries (mobile + web). Entries sync bi-directionally via Supabase.
- After submit, user sees instant one-liner feedback.
- Web dashboard shows trend, distribution, heatmap, triggers panel, coping kit.
- Weekly summary works (on-demand endpoint OK for MVP).
- Weekly email digest sends for opted-in users (free SendGrid).
- Calendar connect fetches read-only events; insights mention correlations.
- No paid APIs; only free-tier services used.

========================================
BUILD ORDER (DO THIS NOW)
========================================
1) Scaffold monorepo + /shared/PROMPT.md (copy this entire prompt).
2) Backend: Supabase auth verify, entries/analyze/summary/insights routes; services for emotion, summary, coping, triggers; requirements.txt.
3) SQL for tables; seed script.
4) Web: Next.js scaffold; Supabase Auth; dashboard components; entries/new with tag chips & one-liner.
5) Mobile: Expo scaffold; journaling with tag chips & one-liner; mini insights; notifications.
6) Optional: digest route + SendGrid; calendar connect (read-only).
7) README.md: free deployment steps & screenshots.

Begin with step 1 now. If uncertain, re-open /shared/PROMPT.md and continue.
