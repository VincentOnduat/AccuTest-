-- api/notifications/+server.ts inserts into this table after a test
-- execution completes, but the table never existed — every call to that
-- endpoint failed with "relation \"notifications\" does not exist". Create
-- it so the route stops erroring. The email/webhook "sending" in that route
-- is still simulated (no real provider wired up), matching the honesty
-- pattern already used elsewhere in this app (e.g. Cypress/Jest execution
-- reporting "not yet supported" rather than fabricating results) — this
-- migration only fixes the crash, not the simulation.
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  execution_id uuid REFERENCES public.test_executions(id) ON DELETE SET NULL,
  channels text[] NOT NULL DEFAULT '{}',
  status text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);
