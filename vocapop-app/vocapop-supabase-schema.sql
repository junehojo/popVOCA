-- ============================================================
-- VocaPoP — run ONCE in the shared (floe / mindflow) Supabase project.
-- Dashboard → SQL Editor → New query → paste this → Run.
--
-- One row per user holding the whole app-state blob (jsonb).
-- Prefixed `vocapop_` so it never collides with floe / notesync tables.
-- RLS: each user only sees / edits their own row.
-- ============================================================

create table if not exists public.vocapop_state (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.vocapop_state enable row level security;

drop policy if exists "vocapop own state" on public.vocapop_state;
create policy "vocapop own state" on public.vocapop_state
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
