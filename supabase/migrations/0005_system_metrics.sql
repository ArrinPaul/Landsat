create table if not exists system_metrics (
  id uuid primary key default gen_random_uuid(),
  metric_type text not null, -- 'ai_generation', 'api_call'
  provider text, -- 'groq', 'huggingface', 'open-meteo', 'soil-api'
  tokens_used integer default 0,
  is_success boolean default true,
  error_message text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- Index for querying analytics efficiently by date
create index if not exists system_metrics_created_at_idx on system_metrics(created_at desc);
create index if not exists system_metrics_type_idx on system_metrics(metric_type, created_at desc);

-- Enable RLS (allow authenticated users to insert, admin to read)
alter table system_metrics enable row level security;
