-- ═══════════════════════════════════════════════════════════════
-- FASE 3 — Notifications, account deletion, push tokens,
--         editable reminder presets, session indexes for analytics
-- Run this in Supabase SQL Editor (after the base schema.sql)
-- All statements are idempotent.
-- ═══════════════════════════════════════════════════════════════

-- ─── USERS: push_token (Expo) + custom reminder presets ─────────
alter table public.users
  add column if not exists push_token text;

-- Persists the user's 3 editable reminder times (morning / afternoon / evening).
-- Shape: { "morning": "09:00", "afternoon": "14:00", "evening": "21:00" }
alter table public.users
  add column if not exists reminder_presets jsonb
    default '{"morning":"09:00","afternoon":"14:00","evening":"21:00"}'::jsonb;

-- ─── NOTIFICATIONS: data jsonb payload + DELETE policy ──────────
alter table public.notifications
  add column if not exists data jsonb default '{}'::jsonb;

-- Allow users to delete their own notifications (long-press dismiss + GDPR wipe)
drop policy if exists "notif_delete_own" on public.notifications;
create policy "notif_delete_own" on public.notifications
  for delete using (auth.uid() = user_id);

-- ─── DAILY MOODS: DELETE policy (missing in base schema) ────────
drop policy if exists "moods_delete_own" on public.daily_moods;
create policy "moods_delete_own" on public.daily_moods
  for delete using (auth.uid() = user_id);

-- ─── USERS: allow user to delete own profile row ────────────────
-- Self-service account deletion. Cascade wipes sessions/moods/notifications.
-- (auth.users row remains — full auth deletion needs the Edge Function below.)
drop policy if exists "users_delete_own" on public.users;
create policy "users_delete_own" on public.users
  for delete using (auth.uid() = id);

-- ─── INDEXES for analytics queries ──────────────────────────────
-- Insights screen filters sessions by user + created_at range frequently.
create index if not exists sessions_user_created on public.sessions(user_id, created_at desc);
-- mode filter for ModeTabs (All / Feed / Breathe)
create index if not exists sessions_user_mode_created on public.sessions(user_id, mode, created_at desc);
-- mood deltas / before-vs-after stats
create index if not exists sessions_user_mood_after on public.sessions(user_id, mood_after);

-- ─── Optional: Edge Function placeholder for full auth deletion ──
-- (Run this manually only in production: requires service_role key)
--
-- create or replace function public.delete_own_auth_user()
-- returns void
-- language plpgsql
-- security definer
-- set search_path = public, auth
-- as $$
-- begin
--   delete from auth.users where id = auth.uid();
-- end;
-- $$;
