-- Adds the "Target Application URL" a user configures in Settings so real
-- test execution (see src/lib/server/testRunner.ts) has a baseURL to resolve
-- relative page.goto()/request.get() calls in AI-generated Playwright tests.
ALTER TABLE IF EXISTS profiles
  ADD COLUMN IF NOT EXISTS target_url text;
