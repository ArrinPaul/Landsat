-- Backing table for the async metrics-computation job queue
-- (src/ai/flows/compute-metrics.ts: startMetricsComputation / getMetricsResult).
--
-- This table never existed in the old database either, so every write to it
-- was silently failing and falling back to an in-memory Map on `globalThis`
-- (see the memoryJobs fallback in that file) - which loses all job state on
-- restart and isn't shared across serverless instances. Creating this table
-- makes that fallback path stop being the default path.
--
-- id is `text`, not `uuid`: it's generated client-side as
-- `job-${Date.now()}-${random}`.

create table if not exists analysis_jobs (
  id text primary key,
  status text not null check (status in ('pending', 'completed', 'error')),
  input jsonb not null,
  data jsonb,
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  failed_at timestamptz
);

create index if not exists analysis_jobs_status_idx on analysis_jobs(status, created_at desc);

alter table analysis_jobs enable row level security;
