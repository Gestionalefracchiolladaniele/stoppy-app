-- ═══════════════════════════════════════════════════════════════
-- FASE 4 — Stoppy rebrand (Noit → Stoppy, NoFap)
--   • sessions.food → sessions.trigger
--   • users.last_relapse_date (clean-streak hero, post-migration feature)
-- Run this in Supabase SQL Editor (after schema.sql + fase3).
-- All statements idempotent. RENAME runs BEFORE any index that
-- references the new column (lesson from the Poof playbook).
-- ═══════════════════════════════════════════════════════════════

-- ─── SESSIONS: rename food → trigger ────────────────────────────
-- Guarded so it's a no-op on a DB that already has `trigger`.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'sessions' and column_name = 'food'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'sessions' and column_name = 'trigger'
  ) then
    alter table public.sessions rename column food to "trigger";
  end if;

  -- Fresh DB (no food, no trigger): add the column.
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'sessions' and column_name = 'trigger'
  ) then
    alter table public.sessions add column "trigger" text;
  end if;
end $$;

-- ─── USERS: clean-streak anchor ─────────────────────────────────
alter table public.users
  add column if not exists last_relapse_date date;

-- ─── INDEXES (AFTER the rename above) ───────────────────────────
-- trigger filter for analytics (top triggers, mood-by-trigger).
create index if not exists sessions_user_trigger_created
  on public.sessions(user_id, "trigger", created_at desc);
