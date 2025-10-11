create table if not exists user_profiles (
    user_id uuid primary key references auth.users (id) on delete cascade,
    full_name text not null,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);
