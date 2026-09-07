-- Cross-account selector memory: the network-effect extension to
-- selector_memory (20260906000001). See the design doc this implements
-- ("The Shared-Memory Design") for the full reasoning — this migration is
-- the technical half of that design, built as specified:
--
--   - Paired opt-in (profiles.share_selector_memory): an account only ever
--     sees community data if it also contributes its own. Off by default.
--   - A k-anonymity floor: an aggregate for a given (host, selector) is
--     never readable by anyone until at least 3 distinct opted-in accounts
--     have contributed to it. Enforced in the RLS policy itself, not just
--     application code, so it holds even if a caller queries the table
--     directly.
--   - A separate, append-only aggregate table populated by a periodic
--     SECURITY DEFINER rollup (via pg_cron) — never a live client write,
--     and never a live cross-account join. No ordinary client (anon or
--     authenticated) can INSERT/UPDATE/DELETE this table at all; the only
--     write path is the rollup function itself.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS share_selector_memory boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.selector_memory_shared (
  target_host text NOT NULL,
  selector text NOT NULL,
  contributor_count integer NOT NULL DEFAULT 0,
  success_count integer NOT NULL DEFAULT 0,
  failure_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (target_host, selector)
);

ALTER TABLE public.selector_memory_shared ENABLE ROW LEVEL SECURITY;

-- No INSERT/UPDATE/DELETE policy for anon/authenticated anywhere in this
-- migration — that's deliberate, not an oversight. The only way a row in
-- this table is ever written is refresh_selector_memory_shared() below,
-- which runs as its definer (not through PostgREST's anon/authenticated
-- roles), so there is no policy that would need to grant client write access.

-- The anonymity floor AND the paired-opt-in requirement, both enforced here
-- at the database level rather than only in application code: a caller can
-- only ever see an aggregate that (a) has enough independent contributors
-- to be genuinely anonymous, and (b) belongs to an account that has itself
-- opted in to sharing.
CREATE POLICY "Read shared selector memory if opted in and anonymous enough"
  ON public.selector_memory_shared FOR SELECT
  TO authenticated
  USING (
    contributor_count >= 3
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND share_selector_memory = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_selector_memory_shared_host
  ON public.selector_memory_shared (target_host);

-- Recomputes the full aggregate from scratch every run (rather than an
-- incremental upsert) so an account that opts out, or whose own history
-- changes, is correctly reflected on the next run instead of leaving stale
-- contributions behind indefinitely.
CREATE OR REPLACE FUNCTION public.refresh_selector_memory_shared()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  TRUNCATE public.selector_memory_shared;

  INSERT INTO public.selector_memory_shared (target_host, selector, contributor_count, success_count, failure_count, updated_at)
  SELECT
    sm.target_host,
    sm.selector,
    COUNT(DISTINCT sm.user_id) AS contributor_count,
    SUM(sm.success_count) AS success_count,
    SUM(sm.failure_count) AS failure_count,
    now()
  FROM public.selector_memory sm
  JOIN public.profiles p ON p.id = sm.user_id
  WHERE p.share_selector_memory = true
  GROUP BY sm.target_host, sm.selector;
END;
$$;

-- Not exposed to PostgREST at all — no anon/authenticated/public execute
-- grant. The only caller is pg_cron below, which runs in the database
-- itself, not through the API.
REVOKE ALL ON FUNCTION public.refresh_selector_memory_shared() FROM PUBLIC, anon, authenticated;

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'refresh-selector-memory-shared',
  '*/15 * * * *',
  $$SELECT public.refresh_selector_memory_shared();$$
);
