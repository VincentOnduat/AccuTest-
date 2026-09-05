-- Tracks each successful AI test-package generation, so the app can enforce
-- a free-tier monthly cap (see lib/server/generationUsage.ts). Deliberately
-- a separate event-log table rather than deriving the count from
-- test_packages: test_packages rows can be deleted by the user, which would
-- silently let a deleted-then-regenerated package bypass the cap. This log
-- is immutable — no UPDATE/DELETE policy — by design.
CREATE TABLE IF NOT EXISTS public.ai_generation_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_generation_usage_user_month
  ON public.ai_generation_usage (user_id, created_at);

ALTER TABLE public.ai_generation_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own generation usage"
  ON public.ai_generation_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own generation usage"
  ON public.ai_generation_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);
