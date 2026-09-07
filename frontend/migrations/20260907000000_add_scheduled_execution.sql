-- Removes the human from the accumulation loop: both prior assessments (and
-- the QA pass) flagged that flaky detection and selector memory only learn
-- anything when a person remembers to click Run — capping how fast the
-- product's actual substance (accumulated execution history) can grow at
-- the pace of manual habit, not usage. This adds an opt-in per-package
-- "run automatically" schedule; the actual trigger and its required secrets
-- are set up separately (see the app-side scheduledRuns module and the
-- follow-up migration once the production URL + a cron secret exist).
--
-- Deliberately per-package opt-in, not account-wide and not on by default:
-- a package a user hasn't finished reviewing (see requiresReview /
-- unresolvedFields on test_packages.test_cases) shouldn't silently start
-- running against a real target URL on a schedule nobody asked for.

ALTER TABLE public.test_packages
  ADD COLUMN IF NOT EXISTS auto_rerun_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS next_scheduled_run_at timestamptz;

-- Lets the scheduler's "find due packages" query use an index instead of a
-- full scan once there are enough packages for that to matter — cheap to
-- add now, per the RLS-performance lesson from the last QA pass.
CREATE INDEX IF NOT EXISTS idx_test_packages_due_for_run
  ON public.test_packages (next_scheduled_run_at)
  WHERE auto_rerun_enabled = true;
