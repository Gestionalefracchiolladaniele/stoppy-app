-- ═══════════════════════════════════════════════════════════════
-- NOIT — Supabase schema (run this in Supabase SQL Editor)
-- ═══════════════════════════════════════════════════════════════

-- ─── USERS ──────────────────────────────────────────────────────
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  avatar_url text,
  bio text,
  role text default 'user',
  role_completed boolean default false,
  subscription_status text default 'free' check (subscription_status in ('free', 'plus', 'pro')),
  premium_expires_at timestamptz,
  notifications_enabled boolean default true,
  check_in_time text,
  birth_year int,
  craving_time text check (craving_time in ('morning', 'afternoon', 'evening')),
  topics text[] default '{}',
  disclaimer_accepted boolean default false,
  created_at timestamptz default now()
);

-- Add columns if table already exists (idempotent)
alter table public.users add column if not exists craving_time text;
alter table public.users add column if not exists topics text[] default '{}';
alter table public.users add column if not exists disclaimer_accepted boolean default false;
alter table public.users add column if not exists birth_year int;
alter table public.users add column if not exists subscription_status text default 'free';
alter table public.users add column if not exists premium_expires_at timestamptz;
alter table public.users add column if not exists notifications_enabled boolean default true;
alter table public.users add column if not exists check_in_time text;
alter table public.users add column if not exists role_completed boolean default false;

alter table public.users enable row level security;

drop policy if exists "users_select_own" on public.users;
create policy "users_select_own" on public.users
  for select using (auth.uid() = id);

drop policy if exists "users_insert_own" on public.users;
create policy "users_insert_own" on public.users
  for insert with check (auth.uid() = id);

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own" on public.users
  for update using (auth.uid() = id);

-- ─── SESSIONS ───────────────────────────────────────────────────
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  food text,
  mode text not null check (mode in ('feed', 'breathe')),
  duration int default 0,
  mood_before int check (mood_before between 1 and 5),
  mood_after int check (mood_after between 1 and 5),
  recap_text text default '',
  messages jsonb default '[]',
  context jsonb default '{}',
  created_at timestamptz default now()
);

alter table public.sessions enable row level security;

drop policy if exists "sessions_select_own" on public.sessions;
create policy "sessions_select_own" on public.sessions
  for select using (auth.uid() = user_id);

drop policy if exists "sessions_insert_own" on public.sessions;
create policy "sessions_insert_own" on public.sessions
  for insert with check (auth.uid() = user_id);

drop policy if exists "sessions_update_own" on public.sessions;
create policy "sessions_update_own" on public.sessions
  for update using (auth.uid() = user_id);

drop policy if exists "sessions_delete_own" on public.sessions;
create policy "sessions_delete_own" on public.sessions
  for delete using (auth.uid() = user_id);

-- ─── DAILY MOODS ────────────────────────────────────────────────
create table if not exists public.daily_moods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  date date not null,
  mood int not null check (mood between 1 and 5),
  created_at timestamptz default now(),
  unique (user_id, date)
);

alter table public.daily_moods enable row level security;

drop policy if exists "moods_select_own" on public.daily_moods;
create policy "moods_select_own" on public.daily_moods
  for select using (auth.uid() = user_id);

drop policy if exists "moods_insert_own" on public.daily_moods;
create policy "moods_insert_own" on public.daily_moods
  for insert with check (auth.uid() = user_id);

drop policy if exists "moods_update_own" on public.daily_moods;
create policy "moods_update_own" on public.daily_moods
  for update using (auth.uid() = user_id);

-- ─── NOTIFICATIONS ──────────────────────────────────────────────
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null check (type in ('session_reminder', 'daily_check_in', 'streak_milestone')),
  title text not null,
  message text not null,
  read boolean default false,
  created_at timestamptz default now()
);

alter table public.notifications enable row level security;

drop policy if exists "notif_select_own" on public.notifications;
create policy "notif_select_own" on public.notifications
  for select using (auth.uid() = user_id);

drop policy if exists "notif_insert_own" on public.notifications;
create policy "notif_insert_own" on public.notifications
  for insert with check (auth.uid() = user_id);

drop policy if exists "notif_update_own" on public.notifications;
create policy "notif_update_own" on public.notifications
  for update using (auth.uid() = user_id);

-- ─── INDEXES ────────────────────────────────────────────────────
create index if not exists sessions_user_created on public.sessions(user_id, created_at desc);
create index if not exists moods_user_date on public.daily_moods(user_id, date desc);
create index if not exists notif_user_read on public.notifications(user_id, read, created_at desc);

-- ─── AUTO-CREATE users ROW ON SIGNUP ────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, name, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
