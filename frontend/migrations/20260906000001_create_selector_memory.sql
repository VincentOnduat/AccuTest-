-- Selector memory: the feedback loop from real test execution back into AI
-- generation. Every time a package runs (see api/test-runner), the locators
-- its generated code actually used are extracted from the source and scored
-- against that run's real pass/fail outcome, keyed by the *site* (hostname)
-- rather than the individual package — a selector for a login button is
-- often reused across many pages and many generated packages for the same
-- site, and the whole point is to let that experience compound instead of
-- resetting on every new package.
--
-- The other side of the loop lives in api/ai/generate-test-package: before
-- generating new code for a target URL, the AI prompt is given this site's
-- known-reliable selectors (to prefer, when they fit) and known-flaky ones
-- (to avoid or double-check) — the one piece of this app's behavior that a
-- stateless LLM chat session cannot replicate, since it depends on
-- accumulated history a fresh prompt never has.
CREATE TABLE IF NOT EXISTS public.selector_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_host text NOT NULL,
  selector text NOT NULL,
  selector_kind text,
  success_count integer NOT NULL DEFAULT 0,
  failure_count integer NOT NULL DEFAULT 0,
  last_status text CHECK (last_status = ANY (ARRAY['passed'::text, 'failed'::text])),
  last_error text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, target_host, selector)
);

CREATE INDEX IF NOT EXISTS idx_selector_memory_user_host
  ON public.selector_memory (user_id, target_host);

ALTER TABLE public.selector_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own selector memory"
  ON public.selector_memory FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own selector memory"
  ON public.selector_memory FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own selector memory"
  ON public.selector_memory FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
