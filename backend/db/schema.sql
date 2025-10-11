-- Echo Supabase schema
create table if not exists entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  text text not null,
  emotion_json jsonb default '[]'::jsonb,
  ai_response text,
  created_at timestamptz not null default now(),
  source text check (source in ('mobile', 'web')),
  tags text[] default '{}'::text[]
);

create index if not exists entries_user_created_idx on entries (user_id, created_at desc);

create table if not exists summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null,
  summary_text text not null,
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);

create index if not exists summaries_user_week_idx on summaries (user_id, week_start desc);

create table if not exists coping_kits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  actions text[] default '{}'::text[],
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists triggers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  words text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists triggers_user_idx on triggers (user_id);

create table if not exists digest_prefs (
  user_id uuid primary key references auth.users (id) on delete cascade,
  weekly_email_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists calendar_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  provider text not null,
  access_token text not null,
  refresh_token text,
  created_at timestamptz not null default now()
);
