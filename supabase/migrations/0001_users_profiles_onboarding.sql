-- Users, profiles, and onboarding data model.
-- Apply this in the Supabase SQL editor (or `supabase db push` if you wire up the CLI).
-- `users` already exists in this project (created ad hoc); this migration is written
-- defensively with IF NOT EXISTS / ADD COLUMN IF NOT EXISTS so it is safe to re-run.

create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password_hash text not null,
  role text not null default 'viewer' check (role in ('viewer', 'analyst', 'admin')),
  onboarding_completed boolean not null default false,
  onboarding_step int not null default 0,
  disabled boolean not null default false,
  last_login_at timestamptz,
  created_at timestamptz not null default now()
);

alter table users add column if not exists onboarding_completed boolean not null default false;
alter table users add column if not exists onboarding_step int not null default 0;
alter table users add column if not exists disabled boolean not null default false;
alter table users add column if not exists last_login_at timestamptz;

-- One-to-one profile/onboarding data, kept separate from auth credentials.
create table if not exists profiles (
  user_id uuid primary key references users(id) on delete cascade,
  phone text,
  location_state text,
  location_district text,
  farm_size_acres numeric,
  primary_crops text[] not null default '{}',
  farming_experience_years int,
  preferred_language text not null default 'en',
  irrigation_type text,
  goals text[] not null default '{}',
  notification_preferences jsonb not null default '{}'::jsonb,
  avatar_url text,
  updated_at timestamptz not null default now()
);

create index if not exists profiles_location_state_idx on profiles(location_state);

-- Append-only trail of important account/admin events, shown on the admin user detail page.
create table if not exists account_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists account_events_user_id_idx on account_events(user_id, created_at desc);

-- All server-side access uses the service-role key, which bypasses RLS by design.
-- RLS is enabled anyway as defense-in-depth in case the anon/public key is ever used directly.
alter table users enable row level security;
alter table profiles enable row level security;
alter table account_events enable row level security;
