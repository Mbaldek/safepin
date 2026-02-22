-- KOVA — Weekly digest cron job
-- Requires pg_cron and pg_net extensions to be enabled in Supabase dashboard.
-- Triggers the weekly-digest Edge Function every Monday at 9:00 AM UTC.

-- Enable extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the weekly digest
SELECT cron.schedule(
  'weekly-digest',
  '0 9 * * 1',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'edge_function_url') || '/weekly-digest',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
