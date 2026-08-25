-- Lets a single test package target its own remote website, overriding the
-- account-wide "Target Application URL" in Settings (profiles.target_url).
-- This is what makes "test a given remote website" a per-test choice instead
-- of one global setting — see src/lib/server/targetUrl.ts for the SSRF-safe
-- validation applied before this value is ever used as a Playwright baseURL.
ALTER TABLE IF EXISTS test_packages
  ADD COLUMN IF NOT EXISTS target_url text;
