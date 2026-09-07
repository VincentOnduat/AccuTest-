-- The trigger half of removing the human from the accumulation loop.
-- pg_net lets Postgres itself make the outbound HTTP call — no separate
-- external cron service needed, and the actual "run a package" work still
-- happens on the app's own Node server (api/internal/scheduled-runs),
-- since Postgres can't spawn a real Playwright/Chromium process itself.
--
-- The shared secret is stored in Supabase Vault rather than inlined in
-- this file, so it isn't sitting in plaintext in a migration that lives in
-- git history — cron.schedule references it by name at call time via the
-- vault.decrypted_secrets view. The same value is also set as CRON_SECRET
-- in the app's own deployment environment; whoever holds both is trusted
-- to call the internal endpoint, nothing else gates it.
--
-- This schedule alone does nothing dangerous by itself: the endpoint it
-- calls 503s harmlessly until CRON_SECRET and SUPABASE_SERVICE_ROLE_KEY are
-- both set in the app's deployment (see README's Scheduled Execution
-- section) — applying this migration does not, by itself, start running
-- anyone's tests.

CREATE EXTENSION IF NOT EXISTS pg_net;

-- Run this one statement by hand (via the SQL editor, not as a committed value)
-- with a real generated secret before applying the rest of this file — never
-- commit the actual secret to a migration that lives in git history:
--
--   SELECT vault.create_secret(
--     '<a real random value — the same one you set as CRON_SECRET on the app deployment>',
--     'cron_secret',
--     'Shared secret for api/internal/scheduled-runs.'
--   );

-- Checked hourly rather than exactly at midnight for two reasons: it
-- naturally staggers execution across accounts instead of every opted-in
-- package trying to run at once, and it keeps working correctly no matter
-- what timezone "nightly" means to a given account, since each package's
-- own next_scheduled_run_at is what actually decides whether it runs.
SELECT cron.schedule(
  'trigger-scheduled-package-runs',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://accutest.tech/api/internal/scheduled-runs',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
