-- The metadata column defined in 0005_system_metrics.sql was never applied to
-- the live database, causing every system_metrics insert to fail silently
-- (PostgREST rejects unknown columns), which left /admin/analytics stuck at 0.
alter table system_metrics add column if not exists metadata jsonb;
