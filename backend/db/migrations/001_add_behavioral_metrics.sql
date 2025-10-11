-- Add behavioral metadata columns to entries
alter table entries
    add column if not exists entry_length integer,
    add column if not exists time_of_day text,
    add column if not exists weekday integer,
    add column if not exists response_delay_ms integer,
    add column if not exists sentiment_score double precision,
    add column if not exists embedding vector(1536);

-- Aggregated daily metrics table
create table if not exists daily_metrics (
    id uuid primary key default gen_random_uuid(),
    user_id uuid,
    date date not null,
    avg_sentiment double precision,
    top_emotion text,
    emotion_counts jsonb default '{}'::jsonb,
    message_count integer default 0,
    avg_entry_length double precision,
    time_buckets jsonb default '{}'::jsonb,
    created_at timestamptz default now(),
    unique (user_id, date)
);
Error: Failed to run sql query: {"error":"ERROR: 42704: type \"vector\" does not exist\nLINE 8: add column if not exists embedding vector(1536);\r\n ^\n","length":94,"name":"error","severity":"ERROR","code":"42704","position":"376","file":"parse_type.c","line":"270","routine":"typenameType","message":"type \"vector\" does not exist","formattedError":"ERROR: 42704: type \"vector\" does not exist\nLINE 8: add column if not exists embedding vector(1536);\r\n ^\n"}



-- Aggregated weekly metrics table
create table if not exists weekly_metrics (
    id uuid primary key default gen_random_uuid(),
    user_id uuid,
    week_start date not null,
    week_end date not null,
    avg_sentiment double precision,
    emotion_counts jsonb default '{}'::jsonb,
    message_count integer default 0,
    volatility double precision,
    corr_summary jsonb default '{}'::jsonb,
    created_at timestamptz default now(),
    unique (user_id, week_start)
);

-- AI generated weekly summary table
create table if not exists weekly_summary (
    id uuid primary key default gen_random_uuid(),
    user_id uuid,
    week_start date not null,
    week_end date not null,
    metrics jsonb not null,
    summary_md text not null,
    created_at timestamptz default now(),
    unique (user_id, week_start)
);
