-- Shared cache for slow-changing external lookups (30-year rainfall normal,
-- soil texture). Replaces per-process in-memory caches for these values.
create table if not exists data_cache (
  key text primary key,
  value jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists data_cache_expires_at_idx on data_cache(expires_at);

-- Service role only: RLS on with no policies denies all other roles.
alter table data_cache enable row level security;
