-- User preferences and dashboard/chat history, used by src/lib/user-store.ts.
-- These tables predate the auth/onboarding work in 0001 but were never captured
-- as a migration (they were created ad hoc in the old Supabase project). Adding
-- them here so a fresh database has the complete schema this app expects.
--
-- IDs are `text`, not `uuid`, and there is deliberately no foreign key to
-- `users`: getAuthContext() falls back to the literal userId 'anonymous' for
-- unauthenticated visitors (see src/lib/auth.ts), and both tables accept that
-- value today. user_history.id is also not a UUID - it's generated client-side
-- as `${Date.now()}-${random}` (see appendUserHistoryAction in src/lib/actions.ts).

create table if not exists user_preferences (
  id text primary key,
  preferences jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists user_history (
  id text primary key,
  user_id text not null,
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('dashboard', 'chat')),
  payload jsonb not null default '{}'::jsonb
);

create index if not exists user_history_user_id_idx on user_history(user_id, created_at desc);

alter table user_preferences enable row level security;
alter table user_history enable row level security;
