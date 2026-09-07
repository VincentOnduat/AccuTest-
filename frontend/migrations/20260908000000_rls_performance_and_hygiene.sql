-- Batches three findings from this QA pass into one safe, non-behavioral
-- migration — no policy's actual access decision changes, only how cheaply
-- Postgres evaluates it. This is exactly the "worth fixing in one pass
-- before any table grows large" item flagged twice now in prior QA passes;
-- this pass actually does the pass instead of flagging it a third time.
--
-- 1) 50 RLS policies called auth.uid() directly, which re-evaluates it once
--    per row scanned. Wrapping it as (select auth.uid()) lets Postgres
--    evaluate it once per query and cache the result — same access
--    decision, cheaper at scale. See:
--    https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
--
-- 2) sessions had five overlapping permissive policies (four specific ones
--    plus a redundant "manage own sessions" ALL policy covering the same
--    ground) — Postgres evaluates every permissive policy on every query,
--    so the redundant one was pure waste, not defense in depth (a
--    permissive OR only relaxes access, it never further restricts it).
--    Dropped rather than rewritten.
--
-- A fourth finding from this pass — pg_net installed in the public schema —
-- is NOT addressed here or anywhere: `ALTER EXTENSION pg_net SET SCHEMA`
-- was tried in isolation first (its own transaction, so a failure couldn't
-- touch the fixes below) and Postgres rejected it outright — pg_net's
-- control file declares it non-relocatable. The only real fix would be
-- dropping and recreating the extension, which would break the net.http_post
-- call the already-armed hourly production cron job depends on and require
-- re-registering that job. Not worth that risk for a WARN-level cosmetic
-- finding; left as a known, accepted, not-safely-fixable item.

-- --- 1. Rewrite every RLS policy that calls auth.uid() directly ---

ALTER POLICY "Users can insert own generation usage" ON public.ai_generation_usage WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "Users can view own generation usage" ON public.ai_generation_usage USING ((select auth.uid()) = user_id);

ALTER POLICY "Users can delete own atrd_results" ON public.atrd_results USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can insert own atrd_results" ON public.atrd_results WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "Users can update own atrd_results" ON public.atrd_results USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "Users can view own atrd_results" ON public.atrd_results USING ((select auth.uid()) = user_id);

ALTER POLICY "Users can insert their own business reports" ON public.business_reports WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "Users can view their own business reports" ON public.business_reports USING ((select auth.uid()) = user_id);

ALTER POLICY "Users can delete own notifications" ON public.notifications USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can insert own notifications" ON public.notifications WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "Users can update own notifications" ON public.notifications USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can view own notifications" ON public.notifications USING ((select auth.uid()) = user_id);

ALTER POLICY "Users can insert own profile" ON public.profiles WITH CHECK ((select auth.uid()) = id);
ALTER POLICY "Users can update own profile" ON public.profiles USING ((select auth.uid()) = id);
ALTER POLICY "Users can view own profile" ON public.profiles USING ((select auth.uid()) = id);

ALTER POLICY "Users can insert own selector memory" ON public.selector_memory WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "Users can update own selector memory" ON public.selector_memory USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "Users can view own selector memory" ON public.selector_memory USING ((select auth.uid()) = user_id);

-- selector_memory_shared: the anonymity-floor + paired-opt-in policy from
-- "The Shared-Memory Design" — same access decision, auth.uid() just
-- evaluated once instead of per row.
ALTER POLICY "Read shared selector memory if opted in and anonymous enough" ON public.selector_memory_shared
  USING (
    contributor_count >= 3
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND share_selector_memory = true
    )
  );

ALTER POLICY "Users can delete their own sessions" ON public.sessions USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can insert their own sessions" ON public.sessions WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "Users can update their own sessions" ON public.sessions USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can view their own sessions" ON public.sessions USING ((select auth.uid()) = user_id);
-- See item 2 below — the redundant "manage own sessions" ALL policy is dropped, not rewritten.

ALTER POLICY "Users can delete their own tasks" ON public.tasks USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can insert their own tasks" ON public.tasks WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "Users can update their own tasks" ON public.tasks USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can view their own tasks" ON public.tasks USING ((select auth.uid()) = user_id);

ALTER POLICY "Users can view their own analytics" ON public.test_analytics USING ((select auth.uid()) = user_id);

ALTER POLICY "Users can delete own test_executions" ON public.test_executions USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can insert own test_executions" ON public.test_executions WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "Users can update own test_executions" ON public.test_executions USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can view own test_executions" ON public.test_executions USING ((select auth.uid()) = user_id);

ALTER POLICY "Users can delete own test_packages" ON public.test_packages USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can insert own test_packages" ON public.test_packages WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "Users can update own test_packages" ON public.test_packages USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can view own test_packages" ON public.test_packages USING ((select auth.uid()) = user_id);

ALTER POLICY "Users can insert their own test reports" ON public.test_reports WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "Users can view their own test reports" ON public.test_reports USING ((select auth.uid()) = user_id);

ALTER POLICY "Users can insert their own test results" ON public.test_results WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "Users can view their own test results" ON public.test_results USING ((select auth.uid()) = user_id);

ALTER POLICY "Users can insert their own test sessions" ON public.test_sessions WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "Users can update their own test sessions" ON public.test_sessions USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can view their own test sessions" ON public.test_sessions USING ((select auth.uid()) = user_id);

ALTER POLICY "Users can insert their own templates" ON public.test_templates WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "Users can view their own templates" ON public.test_templates USING (((select auth.uid()) = user_id) OR (is_public = true));

ALTER POLICY "Users can delete their own tests" ON public.tests USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can insert their own tests" ON public.tests WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "Users can update their own tests" ON public.tests USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can view their own tests" ON public.tests USING ((select auth.uid()) = user_id);

-- --- 2. Drop the redundant sessions policy ---
-- The four specific policies above already cover every command a permissive
-- ALL policy would; a permissive policy can only ever widen access via OR,
-- so this one was pure duplicate evaluation cost, not additional safety.
DROP POLICY IF EXISTS "Users can manage their own sessions" ON public.sessions;
