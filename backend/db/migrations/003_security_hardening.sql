-- Security hardening for user-owned tables and indexes.

-- Entries
alter table if exists public.entries enable row level security;
alter table if exists public.entries force row level security;

do $$
begin
    if not exists (
        select 1
        from pg_policies
        where schemaname = 'public' and tablename = 'entries' and polname = 'entries_owner_select'
    ) then
        execute $policy$
            create policy "entries_owner_select"
                on public.entries
                for select
                using (
                    auth.uid() = user_id
                    or coalesce(auth.jwt() ->> 'role', '') = 'admin'
                );
        $policy$;
    end if;

    if not exists (
        select 1
        from pg_policies
        where schemaname = 'public' and tablename = 'entries' and polname = 'entries_owner_write'
    ) then
        execute $policy$
            create policy "entries_owner_write"
                on public.entries
                for all
                using (
                    auth.uid() = user_id
                    or coalesce(auth.jwt() ->> 'role', '') = 'admin'
                )
                with check (
                    auth.uid() = user_id
                    or coalesce(auth.jwt() ->> 'role', '') = 'admin'
                );
        $policy$;
    end if;
end
$$;

create index if not exists idx_entries_user_created_at on public.entries (user_id, created_at desc);

-- Daily metrics
alter table if exists public.daily_metrics enable row level security;
alter table if exists public.daily_metrics force row level security;

do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'public' and tablename = 'daily_metrics' and polname = 'daily_metrics_owner'
    ) then
        execute $policy$
            create policy "daily_metrics_owner"
                on public.daily_metrics
                for all
                using (
                    auth.uid() = user_id
                    or coalesce(auth.jwt() ->> 'role', '') = 'admin'
                )
                with check (
                    auth.uid() = user_id
                    or coalesce(auth.jwt() ->> 'role', '') = 'admin'
                );
        $policy$;
    end if;
end
$$;

create index if not exists idx_daily_metrics_user_date on public.daily_metrics (user_id, date);

-- Weekly metrics
alter table if exists public.weekly_metrics enable row level security;
alter table if exists public.weekly_metrics force row level security;

do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'public' and tablename = 'weekly_metrics' and polname = 'weekly_metrics_owner'
    ) then
        execute $policy$
            create policy "weekly_metrics_owner"
                on public.weekly_metrics
                for all
                using (
                    auth.uid() = user_id
                    or coalesce(auth.jwt() ->> 'role', '') = 'admin'
                )
                with check (
                    auth.uid() = user_id
                    or coalesce(auth.jwt() ->> 'role', '') = 'admin'
                );
        $policy$;
    end if;
end
$$;

create index if not exists idx_weekly_metrics_user_week on public.weekly_metrics (user_id, week_start);

-- Weekly summary
alter table if exists public.weekly_summary enable row level security;
alter table if exists public.weekly_summary force row level security;

do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'public' and tablename = 'weekly_summary' and polname = 'weekly_summary_owner'
    ) then
        execute $policy$
            create policy "weekly_summary_owner"
                on public.weekly_summary
                for all
                using (
                    auth.uid() = user_id
                    or coalesce(auth.jwt() ->> 'role', '') = 'admin'
                )
                with check (
                    auth.uid() = user_id
                    or coalesce(auth.jwt() ->> 'role', '') = 'admin'
                );
        $policy$;
    end if;
end
$$;

create index if not exists idx_weekly_summary_user_week on public.weekly_summary (user_id, week_start);

-- User profiles
alter table if exists public.user_profiles enable row level security;
alter table if exists public.user_profiles force row level security;

do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'public' and tablename = 'user_profiles' and polname = 'user_profiles_owner'
    ) then
        execute $policy$
            create policy "user_profiles_owner"
                on public.user_profiles
                for all
                using (
                    auth.uid() = user_id
                    or coalesce(auth.jwt() ->> 'role', '') = 'admin'
                )
                with check (
                    auth.uid() = user_id
                    or coalesce(auth.jwt() ->> 'role', '') = 'admin'
                );
        $policy$;
    end if;
end
$$;

-- Coping kits
alter table if exists public.coping_kits enable row level security;
alter table if exists public.coping_kits force row level security;

do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'public' and tablename = 'coping_kits' and polname = 'coping_kits_owner'
    ) then
        execute $policy$
            create policy "coping_kits_owner"
                on public.coping_kits
                for all
                using (
                    auth.uid() = user_id
                    or coalesce(auth.jwt() ->> 'role', '') = 'admin'
                )
                with check (
                    auth.uid() = user_id
                    or coalesce(auth.jwt() ->> 'role', '') = 'admin'
                );
        $policy$;
    end if;
end
$$;

-- Triggers
alter table if exists public.triggers enable row level security;
alter table if exists public.triggers force row level security;

do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'public' and tablename = 'triggers' and polname = 'triggers_owner'
    ) then
        execute $policy$
            create policy "triggers_owner"
                on public.triggers
                for all
                using (
                    auth.uid() = user_id
                    or coalesce(auth.jwt() ->> 'role', '') = 'admin'
                )
                with check (
                    auth.uid() = user_id
                    or coalesce(auth.jwt() ->> 'role', '') = 'admin'
                );
        $policy$;
    end if;
end
$$;

-- Digest preferences
alter table if exists public.digest_prefs enable row level security;
alter table if exists public.digest_prefs force row level security;

do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'public' and tablename = 'digest_prefs' and polname = 'digest_prefs_owner'
    ) then
        execute $policy$
            create policy "digest_prefs_owner"
                on public.digest_prefs
                for all
                using (
                    auth.uid() = user_id
                    or coalesce(auth.jwt() ->> 'role', '') = 'admin'
                )
                with check (
                    auth.uid() = user_id
                    or coalesce(auth.jwt() ->> 'role', '') = 'admin'
                );
        $policy$;
    end if;
end
$$;

-- Calendar tokens
alter table if exists public.calendar_tokens enable row level security;
alter table if exists public.calendar_tokens force row level security;

do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'public' and tablename = 'calendar_tokens' and polname = 'calendar_tokens_owner'
    ) then
        execute $policy$
            create policy "calendar_tokens_owner"
                on public.calendar_tokens
                for all
                using (
                    auth.uid() = user_id
                    or coalesce(auth.jwt() ->> 'role', '') = 'admin'
                )
                with check (
                    auth.uid() = user_id
                    or coalesce(auth.jwt() ->> 'role', '') = 'admin'
                );
        $policy$;
    end if;
end
$$;

-- Summaries (legacy table used for insights digests)
alter table if exists public.summaries enable row level security;
alter table if exists public.summaries force row level security;

do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'public' and tablename = 'summaries' and polname = 'summaries_owner'
    ) then
        execute $policy$
            create policy "summaries_owner"
                on public.summaries
                for all
                using (
                    auth.uid() = user_id
                    or coalesce(auth.jwt() ->> 'role', '') = 'admin'
                )
                with check (
                    auth.uid() = user_id
                    or coalesce(auth.jwt() ->> 'role', '') = 'admin'
                );
        $policy$;
    end if;
end
$$;
